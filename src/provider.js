//@ts-check
/** @import * as Types from "./types.js" */
import { isPromise } from "util/types";
import { DISPOSED, INSTANCE, LazyReference } from "./lazy-reference.js";
import { isConstructor } from "./util.js";
import { FluxjectError } from "./errors.js";

/**
 * Internal object used for the Host Service Provider
 * @template {Record<string, Types.Registration<any, any>>} TRegistrations
 * Registrations configured on the container.
 */
export class FluxjectHostServiceProvider {
    #registrations;
    /** @type {Record<string, LazyReference<any>|undefined>} */
    #references;
    /** @type {FluxjectScopedServiceProvider[]} */
    #scopedServices;

    
    get numScopes() {
        return this.#scopedServices.length;
    }

    /**
     * Construct a new `FluxjectHostServiceProvider` instance.
     * @param {TRegistrations} registrations
     * Registrations configured on the container.
     */
    constructor(registrations) {
        this.#scopedServices = [];

        // Initialize all lazy references from the registrations.
        const registrationEntries = Object.entries(registrations);
        const referenceEntries = registrationEntries
            // Filter out all scoped lifetime registrations
            .filter(([name,registration]) => registration.lifetime !== "scoped")
            // Create a new reference for each registration
            .map(([name,registration]) => {
                if(registration.lifetime === "transient") {
                    return [name, reference(name, registration, injectable(this, name), true)];
                }
                if(registration.lifetime === "singleton") {
                    return [name, reference(name, registration, injectable(this, name), false)];
                }
                throw new Error(`Unknown lifetime ${registration.lifetime}`);
            });
        
        // Convert the entries back into objects
        /** @type {Record<string, LazyReference<any>|undefined>} */
        const newReferences = Object.fromEntries(referenceEntries);

        this.#registrations = {
            ...this.#registrations,
            ...registrations
        };
        this.#references = { 
            ...this.#references,
            ...newReferences
        };

        // For every reference, create a getter for the service on this object.
        for(const serviceName in this.#references) {
            Object.defineProperty(this, serviceName, {
                get: () => {
                    return this.#references[serviceName];
                }
            });
        }
    }

    /**
     * Create a new scoped service provider. All Scoped Services will 
     * @returns {Types.Widen<FluxjectScopedServiceProvider<TRegistrations> & Types.InferInstanceTypes<TRegistrations>>}
     * A new Scoped Service Provider.
     */
    createScope() {
        const scopedService = new FluxjectScopedServiceProvider(this.#references, this.#registrations);
        this.#scopedServices.push(scopedService);

        // Intercept the dispose function of the scoped service,
        // so we can remove it from the list of scoped services.
        // This is to prevent memory leaks.
        const originalDispose = scopedService.dispose;
        scopedService.dispose = () => {
            const index = this.#scopedServices.indexOf(scopedService);
            if(index === -1) {
                return;
            }
            this.#scopedServices.splice(index, 1);
            return originalDispose.bind(scopedService)();
        }
        return /** @type {any} */ (scopedService);
    }

    /**
     * Dispose of all services under this provider.  
     * 
     * This will also dispose of all scoped services that have been created by this provider.
     * 
     * @returns {keyof {[K in keyof Types.InferInstanceTypes<TRegistrations, "singleton"|"transient"> as Types.InferInstanceTypes<TRegistrations, "singleton"|"transient">[K] extends { [Symbol.asyncDispose]: () => Promise<void> } ? K : never]: undefined} extends never ? void : Promise<void>}
     * Returns a Promise if any of the services have the `Symbol.asyncDispose` method defined.
     */
    dispose() {
        // This bug occurs when someone tries to call `dispose` from a receiver other than the original provider.
        // An example of this would be like: `return provider.dispose` instead of `return () => provider.dispose()`.
        try {
            this.#registrations;
        }
        catch(err) {
            if(err instanceof TypeError 
                && err.message.startsWith("Cannot read properties of undefined")
            ) {
                throw new Error("Cannot call dispose from receiver other than the original provider. (If you are passing [{provider}.dispose] around, then try using [() => {provider}.dispose()] instead)");
            }
            throw err;
        }

        /**
         * Sets the [DISPOSED] symbol on all services to true and clears the references.
         */
        const finishDisposal = () => {
            for(const key in this.#references) {
                if(!this.#references[key]) {
                    continue;
                }
                this.#references[key][DISPOSED] = true;
            }
            this.#references = {};
            this.#scopedServices = [];
        }

        /**
         * Disposes of all Scoped services.
         */
        const disposeScopes = () => {
            const errors = [];
            const promises = [];
            for(const scopedService of this.#scopedServices) {
                try {
                    const maybePromise = scopedService.dispose();
                    // If it's a promise, then we need to add it to the promises array.
                    if(isPromise(maybePromise)) {
                        const disposalPromise = maybePromise
                            // Catch any errors and push it into our errors array.
                            .catch(err => errors.push(err));
                        promises.push(disposalPromise);
                    }
                }
                catch(err) {
                    // If an error occurs, then push it into our errors array.
                    errors.push(err);
                }
            }

            // If one or more services that were disposed synchronously failed, then we throw an error.
            if(errors.length > 0) {
                throw new FluxjectError(`Error disposing of one or more scoped services: ${errors.map(err => err.message).join(", ")}`);
            }

            // If there are any promises, then return a promise that resolves when all promises are resolved
            if(promises.length > 0) {
                return Promise.all(promises)
                    .then(() => {
                        // If one or more services that were disposed asynchronously failed, then we throw an error.
                        if(errors.length > 0) {
                            throw new FluxjectError(`Error disposing of one or more scoped services: ${errors.map(err => err.message).join(", ")}`);
                        }
                    })
                    // Finally, we will clear out scoped services reference.
                    .finally(() => {
                        this.#scopedServices = [];
                    });
            }

            // Finally (only if there were no asynchronous services) we will clear out scoped services reference.
            this.#scopedServices = [];
        };

        /**
         * Disposes of all Singleton services.
         */
        const disposeSingletons = () => {
            const failedServices = [];
            const promises = [];
            for(const key in this.#references) {
                const service = this.#references[key];
                if(!service) {
                    continue;
                }
                try {
                    /** @type {any} */ (service[Symbol.dispose])?.();
                    const maybePromise = /** @type {any} */ (service[Symbol.asyncDispose])?.();
                    // If it's a promise, then we need to add it to the promises array.
                    if(isPromise(maybePromise)) {
                        const disposalPromise = maybePromise
                            // Catch any errors and push it into our errors array.
                            .catch(err => failedServices.push(key));
                        promises.push(disposalPromise);
                    }
                }
                catch(err) {
                    // If an error occurs, then push it into our errors array.
                    failedServices.push(err);
                }
            }

            // If one or more services that were disposed synchronously failed, then we throw an error.
            if(failedServices.length > 0) {
                throw new FluxjectError(`Error disposing of one or more singleton services: [${failedServices.join(", ")}]`);
            }

            // If there are any promises, then return a promise that resolves when all promises are resolved
            if(promises.length > 0) {
                return Promise.all(promises)
                    .then(() => {
                        // If one or more services that were disposed asynchronously failed, then we throw an error.
                        if(failedServices.length > 0) {
                            throw new FluxjectError(`Error disposing of one or more singleton services: [${failedServices.join(", ")}]`);
                        }
                    })
                    // Finally, we will clear call finishDisposal, which sets all services to disposed and clears our references.
                    .finally(finishDisposal);
            }

            // Finally (only if there were no asynchronous services) we will call finishDisposal, 
            // which sets all services to disposed and clears our references.
            finishDisposal();
        }

        // Dispose all Scoped services first.
        const disposeScopesResult = disposeScopes();

        // If there are any promises, then return a promise that resolves when all promises are resolved
        if(isPromise(disposeScopesResult)) {
            // After disposing of all scoped services, dispose of all singleton services (and return undefined)
            return /** @type {any} */ (
                disposeScopesResult.then(disposeSingletons)
            );
        }

        // Dispose of all singleton services.
        return /** @type {any} */ (disposeSingletons());

    }
}

/**
 * Internal object used for the Scoped Service Provider
 * @template {Record<string, Types.Registration<any, any>>} TRegistrations
 * Registrations configured on the container.
 */
export class FluxjectScopedServiceProvider {
    #registrations;
    /** @type {Record<string, LazyReference<any>|undefined>} */
    #references;

    /**
     * Construct a new `FluxjectScopedServiceProvider` instance.
     * @param {Record<string, LazyReference<any>|undefined>} references 
     * References to Singletons and Transients from the Host Service Provider.
     * @param {TRegistrations} registrations 
     * Registrations configured on the container.
     */
    constructor(references, registrations) {
        const registrationEntries = Object.entries(registrations);
        const referenceEntries = registrationEntries
            // Filter out all services not of lifetime "scoped"
            .filter(([name,registration]) => registration.lifetime === "scoped")
            // Create a new reference for each registration
            .map(([name,registration]) => {
                return [name, reference(name, registration, injectable(this, name), false)];
            });
        
        /** @type {Record<string, LazyReference<any>|undefined>} */
        const newReferences = Object.fromEntries(referenceEntries);
        this.#registrations = {
            ...registrations
        };
        this.#references = { 
            ...references,
            ...newReferences
        };

        // For every reference, create a getter for the service on this object.
        for(const registrationName in registrations) {
            Object.defineProperty(this, registrationName, {
                get: () => {
                    return this.#references[registrationName];
                },
                set: (value) => {
                    if(!this.#references[registrationName]) {
                        return;
                    }
                    if(registrations[registrationName].lifetime !== "scoped") {
                        return;
                    }
                    this.#references[registrationName][INSTANCE] = value;
                }
            })
        }
    }

    /**
     * Dispose of all Scoped services under this provider.  
     * 
     * This will also dispose of all scoped services that have been created by this provider.
     * 
     * @returns {keyof {[K in keyof Types.InferInstanceTypes<TRegistrations, "scoped"> as Types.InferInstanceTypes<TRegistrations, "scoped">[K] extends { [Symbol.asyncDispose]: () => Promise<void> } ? K : never]: undefined} extends never ? void : Promise<void>}
     * Returns a Promise if any of the services have the `Symbol.asyncDispose` method defined.
     */
    dispose() {
        // This bug occurs when someone tries to call `dispose` from a receiver other than the original provider.
        // An example of this would be like: `return provider.dispose` instead of `return () => provider.dispose()`.
        try {
            this.#registrations;
        }
        catch(err) {
            if(err instanceof TypeError 
                && err.message.startsWith("Cannot read properties of undefined")
            ) {
                throw new Error("Cannot call dispose from receiver other than the original provider. (If you are passing [{provider}.dispose] around, then try using [() => {provider}.dispose()] instead)");
            }
            throw err;
        }

        const failedServices = [];
        const promises = [];

        // Dispose of all scoped services
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];

            // Only dispose of scoped services
            if(registration.lifetime !== "scoped") {
                continue;
            }

            const service = this.#references[key];
            if(!service) {
                continue;
            }
            
            try {
                // Dispose of the service (always synchronous then asynchronous)
                /** @type {any} */ (service[Symbol.dispose])?.();
                const maybePromise = /** @type {any} */ (service[Symbol.asyncDispose])?.();

                // If the service has an async dispose, then add it to the promises array
                if(isPromise(maybePromise)) {
                    const disposalPromise = maybePromise
                        .catch(err => failedServices.push(key));
                    promises.push(disposalPromise);
                }
            }
            catch(err) {
                failedServices.push(key);
            }
        }

        /**
         * Sets the [DISPOSED] symbol on all services to true and clears the references.
         */
        const finishCleanup = () => {
            for(const key in this.#references) {
                if(!this.#references[key]) {
                    continue;
                }
                this.#references[key][DISPOSED] = true;
            }
            this.#references = {};
        }

        // If one or more services that were disposed synchronously failed, then we throw an error.
        if(failedServices.length > 0) {
            throw new FluxjectError(`Error disposing of one or more scoped services: ${failedServices.map(service => service).join(", ")}`);
        }

        // If there are any promises, then return a promise that resolves when all promises are resolved
        if(promises.length > 0) {
            //@ts-expect-error - This is a Promise<void> return intended to suppress the `return` error.
            return Promise.all(promises)
                .then(() => {
                    // If one or more services that were disposed asynchronously failed, then we throw an error.
                    if(failedServices.length > 0) {
                        throw new FluxjectError(`Error disposing of one or more scoped services: ${failedServices.map(service => service).join(", ")}`);
                    }
                })
                .finally(finishCleanup);
        }

        // Clear all references (This service provider will be out of order after this)
        finishCleanup();
        return /** @type {void} */ (undefined);
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
 * Name of the service/registration.
 * @param {Types.Registration<any,any>} registration 
 * The factory method to instantiate the service with.
 * @param {any} scope 
 * The scope to pass into the factory method
 * @param {boolean} isTransient
 * True if the service is transient, otherwise false.
 * @returns {any}
 * The instantiated service.
 */
function reference(name, registration, scope, isTransient) {
    const factory = registration.factory;
    const stackTrace = {};

    // Convert the instantiator into a factory method, so we don't have to check all 
    const instantiator = () => {
        try {
            if(isConstructor(factory)) {
                const instance = new factory(scope);
                return instance;
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
    // Capture the stack trace, so if any circular dependencies occur, we can use this stack trace
    // to better inform the user where the circular dependency might have originated.
    Error.captureStackTrace(stackTrace, instantiator);
    return new LazyReference(instantiator, isTransient);
}

/**
 * Returns a proxy for the given provider that will disallow access to the `createScope` and `dispose` methods.
 * @param {FluxjectHostServiceProvider|FluxjectScopedServiceProvider} provider
 * @param {string} registrationName
 * Registration name that called this function. This is to prevent injecting a service into its own constructor.
 */
function injectable(provider, registrationName) {
    return new Proxy(provider, {
        get: (t,p,r) => {
            if(p === registrationName || p === "createScope" || p === "dispose") {
                return undefined;
            }
            return provider[p];
        },
        has: (t,p) => {
            if(p === registrationName || p === "createScope" || p === "dispose") {
                return false;
            }
            return p in provider;
        }
    })
}