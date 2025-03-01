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

    it('should return true when checking instance type', () => {
        class Test {}

        const container = fluxject()
            .register(m => m.transient({ test: Test }));
        
        const provider = container.prepare();
        expect(provider.test).toBeInstanceOf(Test);
    });

    it('should be able to de-reference a dependency from another dependency', () => {
        let canDeReference = false;
        let test1X = 0;
        class Test1 {
            x = 1;
        }
        class Test2 {
            constructor({ test1 }) {
                canDeReference = test1 instanceof Test1;
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
});