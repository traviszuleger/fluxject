//@ts-check
/** @import { InferServiceProvider } from "fluxject" */
import { Service } from "fluxject";
import { container } from ".";

/**
 * @extends {Service<typeof container, "log">}
 */
export class LogProvider extends Service {
    /**
     * @param {string} msg 
     */
    warning(msg) {
        if(this.services.secrets.log_level & 0b00100) {
            console.log(`${this.#prefix("W")}${msg}`);
        }
    }

    /**
     * @param {Error|string} msg 
     */
    error(msg) {
        if(this.services.secrets.log_level & 0b01000) {
            if(msg instanceof Error) {
                console.log(`${this.#prefix("E")}${msg.name} - ${msg.message}`);
            }
            else {
                console.log(`${this.#prefix("E")}${msg}`);
            }
        }
    }

    /**
     * @param {Error|string} msg 
     */
    critical(msg) {
        if(this.services.secrets.log_level & 0b10000) {
            if(msg instanceof Error) {
                console.log(`${this.#prefix("X")}${msg.name} - ${msg.message}`);
            }
            else {
                console.log(`${this.#prefix("X")}${msg}`);
            }
        }
    }

    /**
     * @param {string} msg 
     */
    info(msg) {
        if(this.services.secrets.log_level & 0b00010) {
            console.log(`${this.#prefix("I")}${msg}`);
        }
    }

    /**
     * @param {string} msg 
     */
    debug(msg) {
        if(this.services.secrets.log_level & 0b00001) {
            console.log(`${this.#prefix("D")}${msg}`);
        }
    }

    /**
     * @param {string} type 
     * @returns 
     */
    #prefix(type) {
        return `${type}|${new Date().toISOString()}> `;
    }
}