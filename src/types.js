//@ts-check
/** @import { Container } from "./container.js" */
/** @import { Registration } from "./registration.js" */

import { TimeSpan } from "unitspan";

/** @type {unique symbol} */
export const FLUXJECT_ID = Symbol("fluxject-id");
/** @type {unique symbol} */
export const FLUXJECT_UPTIME = Symbol("fluxject-uptime");
/** @type {unique symbol} */
export const FLUXJECT_LIFETIME = Symbol("fluxject-lifetime");

export const FluxjectProperties = {
    Id: FLUXJECT_ID,
    Uptime: FLUXJECT_UPTIME,
    Lifetime: FLUXJECT_LIFETIME
};

/**
 * Various hidden symbol properties that describe the Service being used.
 * @typedef { { [K in typeof FLUXJECT_ID]: `${string}-${string}-${string}-${string}-${string}` } 
 *   & { [K in typeof FLUXJECT_UPTIME]: TimeSpan }
 * } FluxjectProperties
 */

/**
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef FluxjectCreateScopeObject
 * @prop {() => AnyPromiseScopes<TRegistrationMap> extends never
 *   ? ScopedServiceProvider<TRegistrationMap>
 *   : Promise<ScopedServiceProvider<TRegistrationMap>> 
 * } createScope
 * Initialize a new level of scope from the host service provider.
 */

/**
 * Type representing the `HostServiceProvider` that is intended to be used throughout the lifetime of the application.
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef {Widen<FluxjectCreateScopeObject<TRegistrationMap>
 *   & {[K in keyof OnlyRegistrationsOfLifetime<TRegistrationMap, "Singleton">]: Awaited<Resolved<InferValueFromRegistration<TRegistrationMap[K]>>>}
 *   & {[K in keyof OnlyRegistrationsOfLifetime<TRegistrationMap, "Transient">]: Resolved<InferValueFromRegistration<TRegistrationMap[K]>>}>
 * } HostServiceProvider
 */

/**
 * Type representing the `ScopedServiceProvider` that is returned from the `[createScope()]` function provided in the {@link HostServiceProvider}.
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef {Widen<{[K in keyof TRegistrationMap]: Awaited<Resolved<InferValueFromRegistration<TRegistrationMap[K]>>>}>} ScopedServiceProvider
 */

/**
 * Returns `true` if any registration of the Singleton lifetime in `TRegistrationMap` has an instantiation function that returns a Promise.
 * Otherwise, returns `never`.
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef {Extract<InferValuesFromRegistrationMap<OnlyRegistrationsOfLifetime<TRegistrationMap, "Singleton">>, (...args: any) => Promise> extends never ? never : true} AnyPromiseSingletons
 */

/**
 * Returns `true` if any registration of the Scoped lifetime in `TRegistrationMap` has an instantiation function that returns a Promise.
 * Otherwise, returns `never`.
 * @template {Record<string, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef {Extract<InferValuesFromRegistrationMap<OnlyRegistrationsOfLifetime<TRegistrationMap, "Scoped">>, (...args: any) => Promise> extends never ? never : true} AnyPromiseScopes
 */

/**
 * Infer all values from `TRegistrationMap`, returning all the value types as a union type.
 * @template {Record<String, Registration<any, string, Lifetime>>} TRegistrationMap
 * Dependency registration map as internally defined by Fluxject
 * @typedef {InferValueFromRegistration<TRegistrationMap[keyof TRegistrationMap]>} InferValuesFromRegistrationMap
 */

/**
 * Infer the registration record map type from a given container, `TContainer`.
 * ```ts
 * const container = Container
 *   .create()
 *   .register(m => m.singleton({ database: DatabaseProvider }))
 * 
 * const x: InferRegistrationsFromContainer<typeof container> = {
 *   database: // ...Registration
 * };
 * ```
 * @template {Container} TContainer
 * @typedef {TContainer extends Container<infer TRegistrations> ? TRegistrations : never} InferRegistrationsFromContainer
 */

/**
 * Filter out registrations from `TRegistrations` that are not of the given lifetime `TLifetime` type.
 * ```ts
 * const container = Container
 *   .create()
 *   .register(m => m.scoped({ sc: ScopedProvider }))
 *   .register(m => m.singleton({ si: SingletonProvider }))
 *   .register(m => m.transient({ tr: TransientProvider }))
 * 
 * const x: OnlyRegistrationsOfLifetime<typeof container, "Scoped"> = {
 *   sc: // ...Registration
 * };
 * const y: OnlyRegistrationsOfLifetime<typeof container, "Scoped"|"Transient"> = {
 *   sc: // ...Registration
 *   tr: // ...Registration
 * };
 * ```
 * @template {Record<string, Registration<any,string,Lifetime>>} TRegistrations
 * Registrations to filter from.
 * @template {Lifetime} TLifetime
 * Lifetime type that should be
 * @typedef {{[K in keyof PickValues<{[K in keyof TRegistrations]: InferLifetimeFromRegistration<TRegistrations[K]>}, TLifetime>]: TRegistrations[K]}} OnlyRegistrationsOfLifetime
 */

/**
 * @template {{[key: string]: string}} T
 * @template {any} TValue
 * @typedef {{[K in keyof T as T[K] extends TValue ? K : never]}} PickValues
 */

/**
 * @template {Container} TContainer
 * @template {keyof InferRegistrationsFromContainer<TContainer>} TServiceName
 * @template {InferRegistrationsFromContainer<TContainer>[TServiceName]} [TRegistration=GetRegistrationFromContainer<TContainer, TServiceName>]
 * @typedef {InferLifetimeFromRegistration<TRegistration> extends "Transient"|"Singleton"
 *   ? HostServiceProvider<Omit<InferRegistrationsFromContainer<TContainer>, TServiceName>>
 *     & { createScope: () => Widen<Omit<InferRegistrationsFromContainer<TContainer>, TServiceName>> }
 *   : ScopedServiceProvider<Omit<InferRegistrationsFromContainer<TContainer>, TServiceName>>
 * } InferServiceProvider
 */

/**
* @template T
* @typedef {T extends infer U ? {[K in keyof U]: U[K] } : never} Widen
*/


/**
* @template {Container} TContainer
* @template {keyof InferRegistrationsFromContainer<TContainer>} TKey
* @typedef {InferRegistrationsFromContainer<TContainer>[TKey]} GetRegistrationFromContainer
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
* @typedef {(...args: any) => any|Promise<any>} FactoryType
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
 * Enumerable object for specifying the Lifetime of a registered service.
 */
/** @enum {typeof Lifetime[keyof typeof Lifetime]} */
export const Lifetime = Object.freeze({
    Scoped: "Scoped",
    Singleton: "Singleton",
    Transient: "Transient"
});