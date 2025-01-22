//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";
import { FLUXJECT_ID } from "../src/types.js";

const provider = await container.prepare({
    enablePredefinedProperties: true
});
suite(`Singleton`, () => {
    console.log(provider);
    test(`Singleton maintains state across requests.`, () => {
        expect(provider.Secrets[FLUXJECT_ID]).toBe(provider.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton maintains state across scoped requests.`, async () => {
        const scope1 = await provider.createScope();
        expect(scope1.Secrets[FLUXJECT_ID]).toBe(provider.Secrets[FLUXJECT_ID]);
        const scope2 = await provider.createScope();
        expect(scope1.Secrets[FLUXJECT_ID]).toBe(scope2.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton should NOT maintain requests across preparations.`, async () => {
        const provider2 = await container.prepare({
            enablePredefinedProperties: true
        });
        expect(provider.Secrets[FLUXJECT_ID]).not.toBe(provider2.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton should not be editable when [strict] mode is [true].`, () => {
        expect(() => provider.isDevMode = false).toThrowError(`Singleton registrations cannot be edited while [strict] mode is enabled.`);
    });

    test(`Asynchronous singletons should be available, as long as [.prepare()] was called with await.`, () => {
        expect(provider.mySingletonAsyncService).not.toHaveProperty("then");
    });
});