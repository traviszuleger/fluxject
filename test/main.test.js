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
});