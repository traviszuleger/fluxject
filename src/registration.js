//@ts-check
/** @import { Resolved, ClassType, FactoryType, StaticType } from "./types.js" */
import { Lifetime } from "./types.js";
import { getInstantiateFunction } from "./util.js"


export class RegistrationProvider {
    /**
     * @template {{[serviceName: string]: ClassType|FactoryType|StaticType}} TRegistrations
     * @param {TRegistrations} userRegistrations 
     * @returns {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K, "Scoped">}}
     */
    scoped(userRegistrations) {
        const registrations = Object.fromEntries(
            Object.entries(userRegistrations)
                .map(([serviceName, instantiator]) => [serviceName, ({
                    name: serviceName,
                    type: Lifetime.Scoped,
                    instantiate: getInstantiateFunction(instantiator)
                })])
            );
        return /** @type {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K & string, "Scoped">}} */ (registrations);
    }

    /**
     * @template {{[serviceName: string]: ClassType|FactoryType|StaticType}} TRegistrations
     * @param {TRegistrations} userRegistrations 
     * @returns {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K, "Singleton">}}
     */
    singleton(userRegistrations) {
        const registrations = Object.fromEntries(
            Object.entries(userRegistrations)
                .map(([serviceName, instantiator]) => [serviceName, ({
                    name: serviceName,
                    type: Lifetime.Singleton,
                    instantiate: getInstantiateFunction(instantiator)
                })])
            );
        return /** @type {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K & string, "Singleton">}} */ (registrations);
    }

    /**
     * @template {{[serviceName: string]: ClassType|FactoryType|StaticType}} TRegistrations
     * @param {TRegistrations} userRegistrations 
     * @returns {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K, "Transient">}}
     */
    transient(userRegistrations) {
        const registrations = Object.fromEntries(
            Object.entries(userRegistrations)
                .map(([serviceName, instantiator]) => [serviceName, ({
                    name: serviceName,
                    type: Lifetime.Transient,
                    instantiate: getInstantiateFunction(instantiator)
                })])
            );
        return /** @type {{[K in keyof TRegistrations]: Registration<TRegistrations[K], K & string, "Transient">}} */ (registrations);
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
 * @prop {TName} name
 * Name of the registered service.
 * @prop {(services: any) => Resolved<T>} instantiate
 */