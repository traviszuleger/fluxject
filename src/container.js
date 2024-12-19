//@ts-check
/** @import { Registration } from "./registration.js" */
/** @import { HostServiceProvider, InferValueFromRegistration, OnlyRegistrationsOfLifetime, Resolved } from "./types.js" */
import { RegistrationProvider } from "./registration.js";
import { Lifetime } from "./types.js"

/**
 * @template {Record<string, Registration<any, string, Lifetime>>} [TRegistrationMap={}]
 */
export class Container {
    #config;
    #registrations;

    /**
     * @param {Partial<ContainerConfig>} config
     * @returns 
     */
    static create(config={}) {
        const containerConfig = {
            strict: true,
            ...config
        };
        return new Container(containerConfig, {});
    }

    /**
     * @protected
     * @param {ContainerConfig} config
     * @param {TRegistrationMap} registrations
     */
    constructor(config, registrations) {
        this.#config = config;
        this.#registrations = registrations;
    }

    /**
     * Register one or more services on this container.
     * 
     * @example
     * ```js
     * import { Container } from "fluxject";
     * import { BasicService } from "fluxject/services";
     * class MyService1 {
     *   x = 0;
     * }
     * 
     * class MyService2 extends BasicService(() => container) {
     *   test() {
     *     console.log(this.services.service1.);
     *   }
     * }
     * const container = Container.create()
     *   .register(m => m.singleton({ service1: MyService1, service2: MyService2 }));
     * 
     * const hostServiceProvider = container.prepare();
     * 
     * hostServiceProvider.service1
     * ```
     * @template {{[serviceName: string]: Registration<any, string, Lifetime>}} TNewRegistrations
     * Type of the new registration being added
     * @param {(registrationProvider: RegistrationProvider) => TNewRegistrations} callback
     * Callback function that is used to reflect and setup a new Registration.
     * @returns {Container<TRegistrationMap & TNewRegistrations>}
     * A clone of this Container with the newly updated type reflected by the added Registration.
     */
    register(callback) {
        const registrations = callback(new RegistrationProvider());
        return new Container(this.#config, {
            ...this.#registrations,
            ...registrations
        });
    }
    
    /**
     * Prepare the container for consumption
     * @returns {HostServiceProvider<TRegistrationMap>}
     * Fully prepared Service Container containing properties for all registered services and a function to create scope.
     */
    prepare() {
        const singletons = {};
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];
            if(registration.type === Lifetime.Singleton) {
                singletons[registration.name] = registration.instantiate(this.#createHostServiceProvider(singletons));
            }
        }
        return this.#createHostServiceProvider(singletons);
    }

    /**
     * @param {*} singletons 
     */
    #createHostServiceProvider(singletons) {
        const hostServiceProvider = new Proxy(/** @type {any} */ ({}), {
            get: (t,p,r) => {
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(p === "createScope") {
                    return () => this.#createScopedServiceProvider(singletons)
                }
                if(p in this.#registrations) {
                    if(this.#registrations[p].type === Lifetime.Scoped) {
                        throw new Error(`Scoped registrations cannot be accessed from the HostServiceProvider. (Use the ScopedServiceProvider returned from [createScope()] to access Scoped services.)`);
                    }
                    if(this.#registrations[p].type === Lifetime.Singleton) {
                        return singletons[p];
                    }
                    if(this.#registrations[p].type === Lifetime.Transient) {
                        return this.#registrations[p].instantiate(this.#createHostServiceProvider(singletons));
                    }
                }
                return undefined;
            },
            set: (t,p,v) => {
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(p in this.#registrations) {
                    switch(this.#registrations[p].type) {
                        case Lifetime.Scoped: {
                            throw new Error(`Scoped registrations cannot be accessed from the HostServiceProvider. (Use the ScopedServiceProvider returned from [createScope()] to access Scoped services.)`);
                        }
                        case Lifetime.Singleton: {
                            if(this.#config.strict) {
                                throw new Error(`Singleton registrations cannot be edited while [strict] mode is enabled.`);
                            }
                            singletons[p] = v;
                            break;
                        }
                        case Lifetime.Transient: {
                            if(this.#config.strict) {
                                throw new Error(`Singleton registrations cannot be edited while [strict] mode is enabled.`);
                            }
                            break;
                        }

                    }
                    
                }
                return true;
            }
        });
        return hostServiceProvider;
    }

    /**
     * @param {*} singletons 
     */
    #createScopedServiceProvider(singletons) {
        const scopedServiceProvider = new Proxy({}, {
            get: (t,p,r) => {
                if(p in t) {
                    return t[p];
                }
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(!(p in this.#registrations)) {
                    return undefined;
                }
                if(this.#registrations[p].type === Lifetime.Scoped) {
                    t[p] = this.#registrations[p].instantiate(scopedServiceProvider);
                    return t[p];
                }
                if(this.#registrations[p].type === Lifetime.Singleton) {
                    return singletons[p];
                }
                if(this.#registrations[p].type === Lifetime.Transient) {
                    return this.#registrations[p].instantiate(this.#createHostServiceProvider(singletons));
                }
                return undefined;
            },
            set: (t,p,v) => {
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(p in this.#registrations) {
                    if(this.#registrations[p].type === Lifetime.Scoped) {
                        t[p] = v;
                        return true;
                    }
                    if(this.#registrations[p].type === Lifetime.Singleton) {
                        if(this.#config.strict) {
                            return false;
                        }
                        singletons[p] = v;
                        return true;
                    }
                }
                return true;
            }
        });
        return scopedServiceProvider;
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
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * The container to infer the service provider from
 * @typedef {{[K in keyof OnlyRegistrationsOfLifetime<TRegistrationMap, "Singleton"|"Transient">]: Resolved<InferValueFromRegistration<TRegistrationMap[K]>>} & { createScope: () => ScopedServiceProvider<TRegistrationMap> }} HostServiceProvider
 */

/**
 * Gets the `ScopedServiceProvider` type associated with `TContainer`.
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * The container to infer the service provider from
 * @typedef {{[K in keyof TRegistrationMap]: Resolved<InferValueFromRegistration<TRegistrationMap[K]>>}} ScopedServiceProvider
 */