//@ts-check
/** @import { InferServiceProvider } from "fluxject" */

import { KinshipContext } from "@kinshipjs/core";
import base32encode from 'base32-encode';
import { createHash, getRandomValues } from "crypto";
import { container } from ".";

export class AuthProvider {
    #database;

    /**
     * @param {InferServiceProvider<typeof container, "auth">} param0 
     */
    constructor({ database }) {
        this.#database = database;
    }

    generateSessionToken() {
        const bytes = new Uint8Array(20);
        getRandomValues(bytes);
        const token = base32encode(bytes, 'Crockford', { padding: false }).toLowerCase();
        return token;
    }

    /**
     * @param {string} token 
     * @param {string} userId
     */
    async createSession(token, userId) {
        const sessionId = createHash('sha256')
            .update(token)
            .digest('hex')
            .toLowerCase();
        const session = {
            id: sessionId,
            userId,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        };
        await this.#database.sessions.insert(session);
        return session;
    }

    /**
     * 
     * @param {string} token 
     */
    async validateSessionToken(token) {

    }
}