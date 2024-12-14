//@ts-check
/** @import { ContainerType } from "./index.js" */
/** @import { InferServiceProvider } from "../../src/container.js" */
import { MockService } from "./base-service.js";

export class MockSettings extends MockService {

    /** @param {InferServiceProvider<ContainerType, "settings">} services */
    constructor({ createScope }) {
        super();
        this.createScope = createScope;
    }
    
    get dbConnectionString() {
        return `dbConnectionString`;
    }

    get cacheConnectionString() {
        return `cacheConnectionString`;
    }
}