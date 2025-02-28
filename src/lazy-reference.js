
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
            get: (t,p,r) => {
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                return this.#value[p];
            },
            set: (t,p,v) => {
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                this.#value[p] = v;
                return true;
            },
            has: (t,p) => {
                if(this.#value === undefined) {
                    this.#value = instantiator();
                }
                return p in /** @type {any} */ (this.#value);
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