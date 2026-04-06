import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"annotation-types": resolve(__dirname, "src/annotation-types.ts"),
			"annotation-writer": resolve(__dirname, "src/annotation-writer.ts"),
			"annotation-modal": resolve(__dirname, "src/annotation-modal.ts"),
			"annotation-view": resolve(__dirname, "src/annotation-view.ts"),
			"annotation-header": resolve(__dirname, "src/annotation-header.ts"),
			"annotation-updater": resolve(__dirname, "src/annotation-updater.ts"),
			obsidian: resolve(__dirname, "src/__mocks__/obsidian.ts"),
		},
	},
	test: {
		restoreMocks: true,
		include: ["src/**/*.test.ts"],
	},
});
