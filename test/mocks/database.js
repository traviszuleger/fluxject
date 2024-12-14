//@ts-check
/** @import { ContainerType } from "./index.js" */
/** @import { InferServiceProvider } from "../../src/container.js" */

import { MockService } from "./base-service.js";

export class MockDatabaseService extends MockService {
    #services;
    
    /** @param {InferServiceProvider<ContainerType, "database">} services */
    constructor(services) {
        super();
        this.#services = services;
        console.log(`MockDatabaseService created! (${services.settings.dbConnectionString})`);
    }

    /**
     * @param {string} cmd 
     */
    async command(cmd) {
        this.#services.vitest.lastDbCommand = cmd;
    }

    close() {
        console.log("close", this);
        this.#services.vitest.dbClosed = true;
    }
}