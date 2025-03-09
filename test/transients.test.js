//@ts-check

import { describe, it, expect } from 'vitest'
import { fluxject } from "../src/index.js";

describe('transients', () => {
    it('should not instantiate service until the service is de-referenced', () => {
        let isInstantiated = false;
        class Test {
            constructor() {
                isInstantiated = true;
            }

            doNothing() {

            }
        }

        const container = fluxject()
            .register(m => m.transient({ test: Test }));
        
        const provider = container.prepare();
        expect(isInstantiated).toBe(false);
        provider.test.doNothing();
        expect(isInstantiated).toBe(true);
    });

    it('should throw FluxjectError when checking instance type', () => {
        class Test { x = 1; }

        const container = fluxject()
            .register(m => m.transient({ test: Test }));
        
        const provider = container.prepare();
        expect(() => provider.test instanceof Test).toThrowError();
    });

    it('should be able to de-reference a dependency from another dependency', () => {
        let canDeReference = false;
        let test1X = 0;
        class Test1 {
            x = 1;
        }
        class Test2 {
            constructor({ test1 }) {
                canDeReference = test1.x === 1;
                test1X = test1.x;
            }

            doNothing() {

            }
        }

        const container = fluxject()
            .register(m => m.transient({ test1: Test1 }))
            .register(m => m.transient({ test2: Test2 }));
        
        const provider = container.prepare();
        provider.test2.doNothing();
        expect(canDeReference).toBe(true);
        expect(test1X).toBe(1);
    });

    it('should not be able to invoke [createScope] or [dispose] from within a transient service', () => {
        class Test {
            constructor({ createScope, dispose }) {
                this.createScope = createScope;
                this.dispose = dispose;
            }
        }

        const container = fluxject()
            .register(m => m.transient({ test: Test }));

        const provider = container.prepare();
        expect(provider.test.createScope).toBeUndefined();
        expect(provider.test.dispose).toBeUndefined();
    });

    let isDisposed = false;
    let isTestInvoked = false;
    class Test {
        isDisposed = false;

        test() {
            isTestInvoked = true;
        }

        [Symbol.dispose]() {
        }
        
        async [Symbol.asyncDispose]() {
            this.isDisposed = true;
            isDisposed = true;

        }
    }

    function factoryTest() {
        return new Test();
    }

    it('should dispose of right after calling function', async () => {
        const container = fluxject()
            .register(m => m.singleton({ singleton: Test }))
            .register(m => m.transient({ test: factoryTest }));
        const provider = container.prepare();

        expect(isDisposed).toBe(false);
        expect(isTestInvoked).toBe(false);
        provider.test.test();
        expect(isDisposed).toBe(true);
        expect(isTestInvoked).toBe(true);
        isDisposed = false;
        expect(provider.test.isDisposed).toBe(false);
        expect(isDisposed).toBe(true);
    });

    it('should receive lazy reference when attempting to return reference to service itself from property getter or method', () => {
        class Test {
            x = 1;

            getReference() {
                this.x++;
                return this;
            }

            getX() {
                return this.x;
            }

        };

        const container = fluxject()
            .register(m => m.singleton({ test1: Test }))
            .register(m => m.transient({ test2: Test }));
        
        const provider = container.prepare();

        expect(provider.test1.getReference().getX()).toBe(2);
        expect(provider.test1.getReference().getReference().getReference().getX()).toBe(5);

        expect(provider.test2.getReference().getX()).toBe(1);
        expect(provider.test2.getReference().getReference().getReference().getX()).toBe(1);
    });
});