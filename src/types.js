//@ts-check
/** @import { Container } from "./container.js" */

/**
 * @template T
 * @typedef {((...args: any) => T)|(new (...args: any) => T)} Instantiator
 */

/**
 * @template TInstanceType
 * @template {"scoped"|"transient"|"singleton"} TLifetime
 * @typedef Registration
 * @prop {TLifetime} lifetime
 * @prop {Instantiator<TInstanceType>} factory
 */

/**
 * @template T
 * @typedef {T extends infer U ? {[K in keyof U]: U[K] } : never} Widen
 */

/**
 * @template TInstantiator
 * @typedef {TInstantiator extends (new (...args: any) => any) ? InstanceType<TInstantiator> : TInstantiator extends ((...args: any) => any) ? ReturnType<TInstantiator> : never} Resolved
 */

/**
 * @template {Record<string, Registration<any,any>>} TRegistrations
 * @template {"scoped"|"transient"|"singleton"} [TLifetime="scoped"|"transient"|"singleton"]
 * @typedef {{[K in keyof TRegistrations as TRegistrations[K] extends Registration<any,TLifetime> ? K : never]: TRegistrations[K] extends Registration<infer TInstantiator, any> ? Resolved<TInstantiator> : never}} InferInstanceTypes
 */

/**
 * @template {Container} TContainer
 * @typedef {TContainer extends Container<infer TRegistrations> ? TRegistrations : never} InferRegistrationsFromContainer
 */

export default {};