# fluxject

Fluxject is an IoC strongly-typed dependency injection library that allows you to register various lifetime services to be accessed throughout your application.

__`Fluxject` is young in development, and is prone to errors or unexpected behavior.__  

__Please submit bugs and feature requests as an issue on the GitHub page.__

## Table of Contents
- [Getting Started](#getting-started)
- [Registering Services](#registering-services)
- [Lifetime](#lifetime)
    - [Scoped Services](#scoped)
    - [Singleton Services](#singleton)
    - [Transient Services](#transient)
- [Disposal of Services](#dispose)
    - [Type Safety](#type-safety-1)
    - [Examples](#examples-1)

## Getting Started

```ts
import type { InferServiceProvider } from "fluxject";
import { fluxject } from "fluxject";

class DatabaseProvider {
    #secrets;
    constructor({ secrets }: InferServiceProvider<typeof container, "database">) {
        this.#secrets = secrets;
        console.log(`Created DatabaseProvider!`);
    }

    async getUser(id: string) {
        // ...
    }

    async insertUser() {
        // ...
    }

    async updateUser() {

    }
}

class SecretsProvider {
    databaseConnectionString = process.env.CONNECTION_STRING;

    constructor() {
        console.log(`Created SecretsProvider!`);
    }
}

class User {
    id: string;
    firstName: string;
    lastName: string;

    #database;

    constructor({ database }: InferServiceProvider<typeof container, "user">) {
        this.#database = database;
        console.log(`Created User!`);
    }

    async update() {
        await this.#database.updateUser({
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName
        });
    }
}

const container = fluxject()
    .register(m => m.singleton({
        secrets: SecretsProvider
    }))
    .register(m => m.transient({
        database: DatabaseProvider
    }))
    .register(m => m.scoped({
        user: User
    }));

const provider = container.prepare();
const scope = container.createScope();

console.log(`Getting user...`);
const user = await provider.getUser("123");
console.log(`Got user!`);
scope.user.id = user.id;
scope.user.firstName = user.firstName;
scope.user.lastName = user.lastName;
console.log(`Set user!`);
```

The command line output of the above code:

```console
Getting user...
Created SecretsProvider!
Created DatabaseProvider!
Got user!
Created User!
Set user!
```

This app creates a `DatabaseProvider`, a `SecretsProvider`, and a `User` upon requests of the service on the prepared service provider.  

A few things to note here:
  - The return type of `.register()` returns a new container, meaning you __MUST__ use the final returned container as your source container throughout your application.
  - All services have access to other services within the scope of their respective lifetime. 
    - `Singleton` services only have access to other `Singleton` services and all `Transient` services.
    - `Transient` services only have access to other `Transient` services and all `Singleton` services.
    - `Scoped` services have access to all registered services. 
  - Fluxject supports lazy instantiation, meaning your services will never be instantiated unless they are explicitly used.
    - An example of "explicitly using" a service would be something like de-referencing a property on your service.
  - Circular dependencies are still a risk. Fluxject attempts to mitigate the chances of circular dependencies, but they will always exist. 
    - Circular dependencies will occur if you attempt to use a service (Service A) within another service (Service B), and the other service (Service B) attempts to use the first service (Service A). 
    - This can be prevented by deferring any usage of the services until after the factory method or constructor returns.  


## Registering Services

Fluxject uses a fluent approach to container instantiation, meaning the final resulting container will be the container that you use in your application.

There are multiple methods to register services on your container. See below for these different methods.

```js
import { fluxject } from "fluxject";

const container = fluxject()
    .register(m => m.singleton({
        // ... all singleton services
    }))
    .register(m => m.transient({
        // ... all transient services
    }))
    .register(m => m.scoped({
        // ... all scoped services
    }));
```

```js
import { fluxject } from "fluxject";

const container = flxuject()
    .register(m => m.singleton({ test1: () => ({}) }))
    .register(m => m.singleton({ test2: () => ({}) }))
    .register(m => m.transient({ test3: () => ({}) }))
    .register(m => m.scoped({ test4: () => ({}) }))
    .register(m => m.transient({ test5: () => ({}) }))
```

```js
import { fluxject } from "fluxject";

const container = fluxject()
    .register(m => ({
        ...(m.singleton({
            // ... singleton services
        })),
        ...(m.transient({
            // ... transient services
        })),
        ...(m.scoped({
            // ... scoped services
        }))
    }));
```

Additionally, you can add documentation above each declared service, and intellise will detect these comments.

```js
import { fluxject } from "fluxject";

const container = fluxject()
    .register(m => m.singleton({
        /**
         * Service that is used as an example in the Fluxject repository.
         */
        test: class Test { }
    }));
```

Now, when referencing the service from the `HostServiceProvider` returned from `container.prepare()`, you will see the comments in intellise.

![image](https://github.com/user-attachments/assets/4db17cb0-f6b6-484e-8bdb-2a2e9581609a)

__NOTE: Do not register your services in-line, ignoring the return type completely, your final `Container` instance will not be typed appropriately, nor will it behave as intended.__

__DO THIS:__
```js
const container = fluxject()
    .register(/** ... */)
    .register(/** ... */);

// It's also important not to do this, as your `container` variable will only be of type `Container<{}>` and you'll get errors when trying to set `container.register(/** ... */)` back to itself.
let container = fluxject();
container = container.register(/** ... */);
container = container.register(/** ... */);
```

__DO NOT DO THIS:__
```js
let container = fluxject();
container.register(/** ... */);
container.register(/** ... */);
```

## Lifetime

Services can be registered on your container as three different types of Lifetime services:
 - `Scoped`: Lifetime of this service will last as long as it is in scope.
   - Changes to scoped service properties will persist.
 - `Singleton`: Lifetime of this service will last as long as the host service provider is in scope. (Typically as long as the application is running)
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

### Singleton

`Singleton` lifetime services will last as long as the application's lifetime, meaning that once you call `.prepare()`, the singleton service will be instantiated and will remain as such until your programs quits (or, technically, once the return value from `.prepare()` leaves scope)

`Singleton` lifetime services, on instantiation, only have access to other `Singleton` and `Transient` lifetime services.

Here is an example of registering a `Singleton` lifetime service:

```ts
const container = Container.create()
    .register(m => m.singleton({ staticObject: (services: InferServiceProvider<typeof container, "staticObject">) => ({}) }))
    .register(m => m.singleton({ staticClassObject: SingletonService: }));

class SingletonService {
    constructor(services: InferServiceProvider<typeof container, "staticClassObject">) {

    }
}
```

### Transient

`Transient` lifetime services will only last as long as the requested service is in scope, or technically, will be instantiated with every request.

`Transient` lifetime services, on instantiation, only have access to other `Singleton` and `Transient` lifetime services.

Here is an example of instantiating a `Transient` lifetime service:  

```ts
const container = Container.create()
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

## Dispose

You can provide the pre-defined `Symbol.dispose` symbol on a service that can be disposed at any given time if you call the `[dispose()]` method on the service provider you are intending to dispose of.  

Both a `HostServiceProvider` and `ScopedServiceProvider` will have the `[dispose()]` method.  

When `[dispose()]` is called on the `HostServiceProvider`, all `Singleton` services will be disposed. Additionally, all `ScopedServiceProviders` that have been created will also be disposed of.  

When `[dispose()]` is called on the `ScopedServiceProvider`, all `Scoped` services on that provider will be disposed.

This functionality allows for easy clean-up of Singleton and Scoped services without having to explicitly clean up the service yourself.

__Please note that this functionality ONLY exists for Singleton and Scoped services, there is unfortunately no way of knowing when a Transient service has left scope without the usage of TypeScript's `using` keyword.__

### Examples

Example of adding `[Symbol.dispose]` on a `Singleton` service:

```js
const mySingletonService = () => ({ [Symbol.dispose]: () => console.log(`disposed mySingletonService`) });
const container = Container.create()
    .register(m => m.singleton({ mySingletonService }));

const hostServiceProvider = container.prepare();
hostServiceProvider.mySingletonService.toString(); // This would only be to lazily instantiate the service.
hostServiceProvider.dispose();
// will print "disposed mySingletonService"
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
scopedServiceProvider.myScopedService.toString(); // This would only be to lazily instantiate the service.
scopedServiceProvider.dispose();
// will print "disposed myScopedService"
```