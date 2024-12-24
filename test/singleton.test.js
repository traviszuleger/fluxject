//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";
import { FLUXJECT_ID } from "../src/types.js";

const provider = container.prepare({
    enablePredefinedProperties: true
});
suite(`Singleton`, () => {

    test(`Singleton maintains state across requests.`, () => {
        expect(provider.Secrets[FLUXJECT_ID]).toBe(provider.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton maintains state across scoped requests.`, () => {
        const scope1 = provider.createScope();
        expect(scope1.Secrets[FLUXJECT_ID]).toBe(provider.Secrets[FLUXJECT_ID]);
        const scope2 = provider.createScope();
        expect(scope1.Secrets[FLUXJECT_ID]).toBe(scope2.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton should NOT maintain requests across preparations.`, () => {
        const provider2 = container.prepare({
            enablePredefinedProperties: true
        });
        expect(provider.Secrets[FLUXJECT_ID]).not.toBe(provider2.Secrets[FLUXJECT_ID]);
    });

    test(`Singleton should not be editable when [strict] mode is [true].`, () => {
        expect(() => provider.isDevMode = false).toThrowError(`Singleton registrations cannot be edited while [strict] mode is enabled.`);
    });

});