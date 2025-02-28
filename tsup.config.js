import { defineConfig } from 'tsup';
export default defineConfig({
    entry: {
        index: "./src2/index.js"
    },
    outDir: 'dist',
    target: 'node22',
    format: ['esm'],
    treeshake: true,
    clean: true,
    minify: false,
    sourcemap: "inline"
});