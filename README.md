# fluxject

Fluxject is a Simple and Strongly-Typed Dependency Injection library, that allows you to register various lifetime services
to be accessed throughout your application.

__`Fluxject` is young in development, and is prone to errors or unexpected behavior.__  
__Please submit bugs and feature requests as an issue on the GitHub page.__
## Example

```js
import type { InferServiceProvider, HostServiceProvider, ScopedServiceProvider } from "fluxject";
import { Container } from "fluxject";
import { createDatabase } from "./my-database-provider.js";

const container = Container.create()
  .register(m => m.singleton("connectionString", process.env.CONNECTION_STRING))
  .register(m => m.singleton("database", createDatabaseProvider))
  .register(m => m.transient("log", createLogProvider))
  .register(m => m.scoped("cache", VolatileCache));

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

```js
const container = Container.create()
    .register(m => m.singleton("staticValue", 0))
    .register(m => m.singleton("staticObject", (services: InferServiceProvider<typeof container, "staticObject">) => ({})))
    .register(m => m.singleton("staticClassObject", SingletonService));

class SingletonService {
    constructor(services: InferServiceProvider<typeof container, "staticClassObject">) {

    }
}
```

You can alter a singleton's properties (or value if the value passed was a constant value) at any time, and the state of that service (value or object) will persist so long as the `HostServiceProvider` object exists.

```js
// ...
const hostServiceProvider = container.prepare();
hostServiceProvider.staticValue++;
assert(hostServiceProvider.staticValue === 1);
```

### Transient

`Transient` lifetime services will only last as long as the requested service is in scope, or technically, will be instantiated with every request. The only exception to this rule is when a `Transient` lifetime service is accessed from a `ScopedServiceProvider` object.

`Transient` lifetime services, on instantiation, only have access to other `Singleton` and `Transient` lifetime services.

Here is an example of instantiating a `Transient` lifetime service:  

```js
const container = Container.create()
    .register(m => m.transient("Value", 0))
    .register(m => m.transient("Object", (services: InferServiceProvider<typeof container, "Object">) => ({})))
    .register(m => m.transient("ClassObject", TransientService));

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