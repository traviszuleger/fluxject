//@ts-check
import { describe, it, expect } from 'vitest'
import { fluxject } from "../src/index.js";
import { isPromise } from 'util/types';

describe('singletons', () => {
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
            .register(m => m.singleton({ test: Test }));
        
        const provider = container.prepare();
        expect(isInstantiated).toBe(false);
        provider.test.doNothing();
        expect(isInstantiated).toBe(true);
    });

    it('should return true when checking instance type', () => {
        class Test {}

        const container = fluxject()
            .register(m => m.singleton({ test: Test }));
        
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
            .register(m => m.singleton({ test1: Test1 }))
            .register(m => m.singleton({ test2: Test2 }));
        
        const provider = container.prepare();
        provider.test2.doNothing();
        expect(canDeReference).toBe(true);
        expect(test1X).toBe(1);
    });

    it('should be able to reference dependency A from dependency B and dependency B from dependency A', () => {
        let dependencyAtestInvoked = false;
        let dependencyBtestInvoked = false;
        class DependencyA {
            constructor({ dependencyB }) {
                this.dependencyB = dependencyB;
            }

            invokeDependencyBtest() {
                this.dependencyB.test();
            }

            test() {
                dependencyAtestInvoked = true;
            }
        }
        
        class DependencyB {
            constructor({ dependencyA }) {
                this.dependencyA = dependencyA;
            }

            invokeDependencyAtest() {
                this.dependencyA.test();
            }

            test() {
                dependencyBtestInvoked = true;
            }
        }

        const container = fluxject()
            .register(m => m.singleton({ dependencyA: DependencyA }))
            .register(m => m.singleton({ dependencyB: DependencyB }));
        
        const provider = container.prepare();

        provider.dependencyA.invokeDependencyBtest();
        provider.dependencyB.invokeDependencyAtest();
        expect(dependencyAtestInvoked).toBe(true);
        expect(dependencyBtestInvoked).toBe(true);
    });

    it('should expect CircularDependencyError to be thrown when two dependencies access each-other from their constructor (circular dependency)', () => {
        let error = undefined;
        class DependencyA {
            constructor({ dependencyB }) {
                dependencyB.test;
                this.test = 1;
            }
        }
        
        class DependencyB {
            test = 1;
            constructor({ dependencyA }) {
                try {
                    dependencyA.test;
                }
                catch(err) {
                    error = err;
                    throw err;
                }
            }

            doNothing() {

            }
        }

        const container = fluxject()
            .register(m => m.singleton({ dependencyA: DependencyA }))
            .register(m => m.singleton({ dependencyB: DependencyB }));
        
        const provider = container.prepare();
        expect(() => provider.dependencyB.doNothing()).toThrow(RangeError);
    });

    it('should not be able to access scoped services from within singleton services', () =>{
        let isDependencyBUndefined = false;
        class DependencyA {
            constructor({ dependencyB }) {
                isDependencyBUndefined = dependencyB === undefined;
            }
            doNothing() {

            }
        }
        
        class DependencyB { }

        const container = fluxject()
            .register(m => m.singleton({ dependencyA: DependencyA }))
            .register(m => m.scoped({ dependencyB: DependencyB }));
        
        const provider = container.prepare();
        provider.dependencyA.doNothing();
        expect(isDependencyBUndefined).toBe(true);
    });

    it('should not be able to invoke [createScope] or [dispose] from within a singleton service', () => {
        let isCreateScopeUndefined = false;
        let isDisposeUndefined = false;
        class Test {
            constructor(services) {
                isCreateScopeUndefined = services.createScope === undefined;
                isDisposeUndefined = services.dispose === undefined;
            }

            doNothing() {

            }
        }

        const container = fluxject()
            .register(m => m.singleton({ test: Test }));
        
        const provider = container.prepare();
        provider.test.doNothing();
        expect(isCreateScopeUndefined).toBe(true);
        expect(isDisposeUndefined).toBe(true);
    });

    it('should dispose of singleton services when [dispose] is called', () => {
        let isDisposed = false;
        class Test {
            [Symbol.dispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.singleton({ test: Test }));
        
        const provider = container.prepare();
        expect(isDisposed).toBe(false);
        expect(provider.test).toBeInstanceOf(Test);
        provider.dispose();
        expect(provider.test).toBe(undefined);
    });

    it('should asynchronously dispose of singleton services when [dispose] is called', async () => {
        let isDisposed = false;
       
        class Test {
            async [Symbol.asyncDispose]() {
                isDisposed = true;
            }
        }

        const container = fluxject()
            .register(m => m.singleton({ test: Test }));
        
        const provider = container.prepare();
        expect(isDisposed).toBe(false);
        expect(provider.test).toBeInstanceOf(Test);
        const result = provider.dispose();
        expect(isPromise(result)).toBe(true);
        await result;
        expect(isDisposed).toBe(true);
        expect(provider.test).toBe(undefined);
    });
});