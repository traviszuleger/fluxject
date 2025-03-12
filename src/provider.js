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
    /** @type {TRegistrations} */
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
     * @returns {keyof {[K in keyof Types.InferInstanceTypes<TRegistrations, "singleton"|"transient"|"scoped"> as Types.InferInstanceTypes<TRegistrations, "singleton"|"transient"|"scoped">[K] extends { [Symbol.asyncDispose]: () => Promise<void> } ? K : never]: undefined} extends never ? void : Promise<void>}
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

        const errors = [];

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
            //@ts-expect-error - Registrations needs to be wiped here, as the provider will be out of commission.
            this.#registrations = {};
            this.#references = {};

            if(errors.length > 0) {
                throw new AggregateError(errors, "One or more services failed to dispose.");
            }
        }

        // Dispose of all scoped service providers that were derived from this provider.

        const disposeScopes = () => {
            const promises = [];
            for(const scopedService of this.#scopedServices) {
                try {
                    const maybePromise = scopedService.dispose();
                    if(isPromise(maybePromise)) {
                        const disposalPromise = maybePromise
                            .catch(err => {
                                if(err instanceof AggregateError) {
                                    errors.push(...err.errors);
                                }
                                else {
                                    errors.push(err);
                                }
                            });
                        promises.push(disposalPromise);
                    }
                }
                catch(err) {
                    if(err instanceof AggregateError) {
                        errors.push(...err.errors);
                    }
                    else {
                        errors.push(err);
                    }
                }
            }
            if(promises.length > 0) {
                return Promise.all(promises);
            }
        };

        // Then dispose of all other services under this provider.

        const disposeSingletons = () => {
            /** @type {Promise<unknown>|undefined} */
            let promise = undefined;
            const registrationEntries = Object.entries(this.#registrations)
                .sort(([key1, val1], [key2, val2]) => {
                    return val2.priority - val1.priority;
                });
    
            for(const [name, registration] of registrationEntries) {
                if(registration.lifetime === "scoped") {
                    continue;
                }
                const service = this.#references[name];
                if(!service) {
                    continue;
                }

                // Synchronous disposal first.
                try {
                    if(service[Symbol.dispose] !== undefined) {
                        service[Symbol.dispose]();
                    }
                }
                catch(err) {
                    errors.push(err);
                }

                // Asynchronous disposal second.
                if(service[Symbol.asyncDispose] !== undefined) {
                    if(promise === undefined) {
                        const maybePromise = service[Symbol.asyncDispose]();
                        if(isPromise(maybePromise)) {
                            promise = maybePromise
                                .catch(err => errors.push(err));
                        }
                    }
                    else {
                        promise = promise
                            .then(service[Symbol.asyncDispose])
                            .catch(err => errors.push(err));
                    }
                }
            }
            return promise;
        }

        const scopeDisposal = disposeScopes();

        if(isPromise(scopeDisposal)) {
            //@ts-expect-error This is a valid return type, despite TypeScript flagging it as not being one.
            return scopeDisposal
                .then(disposeSingletons)
                .finally(finishDisposal);
        }

        const singletonDisposal = disposeSingletons();

        if(isPromise(singletonDisposal)) {
            //@ts-expect-error This is a valid return type, despite TypeScript flagging it as not being one.
            return singletonDisposal
                .finally(finishDisposal);
        }

        finishDisposal();
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
                        throw new FluxjectError(`Cannot set a non-scoped service: ${registrationName}`);
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

        /** @type {Promise<unknown>|undefined} */
        let promise = undefined;
        const errors = [];

        const registrationEntries = Object.entries(this.#registrations).sort(([key1, val1], [key2, val2]) => {
            return val2.priority - val1.priority;
        });

        for(const [name, registration] of registrationEntries) {
            if(registration.lifetime !== "scoped") {
                continue;
            }

            const service = this.#references[name];
            if(!service) {
                continue;
            }

            // Synchronous disposal first.
            try {
                if(service[Symbol.dispose] !== undefined) {
                    service[Symbol.dispose]();
                }
            }
            catch(err) {
                errors.push(err);
            }

            // Asynchronous disposal second.
            if(service[Symbol.asyncDispose] !== undefined) {
                if(promise === undefined) {
                    const maybePromise = service[Symbol.asyncDispose]();
                    if(isPromise(maybePromise)) {
                        promise = maybePromise
                            .catch(err => errors.push(err));
                    }
                }
                else {
                    promise = promise
                        .then(service[Symbol.asyncDispose])
                        .catch(err => errors.push(err));
                }
            }
        }
        
        /**
         * Sets the [DISPOSED] symbol on all services to true and clears the references.
         */
        const finishCleanup = () => {
            for(const key in this.#registrations) {
                if(this.#registrations[key].lifetime !== "scoped") {   
                    continue;
                }
                if(!this.#references[key]) {
                    continue;
                }
                this.#references[key][DISPOSED] = true;
            }
            this.#references = {};
            if(errors.length > 0) {
                throw new AggregateError(errors, "One or more scoped services failed to dispose.");
            }
        }

        if(promise !== undefined) {
            //@ts-expect-error This is a valid return type, despite TypeScript flagging it as not being one.
            return promise
                .finally(finishCleanup);
        }        

        finishCleanup();
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