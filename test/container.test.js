//@ts-check
import { describe, it, expect } from 'vitest';
import { Container } from '../src/container.js';

describe('sync services', () => {
    describe('create()', () => {
        it('should create container with default config', () => {
            const container = Container.create();
            expect(container).toBeInstanceOf(Container);
        });

        it('should create container with custom config', () => {
            const container = Container.create({
                strict: false
            });
            expect(container).toBeInstanceOf(Container);
        });
    });

    describe('register()', () => {
        it('should register singleton service', () => {
            class TestService {}
            
            const container = Container.create()
                .register(m => m.singleton({
                    test: TestService
                }));

            const provider = container.prepare();
            expect(provider.test).toBeInstanceOf(TestService);
        });

        it('should register scoped service', () => {
            class TestService {}

            const container = Container.create()
                .register(m => m.singleton({
                    testSingleton: TestService
                }))
                .register(m => m.scoped({
                    test: TestService  
                }));

            const provider = container.prepare();
            const scope = provider.createScope();
            expect(scope.test).toBeInstanceOf(TestService);
        });

        it('should register transient service', () => {
            class TestService {}

            const container = Container.create()
                .register(m => m.transient({
                    test: TestService
                }));

            const provider = container.prepare();
            expect(provider.test).toBeInstanceOf(TestService);
        });
    });

    describe('prepare()', () => {
        it('should prepare container with registered services', () => {
            class TestService {}

            const container = Container.create()
                .register(m => m.singleton({
                    test: TestService
                }));

            const provider = container.prepare();
            expect(provider.test).toBeInstanceOf(TestService);
            expect(provider.createScope).toBeInstanceOf(Function);
        });
    });

    describe('scoping', () => {
        it('should not allow accessing scoped service from host provider (strict: false)', () => {
            class TestService {}

            const container = Container.create()
                .register(m => m.scoped({
                    test: TestService
                }));

            const provider = container.prepare();
            //@ts-expect-error
            expect(provider.test).toBeUndefined();
        });

        it('should not allow accessing scoped service from host provider (strict: true)', () => {
            class TestService {}

            const container = Container.create({ strict: true })
                .register(m => m.scoped({
                    test: TestService
                }));

            const provider = container.prepare();
            //@ts-expect-error
            expect(() => provider.test).toThrow();
        });

        it('should allow accessing scoped service from scope', () => {
            class Test1Service {
                x = 1;
            }

            class Test2Service {
                constructor({ test1 }) {
                    this.test1 = test1;
                }

                test() {
                    return this.test1.x;
                }
            }

            const container = Container.create()
                .register(m => m.scoped({
                    test1: Test1Service,
                    test2: Test2Service
                }));

            const provider = container.prepare();
            const scope = provider.createScope();
            expect(scope.test1).toBeInstanceOf(Test1Service);
            expect(scope.test2).toBeInstanceOf(Test2Service);
            expect(scope.test2.test()).toBe(1);
        });

        it('should have an undefined value for own singleton service name when attempting to de-reference services on instantiation (strict: false)', () => {
            let isUndefined = false;
            class TestService {
                constructor({ test }) {
                    isUndefined = test === undefined;
                }
            }

            const container = Container.create()
                .register(m => m.singleton({
                    test: TestService
                }));

            container.prepare();
            expect(isUndefined).toBe(true);
        });

        it('should have an undefined value for own transient service name when attempting to de-reference services on instantiation (strict: false)', () => {
            let isUndefined = false;
            class TestService {
                constructor({ test }) {
                    isUndefined = test === undefined;
                }
            }

            const container = Container.create()
                .register(m => m.transient({
                    test: TestService
                }));
            const provider = container.prepare();
            provider.test;
            expect(isUndefined).toBe(true);
        });

        it('should have an undefined value for own scoped service name when attempting to de-reference services on instantiation (strict: false)', () => {
            let isUndefined = false;
            class TestService {
                constructor({ test }) {
                    isUndefined = test === undefined;
                }
            }

            const container = Container.create()
                .register(m => m.scoped({
                    test: TestService
                }));
            const provider = container.prepare();
            provider.createScope();
            expect(isUndefined).toBe(true);
        });

        it('should throw when attempting to de-reference own singleton service name on instantiation (strict: true)', () => {
            class TestService {
                constructor({ test }) { }
            }

            const container = Container.create({ strict: true })
                .register(m => m.singleton({
                    test: TestService
                }));

            expect(() => container.prepare()).toThrow();
        });

        it('should throw when attempting to de-reference own transient service name on instantiation (strict: true)', () => {
            class TestService {
                constructor({ test }) { }
            }
            const container = Container.create({ strict: true })
                .register(m => m.transient({
                    test: TestService
                }));

            const provider = container.prepare();
            expect(() => provider.test).toThrow();
        });

        it('should throw when attempting to de-reference own scoped service name on instantiation (strict: true)', () => {
            class TestService {
                constructor({ test }) { }
            }

            const container = Container.create({ strict: true })
                .register(m => m.scoped({
                    test: TestService
                }));

            const provider = container.prepare();
            expect(() => provider.createScope()).toThrow();
        });

        it('should throw when attempting to de-reference [createScope] or [dispose] on services from instantiation (strict: false)', () => {
            let isUndefined = false;
            class TestService {
                /**
                 * 
                 * @param {import('../src/types.js').InferServiceProvider<typeof container, "test">} services
                 */
                constructor(services) {
                    //@ts-expect-error
                    const createScope = services.createScope;
                    //@ts-expect-error
                    const dispose = services.dispose;
                    isUndefined = createScope === undefined && dispose === undefined;
                }
            }

            const container = Container.create()
                .register(m => m.singleton({
                    test: TestService
                }));

            container.prepare();
            expect(isUndefined).toBe(true);
        });

        it('should throw when attempting to de-reference [createScope] or [dispose] on services from instantiation (strict: true)', () => {
            class TestService {
                constructor({ createScope, dispose }) { }
            }

            const container = Container.create({ strict: true })
                .register(m => m.singleton({
                    test: TestService
                }));

            expect(() => container.prepare()).toThrow();
        });
    });
});