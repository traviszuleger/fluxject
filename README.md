# Fluxject

Inversion of Control library that manages the access and lifetime of registered dependencies.

## Table of Contents
- [Pre-requisites](#prerequisites)
- [Quick Start](#quick-start)
  - [TypeScript](#typescript)
  - [JSDOC](#jsdoc)
- [Example](#example)
- [Installation](#installation)
- [Injected Dependencies](#injected-dependencies)
- [Lazy Reference](#lazy-reference)
- [Scoped](#scoped)
- [Singleton](#singleton)
- [Transient](#transient)
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


# Example

```ts
import type { InferServiceProvider } from "fluxject";
import { abstract, fluxject } from "fluxject";
import { config } from "dotenv";
import { createConnection } from "my-preferred-database-library";

class SecretsProvider {

    constructor() {
        console.log(`Created SecretsProvider`);
        config();
        this.connectionString = process.env.CONNECTION_STRING;
        this.businessLogicUrl = process.env.BUSINESS_LOGIC_URL;
    }
}

interface ILogger {
    debug: (...args: any) => void;
}

class Logger implements ILogger {
    #businessLogic;

    constructor({ businessLogic }: InferServiceProvider<typeof container, "logger">) {
        console.log(`Created Logger`);
        this.#businessLogic = businessLogic;
    }

    debug(...args: any) {
        console.log(`DEBUG:`, ...args);
    }

    submitTicket(err: Error) {
        await this.#businessLogic.sendTicket({
            title: err.name,
            message: err.message,
            stack: err.stack
        });
    }

}

class DatabaseProvider {
    #log;
    #databasePromise;
    
    constructor({ logger, secrets }: InferServiceProvider<typeof container, "database">) {
        console.log(`Created DatabaseProvider`);
        this.#databasePromise = createConnection(secrets.connectionString);
        this.#log = logger;
    }

    async getUserById(id: string): User {
        console.log(`getUserById(${id}) called`);
        const database = await this.#databasePromise;

        try {
            const results = await database.exec(`SELECT * FROM User WHERE id = ?`, [id]);
    
            return results[0] as User;
        }
        catch(err) {
            this.#log.debug(err);
            return undefined;
        }
    }

    async [Symbol.asyncDispose]() {
        console.log(`Disposing of DatabaseProvider`);
        const database = await this.#databasePromise;

        await database.close();
        console.log(`Disposed DatabaseProvider`);
    }
}

interface Ticket {
    title: string;
    message: string;
    stack?: string;
}

class BusinessLogicAPI {
    #baseUrl;
    #logger;

    constructor({ logger, secrets }: InferServiceProvider<typeof container, "businessLogic">) {
        console.log(`Created BusinessLogicAPI`);
        this.#baseUrl = secrets.businessLogicUrl;
        this.#logger = logger;
    }

    async healthz(): boolean {
        console.log(`healthz() called`);
        try {
            const res = await fetch(`${this.#baseUrl}/healthz`);
            return res.ok;
        }
        catch(err) {
            return false;
        }
    }

    async sendTicket(ticket: Ticket) {
        try {
            const res = await fetch(`${this.#baseUrl}/tickets`, {
                method: 'POST',
                body: JSON.stringify(ticket)
            });
            return res.ok;
        }
        catch(err) {
            // Careful: if we try to call `this.#log.sendTicket()` here, it would cause a "CircularDependencyError"
            return false;
        }
    }

    async [Symbol.asyncDispose]() {
        console.log(`Asynchronously disposing of transient BusinessLogicAPI`);
    }

}

interface User {
    id: string;
    firstName: string;
    lastName: string;
}

interface IClient {
    user?: User;
}

class Client implements IClient {
    user?: User;

    #businessLogic;
    #database;
    #log;

    constructor({ businessLogic, database, logger }: InferServiceProvider<typeof container, "client">) {
        console.log(`Created Client`);
        this.#businessLogic = businessLogic;
        this.#database = database;
        this.#log = logger;
    }

    async setUserId(id: string) {
        console.log(`Setting User ID: ${id}`);
        this.user = await this.#database.getUser(id);
    }

    [Symbol.dispose]() {
        console.log(`Synchronously disposing of Client`);
    }
}


const container = fluxject()
    .register(m => m.singleton({
        secrets: Secrets,
        logger: abstract<ILogger>(Logger) // `abstract` does nothing but change the type of `logger` to be an `ILogger` instead of `Logger`.
    }))
    .register(m => m.transient({
        businessLogic: BusinessLogic
    }))
    .register(m => m.scoped({
        client: abstract<IClient>(Client)
    }));

const provider = container.prepare();

provider.logger.debug(`Service container ready.`);
if(!(await provider.businessLogic.healthz())) {
    throw new Error("Could not connect to Business Logic!");
}
console.log(`Connection to Business Logic was successful.`);

const scope = provider.createScope();
console.log(`Created ScopedServiceProvider`);

await scope.client.setUserId("1");

console.log(scope.client.user);

if(await provider.businessLogic.healthz()) {
    console.log(`Showing that transients are one-time request use only`);
}

// Since there is an existing `async [Symbol.asyncDispose]()` method declared on at least one `Singleton` service, 
//   then this method's return type is inferred to be of `Promise<void>`
await provider.dispose();

// Calling `.dispose()` on the host provider will automatically dispose of all derived scoped providers that was returned from the host's `createScope()` function.
//   Alternatively, you can call the `.dispose()` function on just the scoped provider, if you only want to dispose of that scope.
await scope.dispose(); // although, since we called `.dispose()` on the host provider above, this would do nothing.
```

The above program would print out the following to your terminal (assuming no errors):

```
Created Logger
DEBUG: Service container ready.
Created SecretsProvider
Created BusinessLogicAPI
Asynchronously disposing of BusinessLogicAPI
Connection to Business Logic was successful.
Created ScopedServiceProvider
Created User
Setting User Id: 1
Created Database
getUserById(1) called
Client { id: 1, firstName: "John", lastName: "Doe" }
Created BusinessLogicAPI
Asynchronously disposing of BusinessLogicAPI
Showing that transients are one-time request use only
Synchronously disposing of Client
Disposing of DatabaseProvider
Disposed DatabaseProvider
```

# Installation

To install and set up the library, run:

```sh
$ npm install fluxject
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

# Singleton

Singleton services are expected to last for the entire life of the application.

You can expect a singleton service to maintain all of its state, however modified, starting from the invocation of `.prepare()`, all the way until the `.dispose()` function is called.

The inferred service provider using the provided `InferServiceProvider` type will yield an interface that only contains the services that have been registered as `Transient` or `Singleton` (not including itself) (as `LazyReference`s) that you have registered with its appropriate instance.

# Transient

Transient services will only last as long as it was requested for. (e.g., a single property access)

You can expect a transient service to always be in the state that it is in immediately after instantiation. Transients are completely stateless, and should never expect to be changed or be different in any capacity. Once the property value has been retrieved, (functions and promises are handled) then that service will be disposed of.

> __CAUTION__  
> Transient services should be services that are infrequently called. They are important for completing a single request of its instance. If you find the need to declare it as a disposable, then you should consider converting the service into a `Singleton` or `Scoped` service.

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