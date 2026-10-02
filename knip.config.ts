import type { KnipConfig } from "knip";

export default {
	entry: ["src/**/*.test.ts"],
	project: ["src/**/*.ts", "*.{ts,mts,mjs,js}"],
	paths: { "*": ["src/*"] },
	// Obsidianがエントリーポイントを読み込み、hkがCLIを呼び出す。
	ignoreDependencies: ["@commitlint/cli"],
} satisfies KnipConfig;
