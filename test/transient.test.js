//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";

suite(`Transient`, () => {
    const provider = container.prepare();

    test(`Transient does not maintain state across multiple resolutions.`, () => {
        provider.AuthProvider.validateUser(0);
        expect(provider.AuthProvider.validations).toBe(0);
        const { AuthProvider } = provider;
        AuthProvider.validateUser(0);
        expect(AuthProvider.validations).toBe(1);
    });

    test(`Singleton should not be editable.`, () => {
        expect(() => provider.isDevMode = false).toThrowError(`Singleton registrations cannot be edited while [strict] mode is enabled.`);
    });

});