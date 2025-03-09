//@ts-check
/** @import * as Types from "./types.js" */
import { RegistrationBuilder } from "./builder.js";
import { FluxjectHostServiceProvider } from "./provider.js";

/**
 * Container that manages registrations of dependencies.
 * @template {Record<string, Types.Registration<any, any>>} TRegistrations
 * All registrations that have been made on this container.
 */
export class Container {
    #registrations;

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
    }

    /**
     * Register a new set of dependencies to the container 
     * @template {Record<string, Types.Registration<any, any>>} TNewRegistrations
     * The new registrations as inferred from the return type of the callback.
     * @param {(serviceBuilder: RegistrationBuilder) => TNewRegistrations} callback
     * The callback that will be used to register new services.
     * @returns {Container<TRegistrations & TNewRegistrations>}
     * A new container with the new registrations added.
     */
    register(callback) {
        const registrations = callback(new RegistrationBuilder());
        
        return new Container({
            ...this.#registrations,
            ...registrations
        });
    }

    /**
     * Prepare the container for consumption.
     * @returns {Types.Widen<FluxjectHostServiceProvider<TRegistrations> & Types.InferInstanceTypes<TRegistrations, "singleton"|"transient">>}
     */
    prepare() {
        return /** @type {any} */ (new FluxjectHostServiceProvider(this.#registrations));
    }
}