//@ts-check
/** @import { ContainerType } from "./index.js" */
/** @import { InferServiceProvider } from "../../src/container.js" */

/** @param {InferServiceProvider<ContainerType, "locals">} services */
export function createMockLocals(services) {
    return {
        incrementTest() {
            services.test++;
        },
        user: {
            id: "",
            firstName: "",
            lastName: "",
            email: ""
        },
        sessionId: ""
    };
}