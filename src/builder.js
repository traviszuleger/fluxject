//@ts-check
/** @import * as Types from "./types.js" */

export class RegistrationBuilder {

    /**
     * Register a new set of dependencies with the lifetime of "scoped".
     * @template {Record<string, Types.Instantiator<any>>} TInstantiators
     * Inferred instantiators from `newRegistrations`
     * @param {TInstantiators} newRegistrations
     * An object containing the new registrations to add, where the values are class constructors or factory functions.
     * @returns {{[K in keyof TInstantiators]: Types.Registration<TInstantiators[K], "scoped">}}
     * A new set of registrations with the lifetime of "scoped".
     */
    scoped(newRegistrations) {
        /** @type {any} */
        let registrations = {};
        for(const key in newRegistrations) {
            registrations[key] = {
                lifetime: "scoped",
                factory: newRegistrations[key]
            };
        }
        return registrations;
    }

    /**
     * Register a new set of dependencies with the lifetime of "singleton".
     * @template {Record<string, Types.Instantiator<any>>} TInstantiators
     * Inferred instantiators from `newRegistrations`
     * @param {TInstantiators} newRegistrations 
     * An object containing the new registrations to add, where the values are class constructors or factory functions.
     * @returns {{[K in keyof TInstantiators]: Types.Registration<TInstantiators[K], "singleton">}}
     * A new set of registrations with the lifetime of "singleton".
     */
    singleton(newRegistrations) {
        /** @type {any} */
        let registrations = {};
        for(const key in newRegistrations) {
            registrations[key] = {
                lifetime: "singleton",
                factory: newRegistrations[key]
            };
        }
        return registrations;
    }
    
    /**
     * Register a new set of dependencies with
     * @template {Record<string, Types.Instantiator<any>>} TInstantiators
     * Inferred instantiators from `newRegistrations`
     * @param {TInstantiators} newRegistrations 
     * An object containing the new registrations to add, where the values are class constructors or factory functions.
     * @returns {{[K in keyof TInstantiators]: Types.Registration<TInstantiators[K], "transient">}}
     * A new set of registrations with the lifetime of "transient".
     */
    transient(newRegistrations) {
        /** @type {any} */
        let registrations = {};
        for(const key in newRegistrations) {
            registrations[key] = {
                lifetime: "transient",
                factory: newRegistrations[key]
            };
        }
        return registrations;
    }
}