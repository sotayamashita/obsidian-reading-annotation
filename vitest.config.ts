import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			annotate: resolve(__dirname, "src/annotate.ts"),
			"highlight-editor": resolve(__dirname, "src/highlight-editor.ts"),
			"annotation-types": resolve(__dirname, "src/annotation-types.ts"),
			"annotation-writer": resolve(__dirname, "src/annotation-writer.ts"),
			"annotation-modal": resolve(__dirname, "src/annotation-modal.ts"),
			"annotation-view": resolve(__dirname, "src/annotation-view.ts"),
			"annotation-header": resolve(__dirname, "src/annotation-header.ts"),
			"annotation-updater": resolve(__dirname, "src/annotation-updater.ts"),
			"annotation-parser": resolve(__dirname, "src/annotation-parser.ts"),
			"text-match": resolve(__dirname, "src/text-match.ts"),
			"highlight-store": resolve(__dirname, "src/highlight-store.ts"),
			"highlight-reading": resolve(__dirname, "src/highlight-reading.ts"),
			obsidian: resolve(__dirname, "src/__mocks__/obsidian.ts"),
		},
	},
	test: {
		restoreMocks: true,
		include: ["src/**/*.test.ts"],
	},
});
