//@ts-check
import { suite, test, expect } from "vitest";
import { container } from "./mocks.js";
import { FLUXJECT_ID, FLUXJECT_LIFETIME, FLUXJECT_UPTIME } from "../src/container.js";

suite(`Fluxject Properties`, () => {
    test(`[enablePredefinedProperties] option is true`, () => {
        const hostServiceProvider = container.prepare({
            enablePredefinedProperties: true
        });
        expect(hostServiceProvider.DatabaseProvider[FLUXJECT_ID]).toBeDefined();
        expect(hostServiceProvider.DatabaseProvider[FLUXJECT_LIFETIME]).toBeDefined();
        expect(hostServiceProvider.DatabaseProvider[FLUXJECT_UPTIME]).toBeDefined();
        expect(hostServiceProvider.AuthProvider[FLUXJECT_ID]).toBeDefined();
        expect(hostServiceProvider.AuthProvider[FLUXJECT_LIFETIME]).toBeDefined();
        expect(hostServiceProvider.AuthProvider[FLUXJECT_UPTIME]).toBeDefined();

        const scoped = hostServiceProvider.createScope();
        expect(scoped.RequestDetail[FLUXJECT_ID]).toBeDefined();
        expect(scoped.RequestDetail[FLUXJECT_LIFETIME]).toBeDefined();
        expect(scoped.RequestDetail[FLUXJECT_UPTIME]).toBeDefined();

        // except on primitive values.
        expect(scoped.isDevMode[FLUXJECT_ID]).toBeUndefined();
    });

    test(`[enablePredefinedProperties] option is false`, () => {
        const hostServiceProvider = container.prepare();
        expect(() => hostServiceProvider.DatabaseProvider[FLUXJECT_ID]).toThrowError(`Cannot get [${String(FLUXJECT_ID)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => hostServiceProvider.DatabaseProvider[FLUXJECT_LIFETIME]).toThrowError(`Cannot get [${String(FLUXJECT_LIFETIME)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => hostServiceProvider.DatabaseProvider[FLUXJECT_UPTIME]).toThrowError(`Cannot get [${String(FLUXJECT_UPTIME)}] as the [enablePredefinedProperties] option is set to false.`);
        
        expect(() => hostServiceProvider.AuthProvider[FLUXJECT_ID]).toThrowError(`Cannot get [${String(FLUXJECT_ID)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => hostServiceProvider.AuthProvider[FLUXJECT_LIFETIME]).toThrowError(`Cannot get [${String(FLUXJECT_LIFETIME)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => hostServiceProvider.AuthProvider[FLUXJECT_UPTIME]).toThrowError(`Cannot get [${String(FLUXJECT_UPTIME)}] as the [enablePredefinedProperties] option is set to false.`);
    
        const scoped = hostServiceProvider.createScope();
        expect(() => scoped.RequestDetail[FLUXJECT_ID]).toThrowError(`Cannot get [${String(FLUXJECT_ID)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => scoped.RequestDetail[FLUXJECT_LIFETIME]).toThrowError(`Cannot get [${String(FLUXJECT_LIFETIME)}] as the [enablePredefinedProperties] option is set to false.`);
        expect(() => scoped.RequestDetail[FLUXJECT_UPTIME]).toThrowError(`Cannot get [${String(FLUXJECT_UPTIME)}] as the [enablePredefinedProperties] option is set to false.`);

        // should return undefined.
        expect(scoped.isDevMode[FLUXJECT_ID]).toBeUndefined();
    });
})