export default {
    test: {
        coverage: {
            include: ["src/**/*.ts"],
            exclude: ["node_modules/**", "dist/**"],
            thresholds: {
                global: {
                    lines: 85,
                    functions: 80,
                    branches: 75,
                    statements: 85,
                },
            },
        },
    },
};
