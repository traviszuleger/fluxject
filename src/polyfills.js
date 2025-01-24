//@ts-check

export function addPolyfills() {
    console.log(`Adding polyfills...`);
    //@ts-ignore
    Symbol.asyncDispose ??= Symbol.for("asyncDispose");
    //@ts-ignore
    Symbol.dispose ??= Symbol.for("dispose");
}

export function needsPolyfills() {
    return typeof Symbol.dispose !== "symbol" || typeof Symbol.asyncDispose !== "symbol";
}