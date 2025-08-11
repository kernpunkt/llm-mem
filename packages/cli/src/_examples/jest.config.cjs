module.exports = {
    collectCoverageFrom: [
        "src/**/*.{js,ts}",
        "!src/**/*.test.ts",
        "!dist/**",
    ],
    coverageThreshold: {
        global: {
            lines: 85,
            functions: 80,
            branches: 75,
            statements: 85,
        },
    },
};
