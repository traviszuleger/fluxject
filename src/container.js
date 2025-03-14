//@ts-check
/** @import * as Types from "./types.js" */
import { RegistrationBuilder } from "./builder.js";
import { INSTANCE } from "./lazy-reference.js";
import { FluxjectHostServiceProvider } from "./provider.js";

/**
 * Container that manages registrations of dependencies.
 * @template {Record<string, Types.Registration<any, any>>} TRegistrations
 * All registrations that have been made on this container.
 */
export class Container {
    #registrations;
    #currentOverallPriority = 0;
    #currentSingletonPriority = 0;
    #currentScopedPriority = 0;

    /**
     * Create a new container for managing dependencies. (Alias of `fluxject()`)
     * @returns {Container<{}>}
     */
    static create() {
        return new Container({});
    }

    /**
     * @protected
     * @param {TRegistrations} registrations 
     */
    constructor(registrations) {
        this.#registrations = registrations;
        this.#currentSingletonPriority = 0;
        this.#currentScopedPriority = 0;
    }

    /**
     * Register a new set of dependencies to the container.  
     * @deprecated Use the `addSingleton`, `addScope`, or `addTransient` methods instead.
     * @template {Record<string, Types.Registration<any, any>>} TNewRegistrations
     * The new registrations as inferred from the return type of the callback.
     * @param {(serviceBuilder: RegistrationBuilder) => TNewRegistrations} callback
     * The callback that will be used to register new services.
     * @returns {Container<TRegistrations & TNewRegistrations>}
     * A new container with the new registrations added.
     */
    register(callback) {
        const registrations = callback(new RegistrationBuilder(this.#currentOverallPriority++));
        
        return new Container({
            ...this.#registrations,
            ...registrations
        });
    }

    /**
     * Add a singleton to your container, preserving its priority when disposing.  
     * 
     * __Priority of disposal occurs in a reverse-order of the container's registrations. Meaning whatever is registered first will be disposed of last.__
     * @template {Types.Instantiator<any>} TFactoryMethod
     * Inferred factory method from the `factoryMethod` parameter.
     * @template {string} TNewRegistrationName
     * Inferred registration name from the `name` parameter.
     * @param {TNewRegistrationName extends keyof TRegistrations ? never : TNewRegistrationName} name
     * The name of the registration.
     * @param {TFactoryMethod} factoryMethod
     * The factory method that will be used to create the instance. 
     * @param {Partial<RegistrationOptions>} options 
     * The options for the registration. If priority is specified, then the priority will be set to that value. Otherwise, it will be set to the current priority.
     * 
     * The current priority only increments if the priority option is not specified.
     * @returns {Container<TRegistrations & Record<TNewRegistrationName, Types.Registration<TFactoryMethod, "singleton">>>}
     * Returns a new container with the new singleton added.
     */
    addSingleton(name, factoryMethod, options={}) {
        const priority = options.priority !== undefined ? options.priority : this.#currentSingletonPriority++;
        const newRegistrations = {
            [name]: {
                lifetime: "singleton",
                factory: factoryMethod,
                priority
            }
        };

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Add multiple singletons to the your container, preserving their priority when disposing.
     * 
     * __Priority of disposal occurs in a reverse-order of the container's registrations. Meaning whatever is registered first will be disposed of last.__
     * 
     * __All services registered under this one method call will have the same priority__
     * @template {Record<string, Types.Instantiator<any>>} TNewRegistrations
     * Inferred registrations from the `registrations` parameter.
     * @param {keyof TNewRegistrations extends keyof TRegistrations ? never : TNewRegistrations} registrations
     * The registrations to add to the container
     * @param {Partial<RegistrationOptions>} options
     * The options for the registration. If priority is specified, then the priority will be set to that value. Otherwise, it will be set to the current priority.
     * 
     * The current priority only increments if the priority option is not specified. 
     * @returns {Container<TRegistrations & TNewRegistrations>}
     * Returns a new container with the new singletons added.
     */
    addSingletons(registrations, options={}) {
        const priority = options.priority !== undefined ? options.priority : this.#currentSingletonPriority++;
        const rb = new RegistrationBuilder(priority);
        const newRegistrations = rb.singleton(registrations);

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Add a scoped service to your container, preserving its priority when disposing.
     * 
     * __All services registered under this one method call will have the same priority__
     * 
     * __Priority of disposal occurs in a reverse-order of the container's registrations. Meaning whatever is registered first will be disposed of last.__
     * @template {Types.Instantiator<any>} TFactoryMethod
     * Inferred factory method from the `factoryMethod` parameter.
     * @template {string} TNewRegistrationName
     * Inferred registration name from the `name` parameter.
     * @param {TNewRegistrationName extends keyof TRegistrations ? never : TNewRegistrationName} name
     * The name of the registration.
     * @param {TFactoryMethod} factoryMethod
     * The factory method that will be used to create the instance.
     * @param {Partial<RegistrationOptions>} options
     * The options for the registration. If priority is specified, then the priority will be set to that value. Otherwise, it will be set to the current priority.
     * 
     * The current priority only increments if the priority option is not specified.
     * @returns {Container<TRegistrations & Record<TNewRegistrationName, Types.Registration<TFactoryMethod, "scoped">>>}
     * Returns a new container with the new scoped service added.
     */
    addScope(name, factoryMethod, options={}) {
        const priority = options.priority !== undefined ? options.priority : this.#currentScopedPriority++;
        const newRegistrations = {
            [name]: {
                lifetime: "scoped",
                factory: factoryMethod,
                priority
            }
        };

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Add multiple scoped services to the your container, preserving its priority when disposing.
     * 
     * __All services registered under this one method call will have the same priority__
     * 
     * __Priority of disposal occurs in a reverse-order of the container's registrations. Meaning whatever is registered first will be disposed of last.__
     * @template {Record<string, Types.Instantiator<any>>} TNewRegistrations
     * Inferred registrations from the `registrations` parameter.
     * @param {keyof TNewRegistrations extends keyof TRegistrations ? never : TNewRegistrations} registrations
     * The registrations to add to the container.  
     * @param {Partial<RegistrationOptions>} options
     * The options for the registration. If priority is specified, then the priority will be set to that value. Otherwise, it will be set to the current priority.
     * 
     * The current priority only increments if the priority option is not specified.
     * @returns {Container<TRegistrations & {[K in keyof TNewRegistrations]: Types.Registration<TNewRegistrations[K], "scoped">}>}
     * Returns a new container with the new scoped services added.
     */
    addScopes(registrations, options={}) {
        const priority = options.priority !== undefined ? options.priority : this.#currentScopedPriority++;
        const rb = new RegistrationBuilder(priority);
        const newRegistrations = rb.scoped(registrations);

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Add a transient service to your container.  
     * 
     * __Priority is not preserved under a transient service, as a transient service is disposed of on demand.__
     * @template {Types.Instantiator<any>} TFactoryMethod
     * Inferred factory method from the `factoryMethod` parameter.
     * @template {string} TNewRegistrationName
     * Inferred registration name from the `name` parameter.
     * @param {TNewRegistrationName extends keyof TRegistrations ? never : TNewRegistrationName} name
     * The name of the registration.
     * @param {TFactoryMethod} factoryMethod
     * The factory method that will be used to create the instance.
     * @returns {Container<TRegistrations & Record<TNewRegistrationName, Types.Registration<TFactoryMethod, "scoped">>>}
     * Returns a new container with the new scoped service added.
     */
    addTransient(name, factoryMethod) {
        const newRegistrations = {
            [name]: {
                lifetime: "transient",
                factory: factoryMethod,
                priority: 0
            }
        };

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Add multiple transient services to the your container.
     * 
     * __Priority is not preserved under a transient service, as a transient service is disposed of on demand.__
     * @template {Record<string, Types.Instantiator<any>>} TNewRegistrations
     * Inferred registrations from the `registrations` parameter.
     * @param {TNewRegistrations} registrations
     * The registrations to add to the container
     * @returns {Container<TRegistrations & TNewRegistrations>}
     * Returns a new container with the new scoped services added.
     */
    addTransients(registrations) {
        const rb = new RegistrationBuilder(0);
        const newRegistrations = rb.transient(registrations);

        const container = /** @type {any} */ (new Container({
            ...this.#registrations,
            ...newRegistrations
        }));
        container.#currentScopedPriority = this.#currentScopedPriority;
        return container;
    }

    /**
     * Prepare the container for consumption.
     * @returns {Types.Widen<FluxjectHostServiceProvider<TRegistrations> & Types.InferInstanceTypes<TRegistrations, "singleton"|"transient">>}
     */
    prepare() {
        return /** @type {any} */ (new FluxjectHostServiceProvider(this.#registrations));
    }
}

/**
 * @typedef RegistrationOptions
 * @property {number} priority
 */