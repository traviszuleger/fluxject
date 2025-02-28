//@ts-check

import { describe, it, expect } from 'vitest'
import { fluxject } from "../src/index.js";

describe('scopes', () => {
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
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isInstantiated).toBe(false);
        scope.test.doNothing();
        expect(isInstantiated).toBe(true);
    });

    it('should return true when checking instance type', () => {
        class Test { }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(scope.test).toBeInstanceOf(Test);
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
            .register(m => m.scoped({ test1: Test1 }))
            .register(m => m.scoped({ test2: Test2 }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        scope.test2.doNothing();
        expect(canDeReference).toBe(true);
        expect(test1X).toBe(1);
    });

    it('should not be able to invoke [dispose] from within a scoped service', () => {
        class Test {
            constructor({ dispose }) {
                this.dispose = dispose;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));

        const provider = container.prepare();
        const scope = provider.createScope();
        expect(scope.test.dispose).toBeUndefined();
    });

    it('should dispose of scoped services when [dispose] on scoped service provider is called', () => {
        class Test {
            isDisposed = false;
            [Symbol.dispose]() {
                this.isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(scope.test.isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        scope.dispose();
        expect(scope.test).toBe(undefined);
    });

    it('should dispose of scoped services when [dispose] on host service provider is called', () => {
        class Test {
            isDisposed = false;
            [Symbol.dispose]() {
                this.isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(scope.test.isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        provider.dispose();
        expect(scope.test).toBe(undefined);
    });
});