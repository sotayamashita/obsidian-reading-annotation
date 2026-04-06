// eslint-disable-next-line import/no-nodejs-modules -- test-only: reads source files for static analysis
import { readFileSync } from "fs";
// eslint-disable-next-line import/no-nodejs-modules
import { resolve, dirname } from "path";
// eslint-disable-next-line import/no-nodejs-modules
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SOURCE_FILES = [
	"src/main.ts",
	"src/annotation-types.ts",
	"src/annotation-modal.ts",
	"src/annotation-writer.ts",
	"src/annotation-view.ts",
	"src/annotation-header.ts",
	"src/annotation-updater.ts",
];

const DANGEROUS_PATTERNS = [
	{ pattern: /\beval\s*\(/, label: "eval(" },
	{ pattern: /\bnew\s+Function\s*\(/, label: "new Function(" },
	{ pattern: /\.innerHTML\b/, label: ".innerHTML" },
	{ pattern: /\.outerHTML\b/, label: ".outerHTML" },
	{ pattern: /\.insertAdjacentHTML\b/, label: ".insertAdjacentHTML" },
];

describe("static security guardrails", () => {
	for (const file of SOURCE_FILES) {
		describe(file, () => {
			const content = readFileSync(resolve(ROOT, file), "utf-8");

			for (const { pattern, label } of DANGEROUS_PATTERNS) {
				it(`does not use ${label}`, () => {
					expect(content).not.toMatch(pattern);
				});
			}
		});
	}
});
