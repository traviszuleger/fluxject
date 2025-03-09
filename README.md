[![npm version](https://badge.fury.io/js/angular2-expandable-list.svg)](https://badge.fury.io/js/angular2-expandable-list)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Fluxject

Inversion of Control library that manages the access and lifetime of registered dependencies.

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

## Table of contents

- [Fluxject](#fluxject)
  - [Prerequisites](#prerequisites)
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API](#api)
  - [Contributing](#contributing)
  - [Credits](#credits)
  - [Built With](#built-with)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

# Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

# Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

To install and set up the library, run:

```sh
$ npm install fluxject
```

# Usage

### Serving the app

```sh
$ npm start
```

### Running the tests

```sh
$ npm test
```

### Building a distribution version

```sh
$ npm run build
```

This task will create a distribution version of the project
inside your local `dist/` folder

### Serving the distribution version

```sh
$ npm run serve:dist
```

This will use `lite-server` for servign your already
generated distribution version of the project.

*Note* this requires
[Building a distribution version](#building-a-distribution-version) first.

# API

- [Container<TRegistrations>](#container)
    - [\<TRegistrations\>](#generic-tregistrations)
    - [.register\<TRegistrations\>()](#register)
      - [.scoped\<TRegistrations\>()](#scoped)
      - [.singleton\<TRegistrations\>()](#singleton)
      - [.transient\<TRegistrations\>()](#transient)
    - [.prepare()](#prepare)
- [abstract\<TInterface, TImplementedType = TInterface\>()](#abstract)
- [HostServiceProvider\<TContainer\>](#host-service-provider)
    - [\<TContainer\>](#generic-tcontainer)
    - [.createScope()](#createscope)
    - [.dispose()](#host-service-provider-dispose)
- [ScopedServiceProvider\<TContainer\>](#scoped-service-provider)
    - [.dispose()](#scoped-service-provider-dispose)
- [InferServiceProvider\<TContainer, ServiceKey\<TContainer\>\>](#infer-service-provider)
- [ServiceKey\<TContainer\>](#servicekey)
- [LazyReference\<TInstanceType\>](#lazy-reference)

## `Container<TRegistrations>`
<section id="container"></section>
Container that manages registrations of dependencies.

This class can be instantiated through one of the following methods:

```js
import { Container } from "fluxject";
const container = Container.create();
```

Or,

```js
import { fluxject } from "fluxject";
const container = fluxject();
```

### `<TRegistrations>`
<section id="generic-tregistrations"></section>

Stored type of `Record<string, Registration>` that is inferred from the usage of [.register()](#register)  

`Registration` is an internal type with the following structure:  
```ts
interface Registration<TInstanceType, TLifetime extends "scoped"|"singleton"|"transient"> {
    lifetime: TLifetime;
    instantiator: ((...args) => TInstanceType|Promise<TInstanceType>) | (new (...args) => TInstanceType);
}
```

### `.register<TRegistrations>()`
<section id="register"></section>

```ts
register<TRegistrations>(callback: RegistrationBuilderCallback): Container<TRegistrations & TNewRegistrations>
```

```ts
RegistrationBuilderCallback(registrationBuilder: RegistrationBuilder): TRegistrations
```

Register a new set of dependencies on the container.

```ts
import { fluxject } from "fluxject";

class MyService {}

const container = fluxject()
    .register(m => m.singleton({
        singleton: MyService
    }))
    .register(m => m.scoped({
        transient: MyService
    }))
    .register(m => m.transient({
        scoped: MyService
    }));
```

#### `.scoped<TRegistrations>()`
<section id="scoped"></section>

Register a new set of dependencies that are managed with a lifetime of `scoped`.
  - A `Scoped` dependency will maintain its state until the [HostServiceProvider's .dispose()](#host-service-provider-dispose) or the [ScopedServiceProvider's .dispose()](#scoped-service-provider-dispose) method is invoked.
  - A new [LazyReference](#lazy-reference) object referencing a `Scoped` dependency becomes available when the [HostServiceProvider's createScope()](#createscope) method is invoked.

#### `.singleton<TRegistrations>()`

<section id="singleton">
</section>

#### `.transient<TRegistrations>()`

<section id="transient">
</section>

### `.prepare()`

<section id="prepare">
</section>

## `abstract()`

<section id="abstract">
</section>

## `HostServiceProvider`

<section id="host-service-provider">
</section>

### `.createScope()`

<section id="createscope">
</section>

### `.dispose()`

<section id="host-service-provider-dispose">
</section>

## `ScopedServiceProvider`
<section id="scoped-service-provider"></section>

> [!NOTICE]  
> [`ScopedServiceProvider` is used with multiple definitions within this API. The type that is exported from `fluxject` is used to infer all services with the lifetime of `"scoped"` from a configured `Container` object. The term, however, is loosely used within this document as a class object that manages the services. This is still true, but in the source code, this would be actually referring to an instance of a class called `FluxjectScopedServiceProvider`. Similar to [LazyReference](#lazy-reference) `FluxjectScopedServiceProvider` has been abstracted away from the consumers of this library.]

Infer the Scoped Service Provider type that would be returned from a `HostServiceProvider`'s `createScope` method.

Example of using the `ScopedServiceProvider` as a `locals` object in [express](https://expressjs.com/)
```ts
import type { ScopedServiceProvider } from "fluxject";
import { container } from "./index.js"; // container configured by user
import express from "express";

type ExpressRequestHandler = (
    request: express.Request<any,any,any,ScopedServiceProvider<typeof container>>, 
    response: express.Response<any,ScopedServiceProvider<typeof container>>
) => void

const provider = container.prepare();
const app = express();

app.use((req,res,next) => {
    // res.locals will have the correct type of `ScopedServiceProvider` as an object with all of your configured services and their appropriate types.
    res.locals = provider.createScope();
    next();
})
```

### .dispose()
<section id="scoped-service-provider-dispose"></section>

```ts
dispose(): void|Promise<void>
```

Dispose of all Scoped services under this provider.  

This will also dispose of all scoped services that have been created by this provider.

___

If any `ScopedService` exists on the provider that has declared the `async [Symbol.asyncDispose]()` function, then the return type of this function will be inferred to return a promise.  

Calling `.dispose()` at any point, even if the services have not been instantiated yet, will completely void that service provider, meaning any de-reference afterward would become `undefined`.

> [!IMPORTANT]
> Services will be disposed in the same order they are registered in.

> [!WARNING]
> If Scoped Services are not appropriately disposed of, then your application could have a memory leak, as the Host Service Provider will keep a reference to these services until they are disposed of.
___

Example of disposing a `ScopedServiceProvider`

```ts
import { fluxject } from "fluxject";

class MyService {
    constructor() {
        console.log(`Instantiated MyService!`);
    }

    doSomething() {
        console.log(`Doing something`);
    }

    [Symbol.dispose]() {
        console.log(`Disposed my service!`);
    }
}

const container = fluxject()
    .register(m => m.scoped({ myService: MyService }));
const provider = container.prepare();

const scope = provider.createScope();
console.log(`Getting myService`);
const myService = scope.myService;
console.log(`Calling [doSomething()]`);
myService.doSomething();
console.log(`Calling [dispose()]`);
scope.dispose();
console.log(`Done`);
```

```
Getting myService
Calling [doSomething()]
Instantiated MyService!
Doing something
Calling [dispose()]
Disposed my service!
Done
```

## `LazyReference<TInstanceType>`
<section id="lazy-reference"></section>

Class object that instantiates a resource only once the resource is de-referenced.
  - The type of this class object remains invisible from library consumers.
    - The type of `TInstanceType` is used in its place. (along with appropriate `.dispose()` or `.createScope()` functions)
  - "de-referencing" includes
    - Getting a property from the service (`service.foo` or `service[0]`)
    - Setting a property on the service (`service.foo = "foo"` or `service[0] = "bar"`)
    - Using the `instanceof` keyword on the service (`service instanceof MyService`)
    - Using the `in` keyword on the service (`"foo" in service`)

```js
import { fluxject } from "fluxject";

class MyService {

    constructor() {
        console.log(`Instantiated MyService!`);
    }

    doSomething() {
        console.log(`Doing something`);
    }
}

const container = fluxject()
    .register(m => m.singleton({ myService: MyService }));
const provider = container.prepare();
console.log(`Getting myService`);
const myService = provider.myService;
console.log(`Calling [doSomething()]`);
myService.doSomething();
console.log(`Done`);
```

```
Getting myService
Calling [doSomething()]
Instantiated MyService!
Doing something
Done
```

Lazy Instantiation depends on usage of the object.

# Plug-Ins

While we would like to improve the core of `fluxject` as much as possible, the library is actually fairly easy to maintain, as it is a small amount of code. Therefore-- there is intended to be support for built-in services that can be installed under the `@fluxject` organization tag.

Upcoming built-in services:
  - `ILogger`: Service that handles logging for your application.
    - `ConsoleLogger`: Logs output straight to the console
      - `ColorLogger`: Derivation of ConsoleLogger, but output will be colored using `kleur` based on the `LogLevel` the message is logged under.
  - ``: 

# Miscellaneous

## Transient Service behavior

When a transient service is stored, only a reference to its instantiator is stored. If the service is to be used (or de-referenced) in any way, then a new instance is created and returned.  

The instance returned is proxied to protect against transient data from being stored or being leaked. Here are the cases where things may appear differently on your Transient services:  
  - Case: Transient service has a property or method that returns a reference to itself
    - The proxy will intercept this property or return value and instead return a reference back to the LazyReference.
    - Prevents a Transient Service from accidentally leaking the state of itself into another service.
  - Case: Transient service returns a property or method that is a Promise that returns a reference to itself
    - The proxy will intercept this promise and chain it so the return value becomes the LazyReference.
    - Prevents a Transient Service from accidentally leaking the state of itself into another service.
  - Case: Transient service or any property or function call that returns a Promise
    - The proxy will intercept any `.then()` calls and return the LazyReference. If a Promise is returned by a property access / method call, then the promise will be returned then.
    - Prevents a Transient Service from being instantiated more than necessary.

___

Example of how references to a Transient Service are handled:

```js
let numInstances = 0;
class TransientService {
    #x = 1;

    get x() { return this.#x;}

    constructor() {
        numInstances++;
        console.log(`Instantiating TransientService (#${numInstances})`);
    }

    get ref() {
        this.#x = 2;
        return this;
    }

    getRef() {
        this.#x = 3;
        return this;
    }

    async getRefAsync() {
        this.#x = 4;
        return this;
    }

    getRefAsync2() {
        this.#x = 5;
        return new Promise(res => res(new Promise(res => res(new Promise(res => res(this))))));
    }
};

const container = fluxject()
    .register(m => m.transient({ transientService: TransientService }));

console.log(`x:`, container.transientService.x);
console.log(`Finished x.`);
console.log(`ref.x:`, container.transientService.ref.x);
console.log(`Finished ref.x`);
console.log(`getRef().x`, container.transientService.getRef().x);
console.log(`Finished getRef().x`);
console.log(`(await getRefAsync()).x`, (await container.transientService.getRefAsync()).x);
console.log(`Finished (await getRefAsync()).x`);
console.log(`(await getRefAsync2()).x`, (await container.transientService.getRefAsync2()).x);
console.log(`Finished (await getRefAsync2()).x`);
```

___
Output: 

```
Instantiating TransientService (#1)
x: 1
Finished x.
Instantiating TransientService (#2)
Instantiating TransientService (#3)
ref.x: 1
Finished ref.x
Instantiating TransientService (#4)
Instantiating TransientService (#5)
getRef().x 1
Finished getRef().x
Instantiating TransientService (#6)
Instantiating TransientService (#7)
(await getRefAsync()).x 1
Finished (await getRefAsync()).x
Instantiating TransientService (#8)
Instantiating TransientService (#9)
(await getRefAsync2()).x 1
Finished (await getRefAsync2()).x
```

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

While the above case might be trivial, some circular dependencies are harder to detect. Fluxject attempts to give you as much information as possible if a `CircularDependencyError` is thrown. If one occurs, you should expect the stack trace leading up to the constructor or factory method at hand.

To resolve a circular dependency error, while keeping the same behavior, like the above example, you could do the following:

```js
import { fluxject } from "fluxject"();

class ServiceA {
    value = "Hello";
    #serviceB;

    constructor({ serviceB }) {
        this.#serviceB = serviceB.value;
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

The above method defers the instantiation of either class until they are explicitly used, so `ServiceA` would be constructed first triggered by the property access `toString` and `ServiceB` would be constructed next triggered by the property access `this.#serviceB.value`, but at the point that code is executed, `serviceA` will have been instantiated and ready to access, so `serviceB` can safely finish its construction.

> [!NOTE]  
> [Even just deferring property accessors until after construction in any single service within the circular dependency should resolve this issue. You do not have to do it for all, like how the above example does it.]

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

* **Travis R. Zuleger** - *Creator and Maintainer of the Project* - [traviszuleger](https://github.com/traviszulege)

See also the list of [contributors](https://github.com/traviszuleger/fluxject/contributors) who participated in this project.

# License

[MIT License](https://andreasonny.mit-license.org/2019) © Travis Zuleger