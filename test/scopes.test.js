//@ts-check

import { describe, it, expect } from 'vitest'
import { fluxject } from "../src/index.js";
import { isPromise } from 'util/types';

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
        let isDisposed = false;
        class Test {
            [Symbol.dispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        scope.dispose();
        expect(isDisposed).toBe(true);
        expect(scope.test).toBe(undefined);
    });

    it('should dispose of scoped services when [dispose] on host service provider is called', () => {
        let isDisposed = false;
        class Test {
            [Symbol.dispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        provider.dispose();
        expect(isDisposed).toBe(true);
        expect(scope.test).toBe(undefined);
    });

    it('should asynchronously dispose of scoped services when [dispose] on scoped service provider is called', async () => {
        let isDisposed = false;
        class Test {
            async [Symbol.asyncDispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test: Test }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        const result = scope.dispose();
        expect(isPromise(result)).toBe(true);
        await result;
        expect(isDisposed).toBe(true);
        expect(scope.test).toBe(undefined);
    });

    it('should asynchronously dispose of scoped services when [dispose] on host service provider is called', async () => {
        let isDisposed = false;
        class Test {
            async [Symbol.asyncDispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.singleton({ test2: class Test2 { } }))
            .register(m => m.transient({ test3: class Test3 { } }))
            .register(m => m.scoped({ test: Test, test4: class Test4 { } }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isDisposed).toBe(false);
        expect(scope.test).toBeInstanceOf(Test);
        const result = provider.dispose();
        expect(isPromise(result)).toBe(true);
        await result;
        expect(isDisposed).toBe(true);
        expect(scope.test).toBe(undefined);
    });

    it('should dispose of multiple scoped services when [dispose] on scoped service provider is called', async () => {
        let isSingleton1Disposed = false;
        let isSingleton2Disposed = false;
        let isScoped1Disposed = false;
        let isScoped2Disposed = false;
        class Singleton1 {
            [Symbol.dispose]() {
                isSingleton1Disposed = true;
            }
        }
        class Singleton2 {
            [Symbol.dispose]() {
                isSingleton2Disposed = true;
            }
        }
        class Transient1 {
            x = 1;
        }
        class Scoped1 {
            [Symbol.dispose]() {
                isScoped1Disposed = true;
            }
        }
        class Scoped2 {
            async [Symbol.asyncDispose]() {
                isScoped2Disposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.singleton({ test1: Singleton1, test2: Singleton2 }))
            .register(m => m.transient({ test3: Transient1 }))
            .register(m => m.scoped({ test4: Scoped1, test5: Scoped2 }));
        
        const provider = container.prepare();
        const scope = provider.createScope();
        expect(isSingleton1Disposed).toBe(false);
        expect(isSingleton2Disposed).toBe(false);
        expect(isScoped1Disposed).toBe(false);
        expect(isScoped2Disposed).toBe(false);
        expect(scope.test1).toBeInstanceOf(Singleton1);
        expect(scope.test2).toBeInstanceOf(Singleton2);
        expect(scope.test3.x).toBe(1);
        expect(scope.test4).toBeInstanceOf(Scoped1);
        expect(scope.test5).toBeInstanceOf(Scoped2);
        await scope.dispose();
        expect(isSingleton1Disposed).toBe(false);
        expect(isSingleton2Disposed).toBe(false);
        expect(isScoped1Disposed).toBe(true);
        expect(isScoped2Disposed).toBe(true);
        expect(scope.test1).toBe(undefined);
        expect(scope.test2).toBe(undefined);
        expect(scope.test3).toBe(undefined);
        expect(scope.test4).toBe(undefined);
        expect(scope.test5).toBe(undefined);
    });
});