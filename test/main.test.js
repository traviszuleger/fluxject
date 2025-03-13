//@ts-check

import { describe, it, expect } from 'vitest'
import { extract, fluxject } from "../src/index.js";

describe('main', () => {
    it('should not be able to de-reference scoped service from host service provider', () => {
        class Test1 { };

        const container = fluxject()
            .register(m => m.scoped({ test1: Test1 }));

        const provider = container.prepare();
        //@ts-expect-error
        expect(provider.test1).toBeUndefined();
    });

    it('should not be able to de-reference own service from constructor', () => {
        let isTestUndefined = false;
        class Test {
            constructor({ test }) {
                isTestUndefined = test === undefined;
            }
        };

        const container = fluxject()
            .register(m => m.singleton({ test: Test }));

        const provider = container.prepare();
        expect(provider.test).toBeInstanceOf(Test);
        expect(isTestUndefined).toBe(true);
    });

    it('disposing of a host service provider should not dispose a scoped service provider if that scoped service provider is already disposed.', () => {
        let x = 0;
        class Test1 {
            [Symbol.dispose]() {
                x++;
            }
        }

        const container = fluxject()
            .register(m => m.scoped({ test1: Test1 }));

        const provider = container.prepare();
        const scope = provider.createScope();
        expect(scope.test1).toBeInstanceOf(Test1);
        scope.dispose();
        expect(x).toBe(1);
        scope.dispose();
        expect(x).toBe(1);
    });


    it('should be able to construct classes that are returned from services.', async () => {
        let myServiceX = 0;
        let myServiceY = "";
        let myServiceZ = false;
        const MyService = async () => class X {
            /**
             * 
             * @param {number} x 
             * @param {string} y 
             * @param {boolean} z 
             */
            constructor(x,y,z) {
                myServiceX = x;
                myServiceY = y;
                myServiceZ = z;
            } 
        };

        const container = fluxject()
            .register(m => m.singleton({ myService: MyService }));
        
        const provider = container.prepare();
        const myService = await provider.myService;
        new myService(1, "2", true);
        expect(myServiceX).toBe(1);
        expect(myServiceY).toBe("2");
        expect(myServiceZ).toBe(true);
    });

    it('should not be able to access scoped service from host service provider', () => {
        class Test1 { x = 1; };
        class Test2 { x = 2; };

        const container = fluxject()
            .register(m => m.scoped({ test1: Test1 }))
            .register(m => m.singleton({ test2: Test2 }));
        
        const provider = container.prepare();
        //@ts-expect-error 
        expect(provider.test1).toBeUndefined();
        const scope = provider.createScope();
        expect(scope.test1.x).toBe(1);
        //@ts-expect-error
        expect(provider.test1).toBeUndefined();
    });

    it('when disposing a scoped service, should remove the service provider that was disposed from the host service provider', () => {
        class Test1 { 
            x = 1;

            [Symbol.dispose]() {
                this.x = 0;
            }
        };
        class Test2 { 
            x = 2;
        };

        const container = fluxject()
            .register(m => m.scoped({ test1: Test1 }))
            .register(m => m.singleton({ test2: Test2 }));
        
        const provider = container.prepare();
        const scope1 = provider.createScope();
        const scope2 = provider.createScope();
        const scope3 = provider.createScope();
        expect(scope1.test1.x).toBe(1);
        expect(scope2.test1.x).toBe(1);
        expect(scope3.test1.x).toBe(1);

        scope2.dispose();

        expect(scope1.test1).toBeInstanceOf(Test1);
        expect(scope1.test1.x).toBe(1);
        expect(scope2.test1).toBeUndefined();
        expect(scope3.test1).toBeInstanceOf(Test1);
        expect(scope3.test1.x).toBe(1);
    });

    it('should dispose of scoped services in the correct order', () => {
        let isScoped1Disposed = false;
        let isScoped2Disposed = false;
        let isScoped3Disposed = false;
        class Scoped1 {
            constructor({ scope2, scope3 }) {
                this.scoped2 = scope2;
                this.scoped3 = scope3;
            }

            isDisposed = false;
            [Symbol.dispose]() {
                isScoped1Disposed = this.isDisposed = (this.scoped2.isDisposed && this.scoped3.isDisposed);
            }
        }
        class Scoped2 {
            constructor({ scope1, scope3 }) {
                this.scoped1 = scope1;
                this.scoped3 = scope3;
            }

            isDisposed = false;
            [Symbol.dispose]() {
                isScoped2Disposed = this.isDisposed = true;
            }
        }
        class Scoped3 {
            constructor({ scope1, scope2 }) {
                this.scoped1 = scope1; 
                this.scoped2 = scope2;
            }

            isDisposed = false;
            [Symbol.dispose]() {
                isScoped3Disposed = this.isDisposed = true;
            }
        }

        const container = fluxject()
            .addScopes({
                scope1: Scoped1
            })
            .addScopes({
                scope2: Scoped2,
                scope3: Scoped3
            });

        const provider = container.prepare();

        const scope = provider.createScope();

        expect(isScoped1Disposed).toBe(false);
        expect(isScoped2Disposed).toBe(false);
        expect(isScoped3Disposed).toBe(false);
        expect(scope.scope1.isDisposed).toBe(false);
        expect(scope.scope2.isDisposed).toBe(false);
        expect(scope.scope3.isDisposed).toBe(false);

        try {
            scope.dispose();
        }
        catch(err) {
            if(err instanceof AggregateError) {
                console.log(err.errors);
            }
        }

        expect(isScoped1Disposed).toBe(true);
        expect(isScoped2Disposed).toBe(true);
        expect(isScoped3Disposed).toBe(true);
    });

    it('scopes should dispose before singletons', async () => {
        let isScopedDisposed = false;
        let isSingletonDisposed = false;

        class Scoped {
            value = 0;
            disposed = false;
            async [Symbol.asyncDispose]() {
                console.log(`Disposing [Scoped]`);
                await new Promise(r => setTimeout(r, 1000));
                isScopedDisposed = this.disposed = true;
                console.log(`Disposed [Scoped]`);
            }
        }

        class Singleton {
            value = 1;

            [Symbol.dispose]() {
                console.log(`Disposing [Singleton]`);
                isSingletonDisposed = isScopedDisposed;
                console.log(`Disposed [Singleton]`);
            }
        }

        const container = fluxject()
            .addSingleton("singleton", Singleton)
            .addScope("scoped", Scoped)
        
        const provider = container.prepare();
        const scope = provider.createScope();

        expect(scope.scoped.value).toBe(0);
        expect(provider.singleton.value).toBe(1);
        expect(scope.singleton.value).toBe(1);

        await provider.dispose();

        expect(isScopedDisposed).toBe(true);
        expect(isSingletonDisposed).toBe(true);
    });

    
    it('should be able to extract a reference from a lazy reference', () => {
        class A { };

        const container = fluxject()
            .addSingleton("a", A);
        
        const provider = container.prepare();

        const a = extract(provider.a);

        provider.dispose();

        expect(a).toBeInstanceOf(A);
    });
});