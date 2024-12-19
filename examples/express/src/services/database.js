//@ts-check
/** @import { InferServiceProvider } from "fluxject" */

import { KinshipContext } from "@kinshipjs/core";
import { adapter, createMySql2Pool } from "@kinshipjs/mysql2";
import { container } from ".";

export class DatabaseProvider {
    #pool;

    /** @type {KinshipContext<{ id: string, firstName: string, lastName: string, email: string }>} */
    users;
    /** @type {KinshipContext<{ id: string, userId: string, expiresAt: Date }>} */
    sessions;

    /**
     * 
     * @param {InferServiceProvider<typeof container, "database">} services 
     */
    constructor({ secrets }) {
        this.#pool = createMySql2Pool({
            host: secrets.database_host,
            user: secrets.database_user,
            password: secrets.database_pass,
            port: secrets.database_port
        });
        const adapterConnection = adapter(this.#pool);
        this.users = new KinshipContext(adapterConnection, "User");
    }
}

/**
 * @typedef AuthToken
 * @prop {string} token
 */

/**
 * @typedef AuthSession
 * @prop {string} id
 * @prop {string} userId
 * @prop {Date} expiresAt
 */

/**
 * @typedef AuthUser
 * @prop {string} id
 * @prop {string} firstName
 * @prop {string} lastName
 * @prop {string} email
 */