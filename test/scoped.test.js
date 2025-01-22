//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";
import { FLUXJECT_ID } from "../src/types.js";

const hostProvider = await container.prepare({
    enablePredefinedProperties: true
});
suite(`Scoped`, async () => {
    const provider = await hostProvider.createScope();
    console.log(provider);

    test(`Scoped services maintain state across requests.`, () => {
        expect(provider.Secrets[FLUXJECT_ID]).toBe(provider.Secrets[FLUXJECT_ID]);
    });

    test(`Scoped services should NOT be accessible from the HostServiceProvider.`, () => {
        //@ts-expect-error
        expect(() => hostProvider.RequestDetail).toThrowError(`Scoped registrations cannot be accessed from the HostServiceProvider. (Use the ScopedServiceProvider returned from [createScope()] to access Scoped services.)`);
    });

    test(`Scoped services should NOT maintain the same state across other Scoped Services.`, async () => {
        const provider2 = await hostProvider.createScope();
        expect(provider.RequestDetail[FLUXJECT_ID]).not.toBe(provider2.RequestDetail[FLUXJECT_ID]);
    });

    test(`Scoped services should be editable`, () => {
        provider.x++;
        expect(provider.x).toBe(1);
    });

    test(`Scoped services being edited should not persist across other Scoped services.`, async () => {
        const provider2 = await hostProvider.createScope();
        expect(provider.x).not.toBe(provider2.x);
    })
});