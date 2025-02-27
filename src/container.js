//@ts-check
/** @import { Registration } from "./registration.js" */
/** @import { AnyPromiseSingletons, HostServiceProvider, InferRegistrationsFromContainer, InferValueFromRegistration, Resolved, Widen } from "./types.js" */
import { randomUUID } from "crypto";
import { RegistrationProvider } from "./registration.js";
import { FluxjectSymbols, Lifetime } from "./types.js"
import { TimeSpan } from "unitspan";
import { isPromise } from "util/types";
import { addPolyfills, needsPolyfills } from "./polyfills.js";

if(needsPolyfills()) {
    addPolyfills();
}

export {
    FluxjectSymbols
};

/**
 * Create a new Fluxject container instance ready to register services with the provided configuration.
 * @param {Partial<ContainerConfig>} config - Configuration options for the container
 */
export function fluxject(config={}) {
    return Container.create(config);
}

/**
 * A dependency injection container that manages the registration, instantiation, lifetime, and injection of services.
 * 
 * The container supports three types of service lifetimes:
 * - Singleton: Created once and shared across all scopes
 * - Scoped: Created once per scope
 * - Transient: Created each time they are requested
 * 
 * @template {Record<string|symbol, Registration<any, string, Lifetime>>} [TRegistrationMap={}]
 * Type map of registered services where key is service name and value is Registration.  
 * __`TRegistrationMap` is inferred from the usage of the `[register()]` function.__
 * @example
 * ```ts
 * import type { InferServiceProvider } from "fluxject";
 * import { Container } from "fluxject";
 * 
 * class MyService1 {
 *   constructor({ service2 }: InferServiceProvider<typeof container, "service1">) {
 *     service2.doSomething();
 *   }
 * 
 *   doSomething() {
 *     return 'service1 says hello!';
 *   }
 * }
 * 
 * function createMyService2({ service1 }: InferServiceProvider<typeof container, "service2">) {
 *   return {
 *     doSomething: () => 'service2 says hello!';
 *   };
 * }
 * 
 * class MyService3 {
 *   constructor({ service1, service2 }: InferServiceProvider<typeof container, "service3">) {
 *     service1.doSomething();
 *     service2.doSomething();
 *   }
 * }
 * 
 * // Create a container and register your services
 * const container = Container.create()
 *   .register(m => m.singleton({
 *     service1: MyService1,
 *     service2: createMyService2
 *   }))
 *   .register(m => m.scoped({
 *     service3: MyService3
 *   }));
 * 
 * // Prepare the container and get the host service provider
 * const services = container.prepare();
 * 
 * // Access services directly from the host service provider.
 * services.service1.doSomething();
 * 
 * // Create a scope.
 * const scope = services.createScope();
 * 
 * // Access services from the scope.
 * scope.service3.doSomethingElse();
 * ```
 */
export class Container {
    #config;
    #registrations;

    /**
     * Creates a new Container instance with the provided configuration.
     * @param {Partial<ContainerConfig>} [config={}] - Configuration options for the container
     * @returns {Container<{}>} A new Container instance
     */
    static create(config={}) {
        const containerConfig = {
            strict: false,
            ...config
        };
        return new Container(containerConfig, {});
    }

    /**
     * @protected
     * @param {Partial<ContainerConfig>} config
     * @param {TRegistrationMap} registrations
     */
    constructor(config, registrations) {
        this.#config = {
            strict: false,
            ...config
        };
        this.#registrations = registrations;
    }

    /**
     * Register one or more services on this container.
     * 
     * @template {Record<string|symbol, Registration<any, string, Lifetime>>} TNewRegistrations
     * Type of the new registration(s) being added
     * @param {(registrationProvider: RegistrationProvider) => TNewRegistrations} callback
     * Callback function that is used to reflect and setup one or more new registrations.
     * @returns {Container<Widen<TRegistrationMap & TNewRegistrations>>}
     * A clone of this Container with the newly updated type reflected by the added Registration.
     * @example
     * import { Container } from "fluxject";
     * 
     * class MyService1 {
     *   x = 0;
     * }
     * 
     * class MyService2 {
     *   test() {
     *     console.log(this.services.service1);
     *   }
     * }
     * const container = Container.create()
     *   .register(m => m.singleton({ service1: MyService1, service2: MyService2 }));
     * 
     * const hostServiceProvider = container.prepare();
     * 
     * hostServiceProvider.service1
     */
    register(callback) {
        const registrations = callback(new RegistrationProvider());
        const container = /** @type {any} */ (new Container(this.#config, {
            ...this.#registrations,
            ...registrations
        }));
        return container;
    }
    
    /**
     * Prepares a new container instance with the given configuration and initializes singleton services.
     * 
     * @param {Partial<ContainerConfig>} [config={}] - Optional configuration to override the container's default configuration
     * @returns {AnyPromiseSingletons<TRegistrationMap> extends never
     *   ? HostServiceProvider<TRegistrationMap> 
     *   : Promise<HostServiceProvider<TRegistrationMap>>
     * } Returns either a Promise that resolves to a HostServiceProvider or a HostServiceProvider directly,
     * depending on whether any singleton services are asynchronously instantiated
     */
    prepare(config={}) {
        // clone the container, as we want to maintain the original container for any future preparations.
        const container = new Container({
            ...this.#config,
            ...config,
        }, this.#registrations);

        // create a unique id for the singletons store
        const rHostServicesFluxjectId = randomUUID();

        // create a unique id for the host service provider
        const hostServiceFluxjectId = randomUUID();

        // create a store for symbols
        const rSymbols = {
            [FluxjectSymbols.Disposed]: false,
            [FluxjectSymbols.Id]: hostServiceFluxjectId,
            [FluxjectSymbols.ServiceProvider]: "Host Service Provider",
            [FluxjectSymbols.SingletonsStoreId]: rHostServicesFluxjectId,
        };

        // create a store for singleton services
        const rSingletonServices = {
            [FluxjectSymbols.Id]: rHostServicesFluxjectId
        };

        // otherwise, if the requested service is a Singleton or Scoped lifetime service, set the new value.
        return container.#createHostServiceProvider(rSymbols, rSingletonServices);
    }

    /**
     * @param {*} rSymbols
     * @param {*} rSingletonServices 
     * @param {Promise<any>} [asyncInstantiationPromise=undefined]
     * @param {(string|symbol)[]} [instantiatedSingletonServices=[]]
     * @param {Registration<any, string, Lifetime>} [currentRegistration=undefined]
     * The registration for the service that was requested by the host service provider.  
     * If undefined, then this function is returning the actual host service provider.
     * @param {boolean} [includeProviderManagement=true]
     * Whether to include the provider management functions (`createScope`, `dispose`, etc.) in the host service provider.
     */
    #createHostServiceProvider(
        rSymbols, 
        rSingletonServices, 
        asyncInstantiationPromise=undefined,
        instantiatedSingletonServices=[], 
        currentRegistration=undefined,
        includeProviderManagement=true
    ) {
        // Initialize singleton services.
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];

            // If the registration is not of lifetime singleton, then skip it.
            if(registration.type !== Lifetime.Singleton) {
                continue;
            }

            // if the service has already been instantiated, then skip it.
            if(instantiatedSingletonServices.includes(registration.name)) {
                continue;
            }

            // Instantiate the service
            try {
                instantiatedSingletonServices.push(registration.name);
                const maybePromise = this.#createHostServiceProvider(
                    rSymbols,
                    rSingletonServices,
                    asyncInstantiationPromise,
                    instantiatedSingletonServices,
                    registration,
                    false
                );

                // If the returned type is not a Promise, then immediately define the service in `singletonServices` and continue to the next service.
                if(!isPromise(maybePromise)) {
                    const service = registration.instantiate(maybePromise);

                    // If the instantion of the service is sync, then define the service in `singletonServices` and continue to the next service.
                    if(!isPromise(service)) {
                        this.#defineFluxjectSymbolsOnService(service, registration);
                        rSingletonServices[registration.name] = service;
                        continue;                
                    }

                    // If the instantion of the service is async, then chain a promise that defines the service in `singletonServices`, and continue to the next service.
                    if(asyncInstantiationPromise) {
                        asyncInstantiationPromise = asyncInstantiationPromise
                            .then(() => service)
                            .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                            .then(service => {
                                rSingletonServices[registration.name] = service;
                            });
                        continue;
                    }
                    asyncInstantiationPromise = service;
                }

                // Otherwise, the service is async, so chain a promise that defines the service in `singletonServices`
                if(asyncInstantiationPromise) {
                    asyncInstantiationPromise = asyncInstantiationPromise
                        .then(() => maybePromise)
                        .then(hostServiceProvider => registration.instantiate(hostServiceProvider))
                        .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                        .then(service => {
                            rSingletonServices[registration.name] = service;
                        });
                    continue;
                }

                // Or create the promise, since a promise was never created.
                asyncInstantiationPromise = maybePromise
                    .then(hostServiceProvider => registration.instantiate(hostServiceProvider))
                    .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                    .then(service => {
                        rSingletonServices[registration.name] = service;
                    });
            }
            catch(err) {
                if(err instanceof RangeError) {
                    throw new RangeError(`Circular dependency in registration [${String(registration.name)}].`, { cause: err.cause });
                }
                throw err;
            }
        }

        // Create the hostServiceProvider Proxy object
        const hostServiceProvider = new Proxy(/** @type {any} */ ({
            createScope: () => {
                // create a unique id for the scoped services store
                const rScopedServicesFluxjectId = randomUUID();

                // create a unique id for the scoped service provider
                const scopedServiceFluxjectId = randomUUID();
                
                // create a store for symbols
                const rSymbols = {
                    [FluxjectSymbols.Disposed]: false,
                    [FluxjectSymbols.Id]: scopedServiceFluxjectId,
                    [FluxjectSymbols.ServiceProvider]: "Host Service Provider",
                    [FluxjectSymbols.SingletonsStoreId]: rSingletonServices[FluxjectSymbols.Id],
                    [FluxjectSymbols.ScopesStoreId]: rScopedServicesFluxjectId,
                };

                // create a store for scoped services
                const rScopedServices = {
                    [FluxjectSymbols.Id]: rScopedServicesFluxjectId,
                };

                // create an empty array for tracking what scoped services have been instantiated.
                const instantiatedScopedServices = [];
                
                return this.#createScopedServiceProvider(
                    rSymbols, 
                    rScopedServices, 
                    rSingletonServices, 
                    instantiatedScopedServices, 
                    instantiatedSingletonServices
                );
            },
            dispose() {
                this[FluxjectSymbols.Disposed] = true;

                /** @type {Promise<void>|undefined} */
                let promise = undefined;
                for(const serviceName in rSingletonServices) {
                    const service = rSingletonServices[serviceName];
                    
                    // if `Symbol.dispose` is defined, then call it.
                    if(service[Symbol.dispose]) {
                        service[Symbol.dispose]();
                        continue;
                    }

                    // if `Symbol.asyncDispose` is defined, then call it.
                    if(service[Symbol.asyncDispose]) {
                        if(promise) {
                            promise = promise.then(() => {
                                service[Symbol.asyncDispose]();
                            });
                            continue;
                        }
                        promise = service[Symbol.asyncDispose]();
                    }
                }

                // if the promise is defined, then return it
                if(promise) {
                    return promise;
                }
            }
        }), {
            get: (hostServiceProvider, requestedServiceName) => {
                // if the service has already been disposed, then throw an error.
                if(rSymbols[FluxjectSymbols.Disposed]) {
                    throw new Error(`Host Service Provider has been disposed.`);
                }

                // if the requested service is an omitted registration, then return undefined.
                if(requestedServiceName === currentRegistration?.name) {
                    if(this.#config.strict) {
                        throw new Error(`Cannot de-reference [${String(currentRegistration?.name)}] from Host Service Provider as this service would be referencing itself.`);
                    }
                    return undefined;
                }

                // if the requested service is a property of the target (e.g. `dispose`, `createScope`, etc.)
                if(requestedServiceName in hostServiceProvider) {
                    // if we are directed to exclude these functions, then return undefined.
                    if(!includeProviderManagement) {
                        // if 'strict' mode is enabled, then throw an error.
                        if(this.#config.strict) {
                            throw new Error(`Use of [${String(requestedServiceName)}] is not available during instantiation.`);
                        }
                        return undefined;
                    }
                    return hostServiceProvider[requestedServiceName];
                }

                // if the requested service is not registered, then return undefined.
                if(!(requestedServiceName in this.#registrations)) {
                    if(this.#config.strict) {
                        throw new Error(`Service [${String(requestedServiceName)}] is not registered.`);
                    }
                    return undefined;
                }
                
                // if the requested service is a singleton service, return it.
                if(requestedServiceName in rSingletonServices) {
                    return rSingletonServices[requestedServiceName];
                }

                // if the requested service is a scoped service, return undefined (or if strict mode is enabled, throw an error)
                if(this.#registrations[requestedServiceName].type === Lifetime.Scoped) {
                    if(this.#config.strict) {
                        throw new Error(`Scoped registrations cannot be accessed from the HostServiceProvider. (Use the ScopedServiceProvider returned from [createScope()] to access Scoped services.)`);
                    }
                    return undefined;
                }
                
                // Last case: service is transient, so instantiate and return the transient service.
                try {
                    const registration = this.#registrations[requestedServiceName];
                    const maybePromise = this.#createHostServiceProvider(
                        rSymbols,
                        rSingletonServices, 
                        asyncInstantiationPromise,
                        instantiatedSingletonServices,
                        registration,
                        false
                    );
                    if(!isPromise(maybePromise)) {
                        const service = this.#defineFluxjectSymbolsOnService(maybePromise, registration);
                        return registration.instantiate(service);
                    }
                    return maybePromise
                        .then(hostServiceProvider => registration.instantiate(hostServiceProvider))
                        .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                        .catch(err => {
                            if(err instanceof RangeError) {
                                throw new RangeError(`Circular dependency in registration [${String(requestedServiceName)}].`, { cause: err.cause });
                            }
                            throw err;
                        });
                }
                catch(err) {
                    if(err instanceof RangeError) {
                        throw new RangeError(`Circular dependency in registration [${String(this.#registrations[requestedServiceName].name)}].`, { cause: err.cause });
                    }
                    throw err;
                }
            },
            set: (hostServiceProvider, requestedServiceName, newValue) => {
                // special case for FluxjectSymbols.Disposed
                if(requestedServiceName === FluxjectSymbols.Disposed) {
                    rSymbols[FluxjectSymbols.Disposed] = newValue;
                    return true;
                }

                const readonlySymbols = [
                    FluxjectSymbols.Id,
                    FluxjectSymbols.ServiceProvider,
                    FluxjectSymbols.SingletonsStoreId,
                    FluxjectSymbols.ScopesStoreId
                ];
                if(typeof requestedServiceName === "symbol" && readonlySymbols.includes(requestedServiceName)) {
                    if(this.#config.strict) {
                        throw new Error(`Cannot set [${String(requestedServiceName)}] on Host Service Provider as it is a readonly property.`);
                    }
                    return true;
                }

                // if the requested service not registered, then do nothing and return true.
                if(!(requestedServiceName in this.#registrations)) {
                    if(this.#config.strict) {
                        throw new Error(`Service [${String(requestedServiceName)}] is not a registered service.`);
                    }
                    return true;
                }

                // if the requested service is a Transient lifetime service, then do nothing and return true.
                if(this.#registrations[requestedServiceName].type === Lifetime.Transient) {
                    return true;
                }

                // otherwise, do nothing and return true.
                return true;
            },
            has: (hostServiceProvider, requestedServiceName) => {
                return Object.values(this.#registrations)
                    .some(r => r.name === requestedServiceName && r.type !== Lifetime.Scoped);
            }
        });

        if(asyncInstantiationPromise) {
            return asyncInstantiationPromise
                .then(() => hostServiceProvider)
                .catch(err => {
                    if(err instanceof RangeError) {
                        throw new RangeError(`Circular dependency detected in registration [${String(currentRegistration?.name)}].`, { cause: err.cause });
                    }
                    throw err;
                });
        }

        return hostServiceProvider;
    }

    /**
     * @param {*} rSymbols
     * @param {*} rScopedServices 
     * @param {*} rSingletonServices 
     * @param {(string|symbol)[]} [instantiatedScopedServices=[]]
     * @param {(string|symbol)[]} [instantiatedSingletonServices=[]]
     * @param {Registration<any, string, Lifetime>} [omittedRegistration=undefined]
     * @param {boolean} [includeProviderManagement=true]
     */
    #createScopedServiceProvider(
        rSymbols, 
        rScopedServices, 
        rSingletonServices, 
        instantiatedScopedServices=[], 
        instantiatedSingletonServices=[], 
        omittedRegistration=undefined,
        includeProviderManagement=true
    ) {
        /** @type {Promise<any>|undefined} */
        let asyncInstantiationPromise = undefined;

        // Initialize scoped services.
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];
            // If the registration is not of lifetime scoped, then skip it.
            if(registration.type !== Lifetime.Scoped) {
                continue;
            }

            // if the service has already been instantiated, then skip it.
            if(instantiatedScopedServices.includes(registration.name)) {
                continue;
            }

            // if the registration is the omitted registration, then skip it.
            if(registration.name === omittedRegistration?.name) {
                continue;
            }
            
            try {
                // instantiating new service, so add to the list of instantiated services.
                instantiatedScopedServices.push(registration.name);
                const maybePromise = this.#createScopedServiceProvider(
                    rSymbols,
                    rScopedServices,
                    rSingletonServices,
                    instantiatedScopedServices,
                    instantiatedSingletonServices,
                    registration,
                    false
                );

                // If the returned type is not a Promise, then immediately define the service in `singletonServices` and continue to the next service.
                if(!isPromise(maybePromise)) {
                    const service = registration.instantiate(maybePromise);

                    // If the instantion of the service is not a Promise, then define the service in `singletonServices` and continue to the next service.
                    if(!isPromise(service)) {
                        this.#defineFluxjectSymbolsOnService(service, registration);
                        rScopedServices[registration.name] = service;
                        continue;                
                    }

                    // If the instantion of the service is async, then chain a promise that defines the service in `singletonServices`, and continue to the next service.
                    if(asyncInstantiationPromise) {
                        asyncInstantiationPromise = asyncInstantiationPromise
                            .then(() => service)
                            .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                            .then(service => {
                                rScopedServices[registration.name] = service;
                            });
                        continue;
                    }
                    asyncInstantiationPromise = service;
                }

                // Otherwise, the service is async, so chain a promise that defines the service in `singletonServices`
                if(asyncInstantiationPromise) {
                    asyncInstantiationPromise = asyncInstantiationPromise
                        .then(() => maybePromise)
                        .then(scopedServiceProvider => registration.instantiate(scopedServiceProvider))
                        .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                        .then(service => {
                            rScopedServices[registration.name] = service;
                        });
                    continue;
                }

                // Or create the promise, since a promise was never created.
                asyncInstantiationPromise = maybePromise
                    .then(scopedServiceProvider => registration.instantiate(scopedServiceProvider))
                    .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                    .then(service => {
                        rScopedServices[registration.name] = service;
                    });
            }
            catch(err) {
                if(err instanceof RangeError) {
                    throw new RangeError(`Circular dependency in registration [${String(registration.name)}].`, { cause: err.cause });
                }
                throw err;
            }
        }

        // Create the scopedServiceProvider Proxy object
        const scopedServiceProvider = new Proxy({
            dispose() {
                this[FluxjectSymbols.Disposed] = true;
                /** @type {Promise<void>|undefined} */
                let promise = undefined;
                for(const serviceName in rScopedServices) {
                    const service = rScopedServices[serviceName];
                    // if `Symbol.dispose` is defined, then call it.
                    if(service[Symbol.dispose]) {
                        service[Symbol.dispose]();
                        continue;
                    }
                    // if `Symbol.asyncDispose` is defined, then call it.
                    if(service[Symbol.asyncDispose]) {
                        if(promise) {
                            promise = promise.then(() => {
                                service[Symbol.asyncDispose]();
                            });
                            continue;
                        }
                        promise = service[Symbol.asyncDispose]();
                    }
                }
                // if the promise is defined, then return it
                if(promise) {
                    return promise;
                }
            },
        }, {
            get: (scopedServiceProvider, requestedServiceName) => {
                // if the requested service is a Fluxject symbol, return it.
                if(requestedServiceName in rSymbols) {
                    return rSymbols[requestedServiceName];
                }

                // if the service has already been disposed, then throw an error.
                if(rSymbols[FluxjectSymbols.Disposed]) {
                    throw new Error(`Cannot de-reference [${String(requestedServiceName)}] as the Scoped Service Provider has been disposed.`);
                }

                // if the requested service is an omitted registration, then return undefined.
                if(requestedServiceName === omittedRegistration?.name) {
                    if(this.#config.strict) {
                        throw new Error(`Cannot de-reference [${String(requestedServiceName)}] from Scoped Service Provider as this service would be referencing itself.`);
                    }
                    return undefined;
                }

                // if the requested service is a property of the target (e.g. `dispose`, etc.)
                if(requestedServiceName in scopedServiceProvider) {
                    // if we are directed to exclude these functions, then return undefined.
                    if(!includeProviderManagement) {
                        // if 'strict' mode is enabled, then throw an error.
                        if(this.#config.strict) {
                            throw new Error(`Use of [${String(requestedServiceName)}] is not available during instantiation.`);
                        }
                        return undefined;
                    }
                    return scopedServiceProvider[requestedServiceName];
                }
                
                // if the requested service is a scoped service, return it.
                if(requestedServiceName in rScopedServices) {
                    return rScopedServices[requestedServiceName];
                }

                // if the requested service is a singleton service, return it.
                if(requestedServiceName in rSingletonServices) {
                    return rSingletonServices[requestedServiceName];
                }

                // if the requested service is not registered, then return undefined.
                if(!(requestedServiceName in this.#registrations)) {
                    if(this.#config.strict) {
                        throw new Error(`Service [${String(requestedServiceName)}] is not registered.`);
                    }
                    return undefined;
                }

                // Last case: service is transient, so instantiate and return the transient service.
                try {
                    const registration = this.#registrations[requestedServiceName];
                    instantiatedSingletonServices.push(registration.name);
                    const maybePromise = this.#createHostServiceProvider(
                        rSymbols,
                        rSingletonServices, 
                        asyncInstantiationPromise,
                        instantiatedSingletonServices,
                        registration
                    );
                    if(!isPromise(maybePromise)) {
                        const service = this.#defineFluxjectSymbolsOnService(maybePromise, registration);
                        return registration.instantiate(service);
                    }
                    return maybePromise
                        .then(hostServiceProvider => registration.instantiate(hostServiceProvider))
                        .then(service => this.#defineFluxjectSymbolsOnService(service, registration))
                        .catch(err => {
                            if(err instanceof RangeError) {
                                throw new RangeError(`Circular dependency in registration [${String(registration.name)}].`, { cause: err.cause });
                            }
                            throw err;
                        });
                }
                catch(err) {
                    if(err instanceof RangeError) {
                        throw new RangeError(`Circular dependency in registration [${String(requestedServiceName)}].`, { cause: err.cause });
                    }
                    throw err;
                }
            },
            set: (scopedServiceProvider, requestedServiceName, newValue) => {
                // special case for FluxjectSymbols.Disposed
                if(requestedServiceName === FluxjectSymbols.Disposed) {
                    rSymbols[FluxjectSymbols.Disposed] = newValue;
                    return true;
                }

                // if the requested service is not registered, then do nothing and return true.
                if(!(requestedServiceName in this.#registrations)) {
                    return true;
                }

                // if the requested service is a Transient lifetime service, then do nothing and return true.
                if(this.#registrations[requestedServiceName].type === Lifetime.Transient) {
                    return true;
                }

                // if the requested service is a Scoped lifetime service, set the new value.
                if(this.#registrations[requestedServiceName].type === Lifetime.Scoped) {
                    rScopedServices[requestedServiceName] = newValue;
                    return true;
                }

                // otherwise, if the requested service is a Singleton lifetime service, set the new value.
                rSingletonServices[requestedServiceName] = newValue;
                return true;
            },
            has: (scopedServiceProvider, requestedServiceName) => {
                return Object.values(this.#registrations).some(r => r.name === requestedServiceName);
            }
        });

        // if any of the services instantiated returned a promise, then this function will return a promise that resolves when all of the services have been instantiated.
        if(asyncInstantiationPromise) {
            return asyncInstantiationPromise
                .then(() => scopedServiceProvider)
                .catch(err => {
                    if(err instanceof RangeError) {
                        throw new RangeError(`Circular dependency detected in registration [${String(omittedRegistration?.name)}].`, { cause: err.cause });
                    }
                    throw err;
                });
        }
        
        return scopedServiceProvider;
    }

    /**
     * Defines pre-defined readonly properties on the given service.
     * Properties are:
     * - id: UUID of the service. (can be de-referenced by the unique symbol {@link FLUXJECT_ID}).
     * - uptime: How long the service has been alive for. (can be de-referenced by the unique symbol {@link FLUXJECT_UPTIME}).
     * - lifetime: The lifetime of the service. (can be de-referenced by the unique symbol {@link FLUXJECT_LIFETIME}).
     * @param {any} service 
     * @param {Registration<any,any,any>} registration
     * @returns {any}
     */
    #defineFluxjectSymbolsOnService(service, registration) {
        if(typeof service !== "object") {
            return service;
        }

        // if the user has defined the `enablePredefinedProperties` option as true
        // then the properties will be defined as getters to their actual value.
        const timeAtDefinition = Date.now();
        Object.defineProperties(service, {
            [FluxjectSymbols.Id]: {
                value: randomUUID(),
                writable: false
            },
            [FluxjectSymbols.Lifetime]: {
                value: registration.type,
                writable: false
            },
            [FluxjectSymbols.Uptime]: {
                get() {
                    return TimeSpan.fromMilliseconds(Date.now() - timeAtDefinition);
                }
            }
        });
        return service;
    }
}

/**
 * Various configuration options to set on the Container being created.
 * @typedef ContainerConfig
 * @prop {boolean} strict
 * When true, various correctness checks are enabled, including the following:
 *   - `Singleton` timetime registered services are not editable.
 */

/**
 * Gets the `ScopedServiceProvider` type associated with `TContainer`.
 * @template {Container} TContainer
 * The container to infer the service provider from
 * @typedef {{[K in keyof InferRegistrationsFromContainer<TContainer>]: Resolved<InferValueFromRegistration<InferRegistrationsFromContainer<TContainer>[K]>>}} ScopedServiceProvider
 */