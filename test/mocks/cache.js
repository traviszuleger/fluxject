//@ts-check
/** @import { ContainerType } from "./index.js" */
/** @import { InferServiceProvider } from "../../src/container.js" */

import { MockService } from "./base-service.js";

export class MockCacheService extends MockService {
    
    /** @param {InferServiceProvider<ContainerType, "cache">} services */
    constructor(services) {
        super();
        console.log(`In MockCacheService`);
        console.log(services.createScope);
        this.locals = services.createScope().locals;
        console.log(`MockCacheService created! (${services.settings.cacheConnectionString})`);
    }

}