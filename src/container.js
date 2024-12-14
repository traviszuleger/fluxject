//@ts-check

/**
 * @template {Record<string, Registration<any,string,Lifetime>>} TRegistrations
 * @template {Lifetime} TLifeTime
 * @typedef {{[K in keyof TRegistrations as InferLifetimeFromRegistration<TRegistrations[K]> extends TLifeTime ? K : never]: Resolved<InferValueFromRegistration<TRegistrations[K]>>}} InferByLifetimeFromRegistration
 */

/**
 * @template {Container<*>} TContainer
 * @template {keyof ExtractRegistrationsFromContainer<TContainer>} TKey
 * @template {GetRegistrationFromContainer<TContainer, TKey>} [TRegistration=GetRegistrationFromContainer<TContainer, TKey>]
 * @typedef {InferLifetimeFromRegistration<TRegistration> extends "Transient"|"Singleton"
 *   ? Widen<Omit<InferByLifetimeFromRegistration<ExtractRegistrationsFromContainer<TContainer>, "Transient"|"Singleton">, TKey> & { createScope: () => Omit<ScopedServiceProvider<ExtractRegistrationsFromContainer<TContainer>>, TKey>}>
 *   : Widen<Omit<InferByLifetimeFromRegistration<ExtractRegistrationsFromContainer<TContainer>, "Transient"|"Singleton"|"Scoped">, TKey>>
 * } InferServiceProvider
 */

/**
 * @template T
 * @typedef {T extends infer U ? {[K in keyof U]: U[K] } : never} Widen
 */


/**
 * @template {Container<*>} TContainer
 * @template {keyof ExtractRegistrationsFromContainer<TContainer>} TKey
 * @typedef {ExtractRegistrationsFromContainer<TContainer>[TKey]} GetRegistrationFromContainer
 * 
 */

/**
 * Expected sub-type for class-like instantiators.
 * @typedef {new (...args: any) => any} ClassType
 */

/**
 * Resolved instance for the sub-type, {@link ClassType}, that was passed in as an instantiator.
 * @template {ClassType} TClassType 
 * @typedef {InstanceType<TClassType>} ResolvedClassType
 */

/**
 * Expected sub-type for factory-like instantiators.
 * @typedef {(...args: any) => Exclude<any, PromiseLike>} FactoryType
 */

/**
 * Resolved instance for the sub-type, {@link FactoryType}, that was passed in as an instantiator.
 * @template {FactoryType} TFactoryType 
 * @typedef {ReturnType<TFactoryType>} ResolvedFactoryType
 */

/**
 * Expected sub-type for static-like instantiators.
 * @typedef {any} StaticType
 */

/**
 * Resolved instance for the sub-type, {@link StaticType}, that was passed in as an instantiator.
 * @template {StaticType} TStaticType
 * @typedef {TStaticType} ResolvedStaticType
 */

/**
 * Infers the expected value from the given registration, `TRegistration`, 
 * and returns a new type that consists of an object with exactly one key (name from the Registration)
 * to one value (prototype/function/static from the Registration) 
 * @template {Registration<any, string, Lifetime>} TRegistration
 * @typedef {TRegistration extends Registration<infer T, infer TName, infer TLifeTime> ? {[K in TName]: T} : never} InferFromRegistration
 */

/**
 * Infers the name of the registration.
 * @template {Registration<any, string, Lifetime>} TRegistration
 * @typedef {TRegistration extends Registration<infer T, infer TName, infer TLifeTime> ? TName : never} InferNameFromRegistration
 */

/**
 * Infers the value of the registration.
 * @template {Registration<any, string, Lifetime>} TRegistration
 * @typedef {TRegistration extends Registration<infer T, infer TName, infer TLifeTime> ? T : never} InferValueFromRegistration
 */

/**
 * Infers the lifetime type of the registration.
 * @template {Registration<any, string, Lifetime>} TRegistration
 * @typedef {TRegistration extends Registration<infer T, infer TName, infer TLifeTime> ? TLifeTime : never} InferLifetimeFromRegistration
 */

/**
 * Infers the resolved type from the given registration type.
 * @template T
 * @typedef {T extends ClassType
 * ? ResolvedClassType<T> 
 * : T extends FactoryType
 * ? ResolvedFactoryType<T>
 * : T} Resolved
 */

/**
 * @template {Record<string,Registration<any, string, Lifetime>>} [TRegistrationMap={}]
 */
export class Container {
    #options;
    #registrations;
    #singletons;

    static create() {
        return new Container({}, {});
    }

    /**
     * @protected
     * @param {{}} options
     * @param {TRegistrationMap} registrations
     */
    constructor(options, registrations) {
        this.#options = options;
        this.#registrations = registrations;
        this.#singletons = {};
    }

    /**
     * Register a new service on this container.
     * @template {Registration<any, string, Lifetime>} TNewRegistration
     * Type of the new registration being added
     * @param {(config: ContainerConfigurator) => TNewRegistration} callback
     * Callback function that is used to reflect and setup a new Registration.
     * @returns {Container<TRegistrationMap & {[K in InferNameFromRegistration<TNewRegistration>]: TNewRegistration}>}
     * A clone of this Container with the newly updated type reflected by the added Registration.
     */
    register(callback) {
        const registration = callback(new ContainerConfigurator());
        const registrations = { ...this.#registrations, [registration.name]: registration };
        return new Container(this.#options, registrations);
    }
    
    /**
     * Prepare the container for consumption
     * @returns {HostServiceProvider<TRegistrationMap>}
     * Fully prepared Service Container containing properties for all registered services and a function to create scope.
     */
    prepare() {
        for(const key in this.#registrations) {
            const registration = this.#registrations[key];
            if(registration.type === Lifetime.Singleton) {
                this.#singletons[registration.name] = registration.instantiate(this.#createHostServiceProvider());
            }
        }
        return this.#createHostServiceProvider();
    }

    #createHostServiceProvider() {
        const hostServiceProvider = new Proxy(/** @type {any} */ ({}), {
            get: (t,p,r) => {
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(p === "createScope") {
                    return () => this.#createScopedServiceProvider()
                }
                if(p in this.#registrations) {
                    if(this.#registrations[p].type === Lifetime.Scoped) {
                        return undefined;
                    }
                    if(this.#registrations[p].type === Lifetime.Singleton) {
                        return this.#singletons[p];
                    }
                    if(this.#registrations[p].type === Lifetime.Transient) {
                        return this.#registrations[p].instantiate(this.#createHostServiceProvider());
                    }
                }
                return undefined;
            },
            set: (t,p,v) => {
                if(typeof p === "symbol") {
                    throw new Error(`Property, "${String(p)}", must be of type "String".`);
                }
                if(p in this.#registrations
                    && this.#registrations[p].type === Lifetime.Singleton
                ) {
                    this.#singletons[p] = v;
                }
                return true;
            }
        });
        return hostServiceProvider;
    }

    #createScopedServiceProvider() {
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
                    return this.#singletons[p];
                }
                if(this.#registrations[p].type === Lifetime.Transient) {
                    return this.#registrations[p].instantiate(this.#createHostServiceProvider());
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
                        this.#singletons[p] = v;
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
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * @typedef {{[K in keyof TRegistrationMap as TRegistrationMap[K] extends Registration<any, string, "Scoped"> ? never : K]: Resolved<InferValueFromRegistration<TRegistrationMap[K]>>} & { createScope: () => ScopedServiceProvider<TRegistrationMap> }} HostServiceProvider
 */

/**
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * @typedef {{[K in keyof TRegistrationMap]: Resolved<InferValueFromRegistration<TRegistrationMap[K]>>}} ScopedServiceProvider
 */

/**
 * @template T
 * @typedef ParameterLike
 * @prop {T} type
 */

/**
 * Extract all registrations from a given container, `TContainer`.
 * @template {Container} TContainer
 * @typedef {TContainer extends Container<infer TRegistrations> ? TRegistrations : never} ExtractRegistrationsFromContainer
 */

/**
 * @template {Container} TServicesContainer
 * @typedef {ReturnType<TServicesContainer['prepare']>} Prepared
 */

class ContainerConfigurator {

    /**
     * Register a new scoped service that will be instantiated and returned when `createScope` is called.
     * @template {string} TName
     * String type for the name of the service being registered, inferred from `name`.
     * @template {ClassType|FactoryType|StaticType} TInstantiator
     * @param {TName} name
     * Name of the service being registered.
     * @param {TInstantiator} instantiator
     * @returns {Registration<TInstantiator, TName, "Scoped">}
     * A new registration object
     */
    scoped(name, instantiator) {
        if(typeof instantiator === "function") {
            if(isConstructor(instantiator)) {
                return {
                    name,
                    type: Lifetime.Scoped,
                    instantiate: (services) => new instantiator(services),
                };
            }
            return {
                name,
                type: Lifetime.Scoped,
                instantiate: (services) => instantiator(services)
            }
        }
        return {
            name,
            type: Lifetime.Scoped,
            instantiate: () => /** @type {Resolved<TInstantiator>} */ (instantiator)
        }
    }

    /**
     * Register a new singleton service that will be instantiated once and remain for the rest of the application lifetime.
     * @template {string} TName
     * String type for the name of the service being registered, inferred from `name`.
     * @template {ClassType|FactoryType|StaticType} TInstantiator
     * Constructor, Function, or any instance type for the expected service, inferred from `value`.
     * @param {TName} name
     * Name of the service being registered.
     * @param {TInstantiator} instantiator
     * A constructor, a factory method, or a static instance to set for the transient.
     * @returns {Registration<TInstantiator, TName, "Singleton">}
     * A new registration object
     */
    singleton(name, instantiator) {
        if(typeof instantiator === "function") {
            if(isConstructor(instantiator)) {
                return {
                    name,
                    type: Lifetime.Singleton,
                    instantiate: (services) => new instantiator(services)
                };
            }
            return {
                name,
                type: Lifetime.Singleton,
                instantiate: (services) => instantiator(services)
            }
        }
        return {
            name,
            type: Lifetime.Singleton,
            instantiate: () => /** @type {Resolved<TInstantiator>} */ (instantiator)
        }
    }

    /**
     * Register a new transient service that will be instantiated every time `TName` is resolved.
     * @template {string} TName
     * String type for the name of the service being registered, inferred from `name`.
     * @template {ClassType|FactoryType} TInstantiator
     * Constructor or Factory function type that is used to instantiate the transient.
     * @param {TName} name
     * Name of the service being registered.
     * @param {TInstantiator} instantiator
     * A constructor or a factory method that will be used to instantiate the transient.
     * @returns {Registration<TInstantiator, TName, "Transient">}
     * A new registration object
     */
    transient(name, instantiator) {
        if(isConstructor(instantiator)) {
            return {
                name,
                type: Lifetime.Transient,
                instantiate: (services) => new instantiator(services)
            };
        }
        return {
            name,
            type: Lifetime.Transient,
            instantiate: (services) => instantiator(services)
        }
    }
}

/**
 * Type holding type information and runtime info for the a registered service.
 * @template T
 * Type for the expected value for when this registered service resolves.
 * @template {string} TName
 * Type for the given name for this registered service.
 * @template {Lifetime} TLifeTime
 * The type denoting what kind of lifetime this registered service is.
 * @typedef Registration
 * @prop {TLifeTime} type
 * Lifetime type of the registered service.
 * @prop {string} name
 * Name of the registered service.
 * @prop {(services: any) => Resolved<T>} instantiate
 */

/**
 * Check if the given function, `fn`, is a constructor.
 * @param {Function} fn 
 * Function to check.
 * @returns {fn is ClassType}
 * True if the function is a constructor, otherwise false.
 */
function isConstructor(fn) {
    if("constructor" in fn) {
        return true;
    }
    return false;
}

/**
 * Enumerable object for specifying the Lifetime of a registered service.
 */
/** @enum {typeof Lifetime[keyof typeof Lifetime]} */
const Lifetime = Object.freeze({
    Scoped: "Scoped",
    Singleton: "Singleton",
    Transient: "Transient"
});

/**
 * @template T
 * @typedef RegistrationConfiguration
 * @prop {(obj: T) => void} onModelCreating
 */