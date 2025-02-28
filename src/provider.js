//@ts-check
/** @import * as Types from "./types.js" */
import { LazyReference } from "./lazy-reference.js";

/**
 * Internal object used for the Host Service Provider
 * @template {Record<string, Types.Registration<any, any>>} TRegistrations
 */
export class FluxjectHostServiceProvider {
    #registrations;
    /** @type {Record<string, LazyReference<any>|undefined>} */
    #references;
    #scopedServices;

    /**
     * @param {TRegistrations} registrations
     */
    constructor(registrations) {
        this.#scopedServices = [];
        /** @type {Record<string, LazyReference<any>|undefined>} */
        const newReferences = Object.fromEntries(Object.entries(registrations)
            .filter(([name,registration]) => registration.lifetime !== "scoped")
            .map(([name,registration]) => {
            if(registration.lifetime === "transient") {
                return [name, undefined];
            }
            if(registration.lifetime === "singleton") {
                return [name, reference(name, registration, injectable(this))];
            }
            throw new Error(`Unknown lifetime ${registration.lifetime}`);
        }));
        this.#registrations = {
            ...this.#registrations,
            ...registrations
        };
        this.#references = { 
            ...this.#references,
            ...newReferences
        };
        for(const registrationName in registrations) {
            const registration = registrations[registrationName];
            Object.defineProperty(this, registrationName, {
                get: () => {
                    if(registration.lifetime === "transient") {
                        return reference(registrationName, registration, injectable(this));
                    }
                    return this.#references[registrationName];
                }
            })
        }
    }

    /**
     * Create a new scoped service provider. All Scoped Services will 
     * @returns {Types.Widen<FluxjectScopedServiceProvider & Types.InferInstanceTypes<TRegistrations>>}
     */
    createScope() {
        const scopedService = /** @type {any} */ (new FluxjectScopedServiceProvider(this, this.#references, this.#registrations));
        this.#scopedServices.push(scopedService);
        return scopedService;
    }

    /**
     * Dispose of all services under this provider.  
     * 
     * This will also dispose of all scoped services that have been created by this provider.
     */
    dispose() {
        for(const scopedService of this.#scopedServices) {
            scopedService.dispose();
        }
        for(const key in this.#references) {
            const service = this.#references[key];
            if(!service) {
                continue;
            }
            if(Symbol.dispose in service) {
                /** @type {any} */ (service[Symbol.dispose])();
            }
            delete this.#references[key];
        }
        this.#references = {};
        this.#registrations = {};
        this.#scopedServices = [];
    }
}

/**
 * Internal object used for the Scoped Service Provider
 */
export class FluxjectScopedServiceProvider {
    #registrations;
    /** @type {Record<string, LazyReference<any>|undefined>} */
    #references;

    /**
     * @param {FluxjectHostServiceProvider} hostProvider 
     * @param {Record<string, LazyReference<any>|undefined>} references 
     * @param {Record<string, Types.Registration<any,any>>} registrations 
     */
    constructor(hostProvider, references, registrations) {
        /** @type {Record<string, LazyReference<any>|undefined>} */
        const newReferences = Object.fromEntries(Object.entries(registrations).map(([name,registration]) => {
            if(registration.lifetime === "transient") {
                return [name, undefined];
            }
            if(registration.lifetime === "singleton") {
                return [name, reference(name, registration, injectable(hostProvider))];
            }
            if(registration.lifetime === "scoped") {
                return [name, reference(name, registration, injectable(this))];
            }
            throw new Error(`Unknown lifetime ${registration.lifetime}`);
        }));
        this.#registrations = registrations;
        this.#references = { 
            ...references,
            ...newReferences
        };
        for(const registrationName in registrations) {
            const registration = registrations[registrationName];
            Object.defineProperty(this, registrationName, {
                get: () => {
                    if(registration.lifetime === "transient") {
                        return reference(registrationName, registration, injectable(hostProvider));
                    }
                    return this.#references[registrationName];
                }
            })
        }
    }

    dispose() {
        for(const key in this.#registrations) {
            const service = this.#references[key];
            if(!service) {
                continue;
            }
            if(Symbol.dispose in service) {
                /** @type {any} */ (service[Symbol.dispose])();
            }
            delete this.#references[key];
        }
        this.#references = {};
        this.#registrations = {};
    }
}

/**
 * Thrown when a circular dependency is detected.  
 * 
 * This typically occurs when two services depend on each other inside their constructors.
 * 
 * You can resolve this by deferring any de-reference of your dependencies until after the constructor has completed.
 * 
 * @example
 * ```ts
 * // This would cause a circular dependency
 * class DependencyA {
 *   test = 1;
 *   constructor({ dependencyB }) {
 *     dependencyB.test;
 *   }
 * }
 * 
 * class DependencyB {
 *   test = 2;
 *   constructor({ dependencyA }) {
 *     dependencyA.test;
 *   }
 * }
 * 
 * // but this would be ok
 * class DependencyC {
 *   test = 1;
 *   #dependencyD;
 *   constructor({ dependencyD }) {
 *     this.#dependencyD = dependencyD;
 *   }
 * }
 * 
 * // You can still de-reference from one of the dependencies, though:
 * class DependencyD {
 *   test = 2;
 *   constructor({ dependencyC }) {
 *     dependencyC.test;
 *   }
 * }
 * ```
 */
export class CircularDependencyError extends RangeError {
    /**
     * @param {string} serviceName 
     * @param {any} stackTrace
     */
    constructor(serviceName, stackTrace) {
        super(`Cannot resolve circular dependency (Origin: ${serviceName})`);
        this.name = "CircularDependencyError";
        Error.prepareStackTrace?.(this, stackTrace);
    }
};

/**
 * Given the `factoryMethod` and `scope`, instantiate a new service.
 * 
 * This handles both class constructors and factory functions.
 * @param {string} name
 * @param {Types.Registration<any,any>} registration 
 * The factory method to instantiate the service with.
 * @param {any} scope 
 * The scope to pass into the factory method
 * @returns {any}
 * The instantiated service.
 */
function reference(name, registration, scope) {
    const factory = registration.factory;
    const stackTrace = {};
    const instantiator = () => {
        try {
            if(isConstructor(factory)) {
                return new factory(scope);
            }
            return factory(scope);
        }
        catch(err) {
            if(err instanceof RangeError) {
                throw new CircularDependencyError(name, stackTrace);
            }
            throw err;
        }
    }
    Error.captureStackTrace(stackTrace, instantiator);
    return new LazyReference(instantiator);
}

/**
 * Returns a proxy for the given provider that will disallow access to the `createScope` and `dispose` methods.
 * @param {FluxjectHostServiceProvider|FluxjectScopedServiceProvider} provider 
 */
function injectable(provider) {
    return new Proxy(provider, {
        get: (t,p,r) => {
            if(p === "createScope" || p === "dispose") {
                return undefined;
            }
            return provider[p];
        },
        has: (t,p) => {
            if(p === "createScope" || p === "dispose") {
                return false;
            }
            return p in provider;
        }
    })
}

/** @readonly */
const AsyncFunction = (async () => {}).constructor;

/**
 * Check if the given function, `fn`, is a constructor.
 * @param {Function} fn 
 * Function to check.
 * @returns {fn is (new (...args: any[]) => any)}
 * True if the function is a constructor, otherwise false.
 */
function isConstructor(fn) {
    if(typeof fn !== "function") {
        return false;
    }
    if(fn instanceof AsyncFunction) {
        return false;
    }
    const prototype = fn.prototype;
    return prototype && typeof prototype === 'object' && prototype.constructor === fn;
}