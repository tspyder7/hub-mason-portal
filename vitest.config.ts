// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            reportOnFailure: true,
            thresholds: {
                lines: 100,
                branches: 100,
                functions: 100,
                statements: 100,
            },
        },
    },
});
