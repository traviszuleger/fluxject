//@ts-check
import { Container } from "../src/container.js";
import { Service } from "../src/service.js";

/**
 * @typedef {typeof container} ContainerType
 */

/** @extends {Service<ContainerType, "Secrets">} */
class Secrets extends Service {
    connectionString = "";
}

/** @extends {Service<ContainerType, "AuthProvider">} */
class AuthProvider extends Service {
    validations = 0;
    
    /**
     * @param {number} userId 
     */
    async validateUser(userId) {
        this.validations++;
        const user = this.services.DatabaseProvider.getUser(userId);
        if(!user) {
            return false;
        }
        return true;
    }

};

/** @extends {Service<ContainerType, "DatabaseProvider">} */
class DatabaseProvider extends Service {
    /**
     * @typedef User
     * @prop {number} id
     * @prop {string} firstName
     * @prop {string} lastName
     */

    /** @type {User[]} */
    #users = [];

    /**
     * @param {User} user 
     */
    deleteUser(user) {
        const idx = this.#users.findIndex(u => u.id === user.id);
        this.#users = [...this.#users.slice(0, idx), ...this.#users.slice(idx+1)];
        return this.#users.findIndex(u => u.id === user.id) === -1;
    }

    /**
     * @param {User} user 
     */
    insertUser(user) {
        const idx = this.#users.findIndex(u => u.id === user.id);
        if(idx !== -1) {
            return undefined;
        }
        this.#users.push(user);
        return user;
    }

    /**
     * 
     * @param {number} id 
     * @returns 
     */
    getUser(id) {
        return this.#users.filter(u => u.id === id)[0];
    }

    getAllUsers() {
        return this.#users;
    }

}

/** @extends {Service<ContainerType, "RoutesController">} */
class RoutesController extends Service {

}

/** @extends {Service<ContainerType, "RequestDetail">} */
class RequestDetail extends Service {

}

export const container = Container
    .create()
    .register(m => m.singleton({ isDevMode: true }))
    .register(m => m.singleton({ Secrets }))
    .register(m => m.singleton({ RoutesController }))
    .register(m => m.singleton({ DatabaseProvider }))
    .register(m => m.transient({ numRequests: 0 }))
    .register(m => m.transient({ AuthProvider }))
    .register(m => m.scoped({ RequestDetail }))
    .register(m => m.scoped({ x: 0}));