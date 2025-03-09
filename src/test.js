//@ts-check
import * as X from "./index.js";

const provider = X.fluxject()
    .register(m => m.singleton({ a: class A{ test() { }} }))
    .prepare();

provider.a.test();
