//@ts-check
import { test, expect, suite } from 'vitest';
import { container } from './mocks/index.js';

const hostProvider = container
    .prepare();

test("Test singleton", () => {
    expect(hostProvider.vitest.x).toBe(0);
    expect(hostProvider.vitest.y).toBe(0);
    expect(hostProvider.vitest.z).toBe(0);
    expect(hostProvider.vitest.foo).toBe("foo");
    expect(hostProvider.vitest.bar).toBe("bar");
    expect(hostProvider.vitest.biz).toBe("biz");
    expect(hostProvider.vitest.dbClosed).toBe(false);
    expect(hostProvider.vitest.lastDbCommand).toBe("");

    const scope = hostProvider.createScope();
    scope.database.close();

    expect(hostProvider.vitest.dbClosed).toBe(true);
    expect(hostProvider.settings).toBe(scope.settings);
    expect(hostProvider.vitest).toBe(scope.vitest);
});

test("Test transient", () => {
    const scope = hostProvider.createScope();

    const scope2 = hostProvider.settings.createScope();
    expect(scope2.locals).not.toBeUndefined();

    expect(hostProvider.cache.locals).not.toBeUndefined();

    hostProvider.database
    hostProvider.cache

    expect(hostProvider.database).not.toEqual(scope.database);
    expect(hostProvider.cache).not.toEqual(scope.cache);
});

test("Test scoped", () => {
    const scope1 = hostProvider.createScope();
    const scope2 = hostProvider.createScope();
    
    scope1.locals.user.firstName = "John";
    scope1.locals.user.lastName = "Doe";
    scope1.locals.user.id = "1";
    scope1.locals.user.email = "johndoe@example.com";
    
    expect(scope1.test).toBe(5);
    scope1.locals.incrementTest();
    expect(scope1.test).toBe(6);
    
    expect(scope1.locals).not.toEqual(scope2.locals);
    expect(scope1.database).not.toEqual(scope1.database);
    expect(scope2.database).not.toEqual(scope2.database);
});