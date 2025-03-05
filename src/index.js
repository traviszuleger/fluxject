//@ts-check
/** @import * as Types from "./types.js" */

import { addPolyfills, needsPolyfills } from "./polyfills.js";
import { FluxjectHostServiceProvider, FluxjectScopedServiceProvider } from "./provider.js";
import { Container } from "./container.js";

if(needsPolyfills()) {
    addPolyfills();
}

/**
 * Create a new Fluxject Container for managing dependencies.
 * 
 * @example
 * import { fluxject } from "fluxject";
 * import type { InferServiceProvider } from "fluxject";
 * const container = fluxject()
 *    .register(m => m.singleton({ myService: MyService }))
 *    .register(m => m.scoped({ myScopedService: MyScopedService }))
 *    .register(m => m.transient({ myTransientService: MyTransientService }));
 * 
 * const provider = container.prepare();
 * provider.myService.doSomething();
 * // CLI prints "doing something else!"
 * const scope = provider.createScope();
 * scope.myScopedService.doScopedSomething();
 * // CLI prints "doing something else!"
 * 
 * class MyService {
 *   
 *   constructor({ myTransientService }: InferServiceProvider<typeof container, "myService">) {
 *     this.myTransientService = myTransientService;
 *   }
 * 
 *   doSomething() {
 *     this.myTransientService.doSomethingElse();
 *   }
 * }
 * 
 * class MyTransientService() {
 *   doSomethingElse() {
 *     console.log("doing something else!");
 *   }
 * }
 * 
 * class MyScopedService() {
 *   constructor({ myService, myTransientService }: InferServiceProvider<typeof container, "myScopedService">) {
 *     this.myService = myService;
 *     this.myTransientService = myTransientService;
 *   }
 * 
 *   doScopedSomething() {
 *     this.myService.doSomething();
 *   }
 * }
 */
export function fluxject() {
    return Container.create();
}

export { Container };

/**
 * Infer the correct service provider that would be passed into the instantiator for the given `TServiceName` from `TContainer`.
 * ```ts
 * const container = fluxject()
 *   .register(m => m.singleton({ myService: MyService }));
 * class MyService {
 *   constructor(services: InferServiceProvider<typeof container, "myService">) { }
 * }
 * ```
 * @template {Container} TContainer
 * Container that holds the service to infer the provider for.
 * @template {keyof Types.InferRegistrationsFromContainer<TContainer>} TServiceName
 * The name of the service that is using this service provider.
 * @typedef {Types.InferRegistrationsFromContainer<TContainer>[TServiceName] extends Types.Registration<*, "scoped"> 
*   ? Types.Widen<Omit<(FluxjectScopedServiceProvider & Types.InferInstanceTypes<Types.InferRegistrationsFromContainer<TContainer>>), TServiceName|"dispose">>
*   : Types.Widen<Omit<(FluxjectHostServiceProvider<Types.InferRegistrationsFromContainer<TContainer>> & Types.InferInstanceTypes<Types.InferRegistrationsFromContainer<TContainer>, "singleton"|"transient">), TServiceName|"createScope"|"dispose">>
* } InferServiceProvider
*/

/**
 * Infer the Host Service Provider type that would be returned from a container's `prepare` method.
 * @template {Container} TContainer
 * Container to infer the host service provider from
 * @typedef {ReturnType<HostServiceProvider<TContainer>['createScope']>} ScopedServiceProvider
 */

/**
 * Infer the Scoped Service Provider type that would be returned from a `HostServiceProvider`'s `createScope` method.
 * @template {Container} TContainer
 * Container to infer the scoped service provider from
 * @typedef {ReturnType<TContainer['prepare']>} HostServiceProvider
 */

/**
 * Can be used to infer the abstract type of a class or factory function.  
 * 
 * This would ensure that the type of service inferred by container injection is 
 * of a parent type of the actual service.
 * ```ts
 * import { fluxject } from "fluxject";
 * import type { Abstract } from "fluxject";
 * 
 * interface IService {
 *   test: string;
 * }
 * 
 * class MyService {
 *   hello = "hello";
 *   world = "world";
 * }
 * 
 * const provider = fluxject()
 *   .register(m => m.singleton({ myService: MyService as Abstract<IService> }))
 *   .prepare();
 * 
 * provider.myService.hello; // OK
 * provider.myService.world; // TypeScript Error: Property 'world' does not exist on type 'IService'
 * ```
 * @template TInterface
 * @typedef {Types.Instantiator<TInterface>} Abstract
 */

/**
 * Can be used to infer the abstract type of a class or factory function.  
 * 
 * This would ensure that the type of service inferred by container injection is 
 * of a parent type of the actual service. 
 * 
 * __NOTE:__ This is a type-only function and does not have any runtime effect.
 * ```ts
 * import { fluxject, abstract } from "fluxject";
 * 
 * interface IService {
 *   test: string;
 * }
 * 
 * class MyService {
 *   hello = "hello";
 *   world = "world";
 * }
 * 
 * const provider = fluxject()
 *   .register(m => m.singleton({ myService: abstract<IService>(MyService)}))
 *   .prepare();
 * 
 * provider.myService.hello; // OK
 * provider.myService.world; 
 * // TypeScript Error: Property 'world' does not exist on type 'IService'
 * ```
 * @template TInterface
 * @template [TImplementedType=TInterface]
 * @param {Types.Instantiator<TImplementedType>} registration 
 * @returns {Abstract<TInterface>}
 */
export function abstract(registration) {
    return /** @type {any} */ (registration);
}