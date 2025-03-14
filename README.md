# Fluxject

Fluxject is an Inversion of Control (IoC) container library that manages the access and lifetime of registered dependencies.  

## Table of Contents
- [Pre-requisites](#prerequisites)
- [Quick Start](#quick-start)
  - [TypeScript](#typescript)
  - [JSDOC](#jsdoc)
- [Installation](#installation)
- [Injected Dependencies](#injected-dependencies)
- [Lazy Reference](#lazy-reference)
- [Scoped](#scoped)
- [Singleton](#singleton)
- [Transient](#transient)
- [Disposal](#disposal)
- [Utility](#utility)
- [Troubleshooting](#troubleshooting)
  - [Circular Dependencies](#circular-dependencies)
- [Contributing](#contributing)
- [Credits](#credits)
- [Authors](#authors)
- [License](#license)

## Prerequisites

This project requires NodeJS (version 18 or later) and NPM.
[Node](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.
To make sure you have them available on your machine,
try running the following command.

```sh
$ npm -v && node -v
9.67
v18.17.1
```

# Installation

To install and set up the library, run:

```sh
$ npm install fluxject
```

# Quick Start

## TypeScript  

```ts
import { fluxject } from "fluxject";
import type { InferServiceProvider } from "fluxject";

const container = fluxject()
    .register(m => m.singleton({
        // Singleton Services declared here
        // singleton: SingletonService
    }))
    .register(m => m.transient({
        // Transient Services declared here
        // transient: TransientService
    }))
    .register(m => m.scoped({
        // Scoped Services declared here
        // transient: ScopedService
    }));

const provider = container.prepare();
// your startup code here:

class MyService {
    
    constructor({}: InferServiceProvider<typeof container, "myService">) {
        
    }

    [Symbol.dispose]() {
        // dispose synchronously here.
    }

    async [Symbol.asyncDispose]() {
        // dispose asynchronously here.
    }

}
```

## JSDOC

```js
/** @import { InferServiceProvider } from "fluxject"; */
import { fluxject } from "fluxject";

const container = fluxject()
    .register(m => m.singleton({
        // Singleton Services declared here
        // singleton: SingletonService
    }))
    .register(m => m.transient({
        // Transient Services declared here
        // transient: TransientService
    }))
    .register(m => m.scoped({
        // Scoped Services declared here
        // transient: ScopedService
    }));

const provider = container.prepare();
// your startup code here:

class MyService {
    
    /**
     * @param {InferServiceProvider<typeof container, "myService">} services
     */
    constructor({}) {
        
    }

    [Symbol.dispose]() {
        // dispose synchronously here.
    }

    async [Symbol.asyncDispose]() {
        // dispose asynchronously here.
    }

}
```

# Injected Dependencies

Dependencies that are injected into each service (the first argument that is passed into a constructor) can have the type inferred using the `InferServiceProvider` type.  

The behavior of the injected services are dictated by a class, `LazyReference`. This type is completely invisible from the user, but it acts as your instance in its place. This class works off a `Proxy` that traps all property accessors and decides whether or not the service should be instantiated.

Each provider has the following services with the registered types:
| Provider Type | Scoped | Singleton | Transient |
| ------------: | :----: | :-------: | :-------: |
|      Host     |        |    &check;    |    &check;    |
|     Scoped    |   &check;  |    &check;    |    &check;    |

# Lazy Reference

A `LazyReference` is a type that remains completely invisible to the consumer of this library. That is because the actual types that are returned to you and are widened, so the value is more easily discernible.

The expected behavior of the `LazyReference` object remains the same as the instance it is referencing. This is done through the built-in `Proxy` class. The traps for the Proxy class will dictate if the actual instance should be instantiated, and if the service is a transient, it will dispose of it immediately after.

# Scoped

Scoped services should maintain its reference through the length of a request. (e.g., setting locals in an express middleware)  

You can expect a scoped service to maintain all of its state, however modified, starting from the invocation of `.createScope()`, all the way until the `.dispose()` function is called.  

The `.dispose()` function on the host provider can also be called to dispose of all scoped services.

> __WARNING__  
> __Potential Memory Leaks__: Since the Host Service Provider holds a reference to all declared scopes, then scoped service providers that are not disposed of will be leaked into memory.  
> __Order of Disposal__: The order of disposal on all services should not be relied on, but in general they will be in the order that you registered the objects in. It is important to not have the disposal of your service depend on any other scoped services. (Singleton/Transients will still be reliably available)

The inferred service provider using the provided `InferServiceProvider` type will yield an interface that contains all of your services (not including itself) (as `LazyReference`s) that you have registered with its appropriate instance. 

A scoped service can be added using one of the following methods:
  - `.addScope<TService, TServiceName>(TServiceName, TService)`: Will add a single scoped dependency, given the `TServiceName` and `TService, under the disposal priority determined by fluxject.
  - `.addScopes<TServices>(TServices)`: Will add multiple scoped dependencies given an object, `TServices`, under the disposal priority determined by fluxject.

## Usage

```ts
interface IDatabaseProvider {

}
class MyDatabase implements IDatabaseProvider {};

// Passing a generic parameter is optional, otherwise it is inferred by the type of the second parameter.
//   This is true for all `Container` methods.
const container = fluxject()
    .addScope<IDatabaseProvider>("database", MyDatabase)
    .addScopes({
        redis: Redis,
        files: FileManager
    })
```

# Singleton

Singleton services are expected to last for the entire life of the application.

You can expect a singleton service to maintain all of its state, however modified, starting from the invocation of `.prepare()`, all the way until the `.dispose()` function is called.

The inferred service provider using the provided `InferServiceProvider` type will yield an interface that only contains the services that have been registered as `Transient` or `Singleton` (not including itself) (as `LazyReference`s) that you have registered with its appropriate instance.

A singleton service can be added using one of the following methods:
  - `.addSingleton<TService, TServiceName>(TServiceName, TService)`: Will add a single singleton dependency, given the `TServiceName` and `TService, under the disposal priority determined by fluxject.
  - `.addSingletons<TServices>(TServices)`: Will add multiple singleton dependencies given an object, `TServices`, under the disposal priority determined by fluxject.

## Usage

```ts
interface IDatabaseProvider {

}
class MyDatabase implements IDatabaseProvider {};

// Passing a generic parameter is optional, otherwise it is inferred by the type of the second parameter.
//   This is true for all `Container` methods.
const container = fluxject()
    .addSingleton<IDatabaseProvider>("database", MyDatabase)
    .addSingletons({
        redis: Redis,
        files: FileManager
    })
```

# Transient

Transient services will only last as long as it was requested for. (e.g., a single property access)

You can expect a transient service to always be in the state that it is in immediately after instantiation. Transients are completely stateless, and should never expect to be changed or be different in any capacity. Once the property value has been retrieved, (functions and promises are handled) then that service will be disposed of.

> __CAUTION__  
> Transient services should be services that are infrequently called. They are important for completing a single request of its instance. If you find the need to declare it as a disposable, then you should consider converting the service into a `Singleton` or `Scoped` service.

A transient service can be added using one of the following methods:
  - `.addTransient<TService, TServiceName>(TServiceName, TService)`: Will add a single singleton dependency, given the `TServiceName` and `TService, under the disposal priority determined by fluxject.
  - `.addTransients<TServices>(TServices)`: Will add multiple singleton dependencies given an object, `TServices`, under the disposal priority determined by fluxject.

## Usage

```ts
interface IDatabaseProvider {

}
class MyDatabase implements IDatabaseProvider {};

// Passing a generic parameter is optional, otherwise it is inferred by the type of the second parameter.
//   This is true for all `Container` methods.
const container = fluxject()
    .addTransient<IDatabaseProvider>("database", MyDatabase)
    .addTransients({
        redis: Redis,
        files: FileManager
    })
```

# Disposal

`Scoped` services are disposed of when the `.dispose()` function on the `ScopedServiceProvider` is invoked. `Scoped` services under that provider will be disposed of in __reverse order of how the dependency was registered__. Additionally, if the `.dispose()` function on the `HostServiceProvider` is invoked, then all `ScopedServiceProvider`s that were derived from the host provider will be disposed of first, then the remaining `Singleton` services.

`Singleton` services are disposed of when the `.dispose()` function on the `HostServiceProvider` is invoked. Their disposal occurs after all derived `ScopedServiceProvider`s have completed their disposal. `Singleton` services under the host provider will be disposed of in __reverse order of how the dependency was registered__.

`Transient` services are an on-demand service, meaning they will be instantiated, utilized, then disposed of immediately after the requested action has been completed.

__Services will only be disposed of if they were instantiated__

## Example

```ts
class A {
    [Symbol.dispose]() {
        console.log("Disposed A");     
    }
}

class B {
    [Symbol.dispose]() {
        console.log("Disposed B");
    }
}

class C {
    [Symbol.dispose]() {
        console.log("Disposed C");
    }
}

class D {
    [Symbol.dispose]() {
        console.log("Disposed D");
    }
}

const container = fluxject()
    .addScope("c", C)
    .addScope("d", D, { priority: -1 })
    .addSingleton("a", A)
    .addTransient("b", B)

const provider1 = container.prepare();

// services must be instantiated, so therefore, this `.dispose()` invocation does nothing.
console.log("provider1 dispose");
provider1.dispose();

const provider2 = container.prepare();
const scope1 = provider2.createScope();
provider2.a.toString(); // done so `A` gets instantiated.
scope1.c.toString(); // done so `C` gets instantiated.

console.log("scope1 dispose");
scope1.dispose();

const scope2 = provider2.createScope();
scope2.c.toString(); // done so `C` gets instantiated.
scope2.d.toString(); // done so 'D' gets instantiated.

console.log(`transient de-reference`);
provider2.b.toString();

console.log("provider2 dispose");
provider2.dispose();
```

The above program will print the following:

```
provider1 dispose
scope1 dispose
Disposed C
transient de-reference
Disposed B
provider2 dispose
Disposed D
Disposed C
Disposed A
```

If the `{ priority: -1 }` is removed from the declared dependency, `D`, then the output would look like the following:

```
provider1 dispose
scope1 dispose
Disposed C
transient de-reference
Disposed B
provider2 dispose
Disposed C # notice C got disposed before D
Disposed D
Disposed A # singletons always dispose last.
```

# Utility

Fluxject offers the following utility functions under the following `fluxject/util` sub-directive.
  - `extract<T>(T)`: Extracts the actual instance (and instantiates if necessary) from the given service, removing the underlying `LazyReference` proxy. __Use this function with care, as it is an experimental feature and may lead to unpredictable results__
  - `isExtracted(object)`: Returns true if the service has been extracted from a `LazyReference`. (In actuality, it only checks if `object` is an `instanceof` `LazyReference`.)

# Troubleshooting 

## Circular Dependencies

Services being lazily instantiated will mitigate the chance of circular dependencies, but that doesn't mean there is a zero percent change you can get them. If your service is causing a `CircularDependencyError`, then you must circle back to the service in question and see how it interacts with your other services.  

Here is an example of what might cause a circular dependency.

```js
import { fluxject } from "fluxject"();

class ServiceA {
    value = "Hello";
    #serviceBValue;

    constructor({ serviceB }) {
        this.#serviceBValue = serviceB.value;
    }

    toString() {
        return this.value + " " + this.#serviceBValue;
    }
}

class ServiceB {
    value = "World";
    #serviceAValue;

    constructor({ serviceA }) {
        this.#serviceAValue = serviceA.value;
    }

    toString() {
        return this.#serviceAValue + " " + this.value;
    }
}

const container = fluxject()
  .register(m => m.singleton({ serviceA: ServiceA, serviceB: ServiceB }));

const provider = container.prepare();

// ERROR! this line would trigger a "CircularDependencyError" to be thrown.
console.log(provider.serviceA.toString());
// This would also cause a "CircularDependencyError"
console.log(provider.serviceB.toString());
```

Since services are lazily instantiated, the initial circular dependency error wouldn't be thrown until you explicitly use either `serviceA` or `serviceB`. Once you use either of the services for the first time, the respective service would be instantiated. Since `ServiceA` attempts to get `ServiceB`'s `value` property, the construction of `ServiceA` would also trigger the construction of `ServiceB`. Since `ServiceA` will not have finished construction by the time `ServiceB` is instantiated, then `ServiceB`'s attempt to access `ServiceA`'s `value` property would trigger another instantiation of `ServiceA`, and so on...  

While the above case might be trivial, some circular dependencies are harder to detect. Fluxject attempts to give you as much information as possible if a `CircularDependencyError` is thrown. If one occurs, you should expect the stack trace leading up to the constructor or factory method in question.

To resolve a circular dependency error, while keeping the same behavior, like the above example, you could do the following:

```js
import { fluxject } from "fluxject"();

class ServiceA {
    value = "Hello";
    #serviceB;

    constructor({ serviceB }) {
        this.#serviceB = serviceB
    }

    toString() {
        return this.value + " " + this.#serviceB.value;
    }
}

class ServiceB {
    value = "World";
    #serviceA;

    constructor({ serviceA }) {
        this.#serviceA = serviceA;
    }

    toString() {
        return this.#serviceA.value + " " + this.value;
    }
}

const container = fluxject()
  .register(m => m.singleton({ serviceA: ServiceA, serviceB: ServiceB }));

const provider = container.prepare();

// Would print: "Hello World"
console.log(provider.serviceA.toString());
```

The above method defers the instantiation of either class until they are explicitly used, so `ServiceA` would be constructed when it gets its first property access `toString` and `ServiceB` would be constructed next triggered by the property access `this.#serviceB.value`, but at the point that code is executed, `serviceA` will have been instantiated and ready to access, so `serviceB` can safely finish its construction.

> __NOTE__  
> Even just deferring property accessors until after construction in any single service within the circular dependency should resolve this issue. You do not have to do it for all, like how the above example does it.

# Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

1.  Fork it!
2.  Create your feature branch: `git checkout -b my-new-feature`
3.  Add your changes: `git add .`
4.  Commit your changes: `git commit -am 'Add some feature'`
5.  Push to the branch: `git push origin my-new-feature`
6.  Submit a pull request :sunglasses:

# Credits

A lot of inspiration for the idea behind this project is drawn from [Awilix](https://github.com/jeffijoe/awilix) as well as [.NET Dependency Injection](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection).

The goal behind this project is to provide a reliable and type-safe library to TypeScript (targeting JSDOC) users.

# Authors

**Travis R. Zuleger** - *Creator and Maintainer of the Project* - [traviszuleger](https://github.com/traviszulege)

See also the list of [contributors](https://github.com/traviszuleger/fluxject/contributors) who participated in this project.

# License

[MIT License](https://andreasonny.mit-license.org/2019) © Travis Zuleger