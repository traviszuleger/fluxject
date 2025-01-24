//@ts-check
import { describe, it, expect } from 'vitest'
import { Container } from '../src/container.js'

describe('dispose services', () => {
    describe('singletons', () => {
        it('should synchronously dispose singleton services (Symbol.dispose)', () => {
            let disposed = false;

            const syncService = () => ({
                [Symbol.dispose]: () => disposed = true
            });

            const container = Container.create()
                .register(m => m.singleton({ test: syncService }));

            const provider = container.prepare();
            provider.dispose();

            expect(disposed).toBe(true);
        });

        it('should asynchronously dispose singleton services (Symbol.asyncDispose)', async () => {
            let disposed = false;

            const syncService = () => ({
                [Symbol.asyncDispose]: async () => disposed = true
            });

            const container = Container.create()
                .register(m => m.singleton({ test: syncService }));

            const provider = container.prepare();
            await provider.dispose();

            expect(disposed).toBe(true);
        });

        it('should synchronously dispose multiple singleton services (Symbol.dispose)', () => {
            let disposed1 = false;
            let disposed2 = false;

            const syncService1 = () => ({
                [Symbol.dispose]: () => disposed1 = true
            });

            const syncService2 = () => ({
                [Symbol.dispose]: () => disposed2 = true
            });

            const container = Container.create()
                .register(m => m.singleton({ 
                    test1: syncService1,
                    test2: syncService2
                }));

            const provider = container.prepare();
            provider.dispose();

            expect(disposed1).toBe(true);
            expect(disposed2).toBe(true);
        });

        it('should asynchronously dispose multiple singleton services (Symbol.asyncDispose)', async () => {
            let disposed1 = false;
            let disposed2 = false;

            const syncService1 = () => ({
                [Symbol.asyncDispose]: async () => disposed1 = true
            });

            const syncService2 = () => ({
                [Symbol.asyncDispose]: async () => disposed2 = true
            });

            const container = Container.create()
                .register(m => m.singleton({ 
                    test1: syncService1,
                    test2: syncService2
                }));

            const provider = container.prepare();
            await provider.dispose();

            expect(disposed1).toBe(true);
            expect(disposed2).toBe(true);
        });

        it('should throw error when attempting to de-reference a disposed container', () => {
            const syncService = () => ({
                [Symbol.dispose]: () => {}
            });

            const container = Container.create()
                .register(m => m.singleton({ test: syncService }));

            const provider = container.prepare();
            provider.dispose();

            expect(() => provider.test).toThrowError();
        });

        it('should throw error when attempting to de-reference a disposed container (async)', async () => {
            const syncService = () => ({
                [Symbol.asyncDispose]: async () => {}
            });

            const container = Container.create()
                .register(m => m.singleton({ test: syncService }));

            const provider = container.prepare();
            await provider.dispose();

            expect(() => provider.test).toThrowError();
        });
    });

    describe('scoped', () => {
        it('should synchronously dispose scoped services (Symbol.dispose)', () => {
            let disposed = false;

            const syncService = () => ({
                [Symbol.dispose]: () => disposed = true
            });

            const container = Container.create()
                .register(m => m.scoped({ test: syncService }));

            const provider = container.prepare();
            const scope = provider.createScope();
            scope.dispose();

            expect(disposed).toBe(true);
        });

        it('should asynchronously dispose scoped services (Symbol.asyncDispose)', async () => {
            let disposed = false;

            const syncService = () => ({
                [Symbol.asyncDispose]: async () => disposed = true
            });

            const container = Container.create()
                .register(m => m.scoped({ test: syncService }));

            const provider = container.prepare();
            const scope = provider.createScope();
            await scope.dispose();

            expect(disposed).toBe(true);
        });

        it('should synchronously dispose multiple scoped services (Symbol.dispose)', () => {
            let disposed1 = false;
            let disposed2 = false;

            const syncService1 = () => ({
                [Symbol.dispose]: () => disposed1 = true
            });

            const syncService2 = () => ({
                [Symbol.dispose]: () => disposed2 = true
            })

            const container = Container.create()
                .register(m => m.scoped({ 
                    test1: syncService1,
                    test2: syncService2
                }));

            const provider = container.prepare();
            const scope = provider.createScope();
            scope.dispose();

            expect(disposed1).toBe(true);
            expect(disposed2).toBe(true);
        });

        it('should asynchronously dispose multiple scoped services (Symbol.asyncDispose)', async () => {
            let disposed1 = false;
            let disposed2 = false;

            const syncService1 = () => ({
                [Symbol.asyncDispose]: async () => {
                    disposed1 = true;
                }
            });

            const syncService2 = () => ({
                [Symbol.asyncDispose]: async () => {
                    disposed2 = true;
                }
            });

            const container = Container.create()
                .register(m => m.scoped({ 
                    test1: syncService1,
                    test2: syncService2
                }));

            const provider = container.prepare();
            const scope = provider.createScope();
            await scope.dispose();

            expect(disposed1).toBe(true);
            expect(disposed2).toBe(true);
        });

        it('should throw error when attempting to de-reference a disposed container', () => {
            const syncService = () => ({
                [Symbol.dispose]: () => {}
            });

            const container = Container.create()
                .register(m => m.scoped({ test: syncService }));

            const provider = container.prepare();
            const scope = provider.createScope();
            scope.dispose();

            expect(() => scope.test).toThrowError();
        });

        it('should throw error when attempting to de-reference a disposed container (async)', async () => {
            const syncService = () => ({
                [Symbol.asyncDispose]: async () => {}
            });

            const container = Container.create()
                .register(m => m.scoped({ test: syncService }));

            const provider = container.prepare();
            const scope = provider.createScope();
            await scope.dispose();

            expect(() => scope.test).toThrowError();
        });
    });
});