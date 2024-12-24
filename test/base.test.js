//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";
import { FLUXJECT_ID, FLUXJECT_UPTIME } from "../src/types.js";

suite(`Base miscellaneous functionality`, () => {
    test(`FLUXJECT_ID appears on all services`, () => {
        const hostServiceProvider = container.prepare({
            enablePredefinedProperties: true
        });
        expect(hostServiceProvider.DatabaseProvider[FLUXJECT_ID]).not.toBeUndefined();
        expect(hostServiceProvider.AuthProvider[FLUXJECT_ID]).not.toBeUndefined();
        const scoped = hostServiceProvider.createScope();
        // except on primitive values.
        expect(scoped.isDevMode[FLUXJECT_ID]).toBeUndefined();
    });

    test(`FLUXJECT_ID does not appear on services, as [enablePredefinedProperties] is false.`, () => {
        const hostServiceProvider = container.prepare();
        expect(hostServiceProvider.DatabaseProvider[FLUXJECT_ID]).toBeUndefined();
        expect(hostServiceProvider.AuthProvider[FLUXJECT_ID]).toBeUndefined();
    });
})