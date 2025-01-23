//@ts-check
/** @import { Registration } from "./registration.js" */
/** @import { AnyPromiseSingletons, HostServiceProvider, InferRegistrationsFromContainer, InferValueFromRegistration, Resolved, Widen } from "./types.js" */
import { randomUUID } from "crypto";
import { RegistrationProvider } from "./registration.js";
import { FLUXJECT_ID, FLUXJECT_LIFETIME, FLUXJECT_UPTIME, FluxjectProperties, Lifetime } from "./types.js"
import { TimeSpan } from "unitspan";

export {
    FLUXJECT_ID,
    FLUXJECT_UPTIME,
    FLUXJECT_LIFETIME
};

/**
 * Class that manages injected services accordingly.
 * @template {Record<string, Registration<any, string, Lifetime>>} [TRegistrationMap={}]
 */
export class Container {
    #config;
    #registrations;

    /**
     * Create a new Container
     * @param {Partial<ContainerConfig>} config
     * @returns 
     */
    static create(config={}) {
        const containerConfig = {
            strict: true,
            enablePredefinedProperties: false,
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
     * @returns {Container<Widen<TRegistrationMap & TNewRegistrations>>}
     * A clone of this Container with the newly updated type reflected by the added Registration.
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
     * Prepare the container for consumption
     * @param {Partial<ContainerConfig>} config
     * @returns {AnyPromiseSingletons<TRegistrationMap> extends never
     * ? HostServiceProvider<TRegistrationMap> 
     * : Promise<HostServiceProvider<TRegistrationMap>>}
     * Fully prepared Service Container containing properties for all registered services and a function to create scope.
     */
    prepare(config={}) {
        /** @type {Promise<any>|undefined} */
        let promise = undefined;
        const container = new Container({
            ...this.#config,
            ...config,
        }, this.#registrations);
        const singletons = {};
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];
            if(registration.type !== Lifetime.Singleton) {
                continue;
            }
            const maybePromise = registration.instantiate(container.#createHostServiceProvider(singletons));
            if(typeof maybePromise === "object" && "then" in maybePromise) {
                if(promise) {
                    promise = promise.then(() => maybePromise).then(val => {
                        container.#defineFluxjectProperties(val, registration);
                        singletons[registration.name] = val;
                    });
                }
                else {
                    promise = maybePromise.then(val => {
                        container.#defineFluxjectProperties(val, registration);
                        singletons[registration.name] = val;
                    });
                }
            }
            else {
                container.#defineFluxjectProperties(maybePromise, registration);
                singletons[registration.name] = maybePromise;
            }
        }
        if(promise) {
            return /** @type {any} */ (promise.then(() => container.#createHostServiceProvider(singletons)));
        }
        return container.#createHostServiceProvider(singletons);
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
                    return () => this.#createScopedServiceProvider(singletons);
                }
                if(p in this.#registrations) {
                    if(this.#registrations[p].type === Lifetime.Scoped) {
                        throw new Error(`Scoped registrations cannot be accessed from the HostServiceProvider. (Use the ScopedServiceProvider returned from [createScope()] to access Scoped services.)`);
                    }
                    if(this.#registrations[p].type === Lifetime.Singleton) {
                        return singletons[p];
                    }
                    if(this.#registrations[p].type === Lifetime.Transient) {
                        const maybePromise = this.#registrations[p].instantiate(this.#createHostServiceProvider(singletons));
                        if(typeof maybePromise === "object" && "then" in maybePromise) {
                            maybePromise.then(obj => {
                                this.#defineFluxjectProperties(obj, this.#registrations[p]);
                                return obj;
                            });
                        }
                        else {
                            this.#defineFluxjectProperties(maybePromise, this.#registrations[p]);
                        }
                        return maybePromise;
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
        /** @type {Promise<any>|undefined} */
        let promise = undefined;
        const obj = {
            ...singletons
        };
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];
            if(registration.type !== Lifetime.Scoped) {
                continue;
            }
            const maybePromise = registration.instantiate(this.#createHostServiceProvider(singletons));
            if(typeof maybePromise === "object" && "then" in maybePromise) {
                if(promise) {
                    promise = promise.then(() => maybePromise).then(val => {
                        this.#defineFluxjectProperties(val, registration);
                        obj[registration.name] = val;
                    })
                }
                else {
                    promise = maybePromise.then(val => {
                        this.#defineFluxjectProperties(val, registration);
                        obj[registration.name] = val;
                    });
                }
            }
            else {
                this.#defineFluxjectProperties(maybePromise, registration);
                obj[registration.name] = maybePromise;
            }
        }

        const scopedServiceProvider = new Proxy(obj, {
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
                if(this.#registrations[p].type === Lifetime.Singleton) {
                    return singletons[p];
                }
                else if(this.#registrations[p].type === Lifetime.Transient) {
                    const maybePromise = this.#registrations[p].instantiate(this.#createHostServiceProvider(singletons));
                    if(typeof maybePromise === "object" && "then" in maybePromise) {
                        return maybePromise.then(val => {
                            this.#defineFluxjectProperties(val, this.#registrations[p]);
                            return val;
                        });
                    }
                    this.#defineFluxjectProperties(maybePromise, this.#registrations[p]);
                    return maybePromise;
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

        if(promise) {
            return promise.then(() => scopedServiceProvider);
        }
        
        return scopedServiceProvider;
    }

    /**
     * @param {any} obj 
     * @param {Registration<any,any,any>} registration
     */
    #defineFluxjectProperties(obj, registration) {
        if(typeof obj !== "object") {
            return;
        }
        if(!this.#config.enablePredefinedProperties) {
            const properties = Object.fromEntries(Object.entries(FluxjectProperties).map(([k,v]) => [FluxjectProperties[k],
                {
                    get: () => {
                        throw new Error(`Cannot get [${String(FluxjectProperties[k])}] as the [enablePredefinedProperties] option is set to false.`);
                    }
                }
            ]));
            Object.defineProperties(obj, properties);
            return;
        }
        const timeAtDefinition = Date.now();
        Object.defineProperties(obj, {
            [FLUXJECT_ID]: {
                writable: false,
                value: randomUUID()
            },
            [FLUXJECT_UPTIME]: {
                get: () => {
                    return TimeSpan.fromMilliseconds(Date.now() - timeAtDefinition);
                }
            },
            [FLUXJECT_LIFETIME]: {
                writable: false,
                value: registration.type
            }
        })
    }
}

/**
 * Various configuration options to set on the Container being created.
 * @typedef ContainerConfig
 * @prop {boolean} strict
 * When true, various correctness checks are enabled, including the following:
 *   - `Singleton` timetime registered services are not editable.
 * @prop {boolean} enablePredefinedProperties
 * When true, properties like {@link FLUXJECT_ID} and other unique symbol properties will be
 * defined on `object` type services. (default: false) 
 */

/**
 * Gets the `ScopedServiceProvider` type associated with `TContainer`.
 * @template {Container} TContainer
 * The container to infer the service provider from
 * @typedef {{[K in keyof InferRegistrationsFromContainer<TContainer>]: Resolved<InferValueFromRegistration<InferRegistrationsFromContainer<TContainer>[K]>>}} ScopedServiceProvider
 */