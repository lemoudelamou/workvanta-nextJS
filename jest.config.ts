
import nextJest from "next/jest.js";
import type { Config } from "jest";


const createJestConfig = nextJest({
    dir: "./",
});

const config: Config = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
        moduleNameMapper: {
            "^@/(.*)$": "<rootDir>/src/$1",
        },
    testPathIgnorePatterns: [
        "<rootDir>/.next/",
        "<rootDir>/node_modules/",
        // Playwright end-to-end tests run separately (npm run test:e2e).
        "<rootDir>/e2e/",
    ],
};

export default createJestConfig(config);