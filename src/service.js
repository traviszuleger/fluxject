//@ts-check
/** @import { Container } from "./container.js" */
/** @import { InferRegistrationsFromContainer, InferServiceProvider } from "./types.js" */

import { randomUUID } from "crypto";

/** @type {unique symbol} */
export const FLUXJECT_ID = Symbol("fluxject-id");

/**
 * Basic service that sets a unique uuid as a protected member and all available services from `TContainer` (excluding this service)
 * ```ts
 * class MyService extends Service<typeof container, "test"> {
 * 
 *   myFunction() {
 *     console.log(this.services.x); // will print 55
 *   }
 * 
 * }
 * 
 * const container = Container
 *   .create()
 *   .register(m => m.singleton({ x: 55 }))
 *   .register(m => m.singleton({ test: MyService }));
 * ```
 * @template {Container} TContainer
 * Container type to infer services from
 * @template {Services<TContainer>} TServiceKey
 * Registered service name on the container. (This should be the same name as what it the class is registered as on your container.)
 */
export class Service {
    /** @protected */
    [FLUXJECT_ID] = randomUUID();
    /** @protected */
    services;

    /**
     * @param {InferServiceProvider<TContainer, TServiceKey>} services 
     */
    constructor(services) {
        this.services = services;
        Object.defineProperty(this, FLUXJECT_ID, { writable: false });
    }
}

/**
 * Type that extracts all registered Service Names from a Container instance.
 * ```ts
 * const container = Container
 *   .create()
 *   .register(m => m.singleton({ test: 5 }));
 * 
 * const x: Services<typeof container> = ""; // invalid
 * const y: Services<typeof container> = "test"; // valid
 * ```
 * @template {Container} TContainer
 * @typedef {keyof InferRegistrationsFromContainer<TContainer>} Services
 */

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
 * @template {Services<TContainer>} TServiceName
 * The service property to use to infer the services for. 
 * @typedef {InferServiceProvider<TContainer, TServiceName>} InferServiceProvider 
 */