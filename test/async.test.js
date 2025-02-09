//@ts-check
import { describe, it, expect } from 'vitest'
import { Container } from '../src/container.js'

describe('async services', () => {
    describe('singletons', () => {
        it('should handle async singleton factory', async () => {
            const asyncService = async () => ({
                test: () => 'test'
            });

            const container = Container.create()
                .register(m => m.singleton({ 
                    test: asyncService 
                }));

            const provider = await container.prepare();
            expect(provider.test.test()).toBe('test');
        });

        it('should resolve all async singletons on prepare', async () => {
            let service1Created = false;
            let service2Created = false;

            const asyncService1 = async () => {
                service1Created = true;
                return { value: 1 };
            };

            const asyncService2 = async () => {
                service2Created = true; 
                return { value: 2 };
            };

            const container = Container.create()
                .register(m => m.singleton({
                    service1: asyncService1,
                    service2: asyncService2
                }));

            const provider = await container.prepare();

            expect(service1Created).toBe(true);
            expect(service2Created).toBe(true);
            expect(provider.service1.value).toBe(1);
            expect(provider.service2.value).toBe(2);
        });
    });

    describe('scoped', () => {
        it('should handle async scoped factory', async () => {
            const asyncService = async () => ({
                test: () => 'test'
            });

            const container = Container.create()
                .register(m => m.scoped({
                    test: asyncService
                }));

            const provider = container.prepare();
            const scope = await provider.createScope();
            expect(scope.test.test()).toBe('test');
        });

        it('should resolve all async scoped services when creating scope', async () => {
            let service1Created = false;
            let service2Created = false;

            const asyncService1 = async () => {
                service1Created = true;
                return { value: 1 };
            };

            const asyncService2 = async () => {
                service2Created = true;
                return { value: 2 };
            };

            const container = Container.create()
                .register(m => m.scoped({
                    service1: asyncService1,
                    service2: asyncService2
                }));

            const provider = container.prepare();
            const scope = await provider.createScope();

            expect(service1Created).toBe(true);
            expect(service2Created).toBe(true);
            expect(scope.service1.value).toBe(1);
            expect(scope.service2.value).toBe(2);
        });
    });

    describe('transient', () => {
        it('should handle async transient factory', async () => {
            const asyncService = async () => ({
                test: () => 'test'
            });

            const container = Container.create()
                .register(m => m.transient({
                    test: asyncService
                }));

            const provider = container.prepare();
            const service = await provider.test;
            expect(service.test()).toBe('test');
        });

        it('should create new instance on each request', async () => {
            let instanceCount = 0;

            const asyncService = async () => {
                instanceCount++;
                return { value: instanceCount };
            };

            const container = Container.create()
                .register(m => m.transient({
                    test: asyncService
                }));

            const provider = container.prepare();
            
            const instance1 = await provider.test;
            const instance2 = await provider.test;

            expect(instance1.value).toBe(1);
            expect(instance2.value).toBe(2);
            expect(instanceCount).toBe(2);
        });
    });

    describe('mixed lifetimes', () => {
        it('should handle mix of sync and async services', async () => {
            const syncService = () => ({ value: 1 });
            const asyncService = async () => ({ value: 2 });

            const container = Container.create()
                .register(m => m.singleton({ sync: syncService }))
                .register(m => m.singleton({ async: asyncService }));

            const provider = await container.prepare();
            expect(provider.sync.value).toBe(1);
            expect(provider.async.value).toBe(2);
        });

        it('should handle dependencies between sync and async singleton services', async () => {
            const asyncDep = async (services) => {
                return { value: 1 };
            };
            const syncService = (services) => ({
                getValue: () => {
                    return services.dep.value;
                }
            });

            const container = Container.create()
                .register(m => m.singleton({ dep: asyncDep }))
                .register(m => m.singleton({ service: syncService }));
            
            const provider = await container.prepare();
            expect(provider.service.getValue()).toBe(1);
        });

        it('should handle dependencies between sync and async scoped services', async () => {
            const asyncDep = async () => ({ value: 1 });
            const syncService = (services) => ({
                getValue: () => services.dep.value
            });

            const container = Container.create()
                .register(m => m.scoped({ dep: asyncDep }))
                .register(m => m.scoped({ service: syncService }));

            const provider = container.prepare();
            const scope = await provider.createScope();
            expect(scope.service.getValue()).toBe(1);
        });
    });
});