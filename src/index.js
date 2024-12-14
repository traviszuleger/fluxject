//@ts-check
/** @import { ExtractRegistrationsFromContainer, InferServiceProvider, HostServiceProvider, ScopedServiceProvider } from "./container.js" */
import { Container } from "./container.js";

/**
 * Infers the type of Service Provider that will be passed into the constructor of a registered service.  
 * 
 * ```js
 * import { container } from "fluxject";
 * import type { InferServiceProvider } from "fluxject";
 * 
 * const container = Container.create()
 *   .register(m => m.singleton("a", createA))
 *   .register(m => m.transient("b", createB))
 *   .register(m => m.scoped("c", createC))
 * 
 * function createA(services: InferServiceProvider<typeof container, "a">) {
 *   services.a; // valid
 *   services.b; // valid
 *   services.c; // invalid
 *   return {};
 * }
 * 
 * function createB(services: InferServiceProvider<typeof container, "b">) {
 *   services.a; // valid
 *   services.b; // valid
 *   services.c; // invalid
 *   return {};
 * }
 * 
 * function createC(services: InferServiceProvider<typeof container, "c">) {
 *   services.a; // valid
 *   services.b; // valid
 *   services.c; // valid
 *   return {};
 * }
 * ```
 * @template {Container} TContainer
 * The container to infer the service provider from
 * @template {keyof ExtractRegistrationsFromContainer<TContainer>} TKey
 * The service property to use to infer the services for. 
 * @typedef {InferServiceProvider<TContainer, TKey>} InferServiceProvider 
 */

/**
 * Gets the `HostServiceProvider` type associated with `TContainer`.
 * @template {Container} TContainer
 * The container to infer the service provider from
 * @typedef {HostServiceProvider<ExtractRegistrationsFromContainer<TContainer>>} HostServiceProvider
 */

/**
 * Gets the `ScopedServiceProvider` type associated with `TContainer`.
 * @template {Container} TContainer
 * The container to infer the service provider from
 * @typedef {ScopedServiceProvider<ExtractRegistrationsFromContainer<TContainer>>} ScopedServiceProvider
 */

export { 
    Container 
}