//@ts-check
/** @import { ContainerConfig } from "./container.js" */
import { Container } from "./container.js";
export * from "./container.js";
export * from "./service.js";

/**
 * @param {Partial<ContainerConfig>} config
 */
export default (config={}) => {
    return Container.create(config);
}
