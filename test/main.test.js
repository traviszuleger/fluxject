//@ts-check

import { describe, it, expect } from 'vitest'
import { fluxject } from "../src/index.js";

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
        console.log(myService);
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

    it('should not be able to leak reference of transient service outside provider', async () => {
        let numInstances = 0;
        class TransientService {
            #x = 1;
        
            get x() { return this.#x;}
        
            constructor() {
                numInstances++;
                console.log(`Instantiating TransientService (#${numInstances})`);
            }
        
            get ref() {
                this.#x = 2;
                return this;
            }
        
            getRef() {
                this.#x = 3;
                return this;
            }
        
            async getRefAsync() {
                this.#x = 4;
                return this;
            }
        
            getRefAsync2() {
                this.#x = 5;
                return new Promise(res => res(new Promise(res => res(new Promise(res => res(this))))));
            }
        };
        
        const container = fluxject()
            .register(m => m.transient({ transientService: TransientService }));

        const provider = container.prepare();
        
        console.log(`x:`, provider.transientService.x);
        console.log(`Finished x.`);
        console.log(`ref.x:`, provider.transientService.ref.x);
        console.log(`Finished ref.x`);
        console.log(`getRef().x`, provider.transientService.getRef().x);
        console.log(`Finished getRef().x`);
        console.log(`(await getRefAsync()).x`, (await provider.transientService.getRefAsync()).x);
        console.log(`Finished (await getRefAsync()).x`);
        console.log(`(await getRefAsync2()).x`, (await provider.transientService.getRefAsync2()).x);
        console.log(`Finished (await getRefAsync2()).x`);
    });
});