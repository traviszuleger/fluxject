//@ts-check

export function addPolyfills() {
    //@ts-ignore
    Symbol.asyncDispose ??= Symbol.for("asyncDispose");
    //@ts-ignore
    Symbol.dispose ??= Symbol.for("dispose");
}

export function needsPolyfills() {
    return typeof Symbol.dispose !== "symbol" || typeof Symbol.asyncDispose !== "symbol";
}