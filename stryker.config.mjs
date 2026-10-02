export default {
	plugins: ["@stryker-mutator/vitest-runner"],
	reporters: ["clear-text", "progress"],
	testRunner: "vitest",
	mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/__mocks__/**"],
};
