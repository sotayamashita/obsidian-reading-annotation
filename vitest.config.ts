import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"annotation-types": path.resolve(__dirname, "src/annotation-types.ts"),
			"annotation-writer": path.resolve(__dirname, "src/annotation-writer.ts"),
			"annotation-modal": path.resolve(__dirname, "src/annotation-modal.ts"),
			"annotation-view": path.resolve(__dirname, "src/annotation-view.ts"),
			obsidian: path.resolve(__dirname, "src/__mocks__/obsidian.ts"),
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
});
