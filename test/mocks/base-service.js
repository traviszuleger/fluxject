//@ts-check

import { randomUUID } from "crypto";

export class MockService {
    id = randomUUID();
    /** @type {Function=} */
    #afterNextFunctionCall;
    /** @type {Function=} */
    #beforeNextFunctionCall;

    constructor() {
        return new Proxy(this, {
            get: (t,p,r) => {
                if(typeof t[p] === "function") {
                    return new Proxy(t[p], {
                        apply: (fn,self,args) => {
                            t.#beforeNextFunctionCall?.();
                            t.#beforeNextFunctionCall = undefined;
                            const ret = fn.bind(self)();
                            t.#afterNextFunctionCall?.();
                            t.#afterNextFunctionCall = undefined;
                            return ret;
                        }
                    })
                }
                return t[p];
            }
        });
    }

    /**
     * @template {MockService} T
     * @this {T}
     * @param {(t: T) => void} callback 
     */
    afterNextFunctionCall(callback) {
        this.#afterNextFunctionCall = callback;
    }

    /**
     * @template {MockService} T
     * @this {T}
     * @param {(t: T) => void} callback 
     */
    beforeNextFunctionCall(callback) {
        this.#beforeNextFunctionCall = callback;
    }

}