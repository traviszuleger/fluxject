//@ts-check
/** @import { InferServiceProvider } from "../../src/container.js" */

import { Container } from "../../src/container.js";
import { MockCacheService } from "./cache.js";
import { MockDatabaseService } from "./database.js";
import { createMockLocals } from "./locals.js";
import { MockSettings } from "./settings.js";

/** @param {InferServiceProvider<typeof container, "vitest">} services */
function createVitestDetails(services) {
    return {
        x: 0,
        y: 0,
        z: 0,
        foo: "foo",
        bar: "bar",
        biz: "biz",
        dbClosed: false,
        lastDbCommand: ""
    }
}

/** @typedef {typeof container} ContainerType */

export const container = Container
    .create()
    .register(m => m.singleton("vitest", createVitestDetails))
    .register(m => m.singleton("settings", MockSettings))
    .register(m => m.transient("database", MockDatabaseService))
    .register(m => m.transient("cache", MockCacheService))
    .register(m => m.scoped("locals", createMockLocals))
    .register(m => m.scoped("test", 5))