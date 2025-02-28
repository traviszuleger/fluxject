
//@ts-check

/**
 * @template {object} TInstanceType
 */
export class LazyReference {
    /** @type {TInstanceType|undefined} */
    #value;

    /**
     * @param {() => TInstanceType} instantiator 
     */
    constructor(instantiator) {
        this.#value = undefined;
        return new Proxy(this, {
            get: (target,property,receiver) => {
                if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                    return undefined;
                }
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                const val = this.#value[property];
                if(val instanceof Function) {
                    return val.bind(this.#value);
                }
                return val;
            },
            set: (target,property,value) => {
                if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                    return false;
                }
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                this.#value[property] = value;
                return true;
            },
            has: (target,property) => {
                if(property === Symbol.dispose || property === Symbol.asyncDispose) {
                    return false;
                }
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                return property in /** @type {any} */ (this.#value);
            },
            getPrototypeOf: () => {
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                return Object.getPrototypeOf(this.#value);
            }
        });
    }
}