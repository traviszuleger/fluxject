# fluxject

Fluxject is a Simple and Strongly-Typed Dependency Injection library, that allows you to register various lifetime services
to be accessed throughout your application.

__`Fluxject` is young in development, and is prone to errors or unexpected behavior.__  
__Please submit bugs and feature requests as an issue on the GitHub page.__

## Table of Contents
- [General Usage Example](#example)
- [Lifetime](#lifetime)
    - [Scoped Services](#scoped)
    - [Singleton Services](#singleton)
    - [Transient Services](#transient)
- [Asynchronous Services](#async)
- [Disposal of Services](#dispose)
    - [Type Safety](#type-safety)

## Example

```js
import type { InferServiceProvider, HostServiceProvider, ScopedServiceProvider } from "fluxject";
import { Container } from "fluxject";
import { createDatabase } from "./my-database-provider.js";

const container = Container.create()
  .register(m => m.singleton({ connectionString: process.env.CONNECTION_STRING }))
  .register(m => m.singleton({ database: createDatabaseProvider }))
  .register(m => m.singleton({ log: createLogProvider }))
  .register(m => m.scoped({ cache: VolatileCache }));

const HostServiceProvider = container.prepare();

function createDatabaseProvider(services: InferServiceProvider<typeof container, "database">) {
    const db = createDatabase(services.connectionString);
    // Don't actually print a connection string in your app
    services.log.info("Created database from " + services.connectionString); 
    return db;
}

function createLogProvider(services: InferServiceProvider<typeof container, "log">) {
    console.log("Created Log Provider");
    return {
        warning: (msg) => {
            console.log(`[W]: ${msg}`);
        },
        info: (msg) => {
            console.log(`[I]: ${msg}`);
        }
    }
}

class VolatileCache {
    constructor(services: services: InferServiceProvider<typeof container, "cache">) {
        services.log.info("Created volatile cache");
    }
}

const database = HostServiceProvider.database;
// CLI will print:
//  Created Log Provider
//  Created database from {someString}
```

## Lifetime

Services can be registered on your container as three different types of Lifetime services:
 - `Scoped`: Lifetime of this service will last as long as it is in scope.
   - Changes to scoped service properties will persist.
 - `Singleton`: Lifetime of this service will last as long as the application is running.
   - Changes to singleton service values and service properties will persist.
 - `Transient`: Lifetime of this service is volatile, and will only last as long as the request.
   - Changes to the transient service properties will persist, but the service itself is not stored on the service provider.

### Scoped

Scoped services can only be accessed from a `ScopedServiceProvider` type, which is returned when you call `.createScope()` on a `HostServiceProvider` type.

Here is an example of creating a `ScopedServiceProvider`:
```js
const hostProvider = /** ... */;

const scopedProvider = hostProvider.createScope();
```

`Scoped` lifetime services will only last as long as the `ScopedServiceProvider` type object remains in scope.  

All services that are called from a scoped service's factory or class constructor have access to the `ScopedServiceProvider`.  
However, it's important to know that only `Scoped` lifetime services have access to other `Scoped` lifetime services.  

Finally, it is worth mentioning that Scoped Services are instantiated only when they are first requested...

Example:

```js
const scopedProvider = hostProvider.createScope();

scopedProvider.foo; // foo is instantiated and stored into its own scope.
scopedProvider.foo; // foo is fetched from its own scope
```

__As of version 1.0.0, this means that the "in" syntax in JavaScript may be inconsistent if the service has not been referenced before__

e.g.,
```js
const scopedProvider = hostProvider.createScope();

const isFooInScope_before = "foo" in scopedProvider;
scopedProvider.foo; // foo is instantiated and stored into its own scope.
const isFooInScope_after = "foo" in scopedProvider;

console.log(isFooInScope_before, isFooInScope_after);
// will print "false true"
```

### Singleton

`Singleton` lifetime services will last as long as the application's lifetime, meaning that once you call `.prepare()`, the singleton service will be instantiated and will remain as such until your programs quits (or, technically, once the return value from `.prepare()` leaves scope)

`Singleton` lifetime services, on instantiation, only have access to other `Singleton` and `Transient` lifetime services.

Here is an example of registering a `Singleton` lifetime service:

```ts
const container = Container.create()
    .register(m => m.singleton({ staticValue: 0 }))
    .register(m => m.singleton({ staticObject: (services: InferServiceProvider<typeof container, "staticObject">) => ({}) }))
    .register(m => m.singleton({ staticClassObject: SingletonService: }));

class SingletonService {
    constructor(services: InferServiceProvider<typeof container, "staticClassObject">) {

    }
}
```

You can alter a singleton's properties (or value if the value passed was a constant value) at any time, and the state of that service (value or object) will persist so long as the `HostServiceProvider` object exists.

```ts
// ...
const hostServiceProvider = container.prepare();
hostServiceProvider.staticValue++;
assert(hostServiceProvider.staticValue === 1);
```

### Transient

`Transient` lifetime services will only last as long as the requested service is in scope, or technically, will be instantiated with every request. The only exception to this rule is when a `Transient` lifetime service is accessed from a `ScopedServiceProvider` object.

`Transient` lifetime services, on instantiation, only have access to other `Singleton` and `Transient` lifetime services.

Here is an example of instantiating a `Transient` lifetime service:  

```ts
const container = Container.create()
    .register(m => m.transient({ Value: 0 }))
    .register(m => m.transient({ Object: (services: InferServiceProvider<typeof container, "Object">) => ({}) }))
    .register(m => m.transient({ ClassObject: TransientService }));

class TransientService {
    constructor(services: InferServiceProvider<typeof container, "ClassObject">) {
        console.log(`Created TransientService!`)
    }
}
```

And here is an example of how it is used

```js
// ...
const hostProvider = container.prepare();
hostProvider.Value++;
console.log(hostProvider.Value); // will print 0
hostProvider.Object.x = 2;
console.log(hostProvider.Object); // will print {}
hostProvider.TransientService; // will print "Created TransientService!"
hostProvider.TransientService; // will print "Created TransientService!"

// alternatively, if you would like to keep the transient service and its state, you can do this:

const { TransientService } = hostProvider;
// or
const TransientService = hostProvider.TransientService;

// now, TransientService can be used throughout the rest of its own lifetime without it being re-instantiated.
```

## Async

As of v1.1, you can provide factory functions that yield a `Promise` type as a return value (or as a constant value) which can be resolved by `await`ing the `[prepare()]` or `[createScope()]` functions on your container.

__It is important to note that `Transient` lifetime services that return `Promise`s will not be awaited and resolved. `Transient` lifetime services will always return a `Promise` which then must be explicitly awaited.__

### Type Safety

When a registered service returns a `Promise`, Fluxject will infer the return type of the `[prepare()]` and/or the `[createScope()]` functions to correctly be a `Promise` or not. 

The return type will be a `HostServiceProvider` type for `[prepare()]` and `ScopedServiceProvider` type for `[createScope()]` when no asynchronous services are registered under the respective lifetimes.

The return type will be a `Promise<HostServiceProvider>` type for `[prepare()]` and `Promise<ScopedServiceProvider>` type for `[createScope()]` when any asynchronous services are registered under the respective lifetimes.

### Examples

Example of registering an asynchronous `Singleton` service:

```ts
const mySyncSingletonService = () => ({ test: () => `test sync` });
const myAsyncSingletonService = async () => ({ test: () => `test async` });
const container = Container.create()
    .register(m => m.singleton({ mySyncSingletonService }))
    .register(m => m.singleton({ myAsyncSingletonService }));

const unawaitedHostServiceProvider = container.prepare();
// This WILL fail as the type of `unawaitedHostServiceProvider` will actually be a Promise.
console.log(unawaitedHostServiceProvider.mySyncSingletonService.test()); 

// instead... do this!
const awaitedHostServiceProvider = await container.prepare();
console.log(awaitedHostServiceProvider.mySyncSingletonService.test()); // will print "test sync"
console.log(awaitedHostServiceProvider.myAsyncSingletonService.test()); // will print "test async"

// but it's important to know, that if we chose not to have an asynchronous singleton, 
// then nothing will change from the original behavior of Fluxject pre v1.1
// (AND it's strongly typed-- the return type will be inferred as a Promise, only if an Async Singleton Service was registered)
const nonAsyncContainer = Container.create()
    .register(m => m.singleton({ mySyncSingletonService }));

const hostServiceProvider = container.prepare();
hostServiceProvider.mySyncSingletonService.test(); // will print "test sync"
```

Example of registering an asynchronous `Transient` service:

```js
const mySyncTransientService = () => ({ test: () => `test sync` });
const myAsyncTransientService = async () => ({ test: () => `test async` });
const container = Container.create()
    .register(m => m.transient({ mySyncTransientService }))
    .register(m => m.transient({ myAsyncTransientService }));

// Since Transient services are instantiated on demand, 
// there is no way for [.prepare()] to resolve the returned Promises from Transient services
const hostServiceProvider = container.prepare();

// so, as you would expect, the return type from these instantiated Transient services will be a Promise
const test = await hostServiceProvider.myAsyncTransientService;
test();
// or
(await hostServiceProvider.myAsyncTransientService).test(); // will print "test async"
// just remember, that every time you de-reference an asynchronous Transient service from the service provider
// you must await the returned value, as Transient services are always instantiated on demand, meaning a brand new Promise will always be returned.

// and thus, synchronous Transient services will have the same behavior as pre v1.1 of Fluxject
hostServiceProvider.mySyncTransientService.test(); // will print "test sync" 
```

Example of registering an asynchronous `Scoped` service:

```js
const mySyncScopedService = () => ({ test: () => `test sync` });
const myAsyncScopedService = async () => ({ test: () => `test async` });
const container = Container.create()
    .register(m => m.singleton({ mySyncSingletonService: () => `test singleton sync` }))
    .register(m => m.scoped({ mySyncScopedService }))
    .register(m => m.scoped({ myAsyncScopedService }));

const unawaitedHostServiceProvider = container.prepare();
// This is still valid! We did not register any asynchronous Singleton services, so [prepare()] will not return a Promise. 
console.log(unawaitedHostServiceProvider.mySyncSingletonService.test()); // will print "test singleton sync"

// but, since we have asynchronous Scoped variables...

const unawaitedScopedServiceProvider = unawaitedHostServiceProvider.createScope();

// This WILL fail, since the [createScope()] function will return a Promise.
unawaitedScopedServiceProvider.test(); // error

// instead... do this!
const awaitedScopedServiceProvider = await container.createScope();
console.log(awaitedHostServiceProvider.mySyncScopedService.test()); // will print "test sync"
console.log(awaitedHostServiceProvider.myAsyncScopedService.test()); // will print "test async"

// and just like Singleton services, if no asynchronous Scoped service was provided, then the return type of [createScope()]
// will not be a Promise

const nonAsyncContainer = Container.create()
    .register(m => m.scoped({ mySyncScopedService }));

const hostServiceProvider = nonAsyncContainer.prepare();
const scopedServiceProvider = hostServiceProvider.createScope();
console.log(scopedServiceProvider.mySyncScopedService.test()); // will print "test sync"
```

## Dispose

As of v1.1, you can provide the pre-defined `Symbol.dispose` or `Symbol.asyncDispose` on a service that can be disposed at any given time if you call the `[dispose()]` on the service provider you are intending to dispose of.  

Both a `HostServiceProvider` and `ScopedServiceProvider` will have the `[dispose()]` function. When the `[dispose()]` function is called on the `HostServiceProvider`, All `Singleton` services will be disposed  

This functionality allows for easy clean-up of Singleton and Scoped services without having to explicitly clean up the service yourself.

__Please note that this functionality ONLY exists for Singleton and Scoped services, there is unfortunately no way of knowing when a Transient service has left scope without the usage of TypeScript's `using` keyword.__

### Type Safety

When a registered service has the `[Symbol.asyncDispose]` unique symbol defined on the return type of the service, Fluxject will infer the return type for `[dispose()]` function to correctly be a Promise or not.

The return type of `<HostServiceProvider>.dispose()` will be `void` when no registered `Singleton` services have the `[Symbol.asyncDispose]` function defined on them.  

The return type of `<HostServiceProvider>.dispose()` will be `Promise<void>` when at least one registered `Singleton` service has the `[Symbol.asyncDispose]` function defined on them.

The return type of `<ScopedServiceProvider>.dispose()` will be `void` when no registered `Scoped` services have the `[Symbol.asyncDispose]` function defined on them.  

The return type of `<ScopedServiceProvider>.dispose()` will be `Promise<void>` when at least one registered `Scoped` service has the `[Symbol.asyncDispose]` function defined on them.

### Examples

Example of adding `[Symbol.dispose]` on a `Singleton` service:

```js
const mySingletonService = () => ({ [Symbol.dispose]: () => console.log(`disposed mySingletonService`) });
const container = Container.create()
    .register(m => m.singleton({ mySingletonService }));

const hostServiceProvider = container.prepare();
hostServiceProvider.dispose();
// will print "disposed mySingletonService"
```

Example of adding `[Symbol.asyncDispose]` on a `Singleton` service:

```js
const mySingletonService = () => ({ [Symbol.asyncDispose]: async () => console.log(`asynchronously disposed mySingletonService`) });
const container = Container.create()
    .register(m => m.singleton({ mySingletonService }));

const hostServiceProvider = container.prepare();
const returnedValue = hostServiceProvider.dispose();

if("then" in returnedValue) {
    await returnedValue;
    // will print "asynchronously disposed mySingletonService"
    console.log(`All done disposing!`);
    // will print "All done disposing!"
}
```

Example of adding `[Symbol.dispose]` on a `Scoped` service:

```js
const myScopedService = () => ({ [Symbol.dispose]: () => console.log(`disposed myScopedService`) });
const container = Container.create()
    .register(m => m.scoped({ myScopedService }));

const hostServiceProvider = container.prepare();
hostServiceProvider.dispose();
// nothing will print, the [dispose()] function on the hostServiceProvider will only dispose of Singleton services.

const scopedServiceProvider = hostServiceProvider.createScope();
scopedServiceProvider.dispose();
// will print "disposed myScopedService"
```

Example of adding `[Symbol.asyncDispose]` on a `Scoped` service:

```js
const myScopedService = () => ({ [Symbol.dispose]: () => console.log(`asynchronously disposed myScopedService`) });
const container = Container.create()
    .register(m => m.scoped({ myScopedService }));

const hostServiceProvider = container.prepare();
hostServiceProvider.dispose(); // return type will be void
// nothing will print, the [dispose()] function on the hostServiceProvider will only dispose of Singleton services.

const scopedServiceProvider = hostServiceProvider.createScope();
const returnedValue = scopedServiceProvider.dispose();
// will print "disposed myScopedService"

if("then" in returnedValue) {
    await returnedValue;
    // will print "asynchronously disposed myScopedService"
    console.log(`All done disposing!`);
    // will print "All done disposing!"
}
```