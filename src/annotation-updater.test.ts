import { describe, expect, it } from "vitest";
import { replaceAnnotationType } from "annotation-updater";

describe("replaceAnnotationType", () => {
	const sampleContent = [
		"---",
		'source: "[[40-raw/Article]]"',
		"date: 2026-04-06",
		"type: reading-annotation",
		"---",
		"",
		"> Some quoted text ^ann-abc123",
		"",
		"> [!surprise]",
		"> My comment",
	].join("\n");

	it("replaces the callout type for a matching block ID", () => {
		const result = replaceAnnotationType(sampleContent, "ann-abc123", "question");
		expect(result).toContain("> [!question] 疑問");
		expect(result).not.toContain("> [!surprise]");
		expect(result).toContain("> Some quoted text ^ann-abc123");
		expect(result).toContain("> My comment");
	});

	it("returns content unchanged for non-matching block ID", () => {
		const result = replaceAnnotationType(sampleContent, "ann-nonexistent", "question");
		expect(result).toBe(sampleContent);
	});

	it("only changes the targeted entry in multi-entry content", () => {
		const multiContent = [
			"---",
			'source: "[[40-raw/Article]]"',
			"date: 2026-04-06",
			"type: reading-annotation",
			"---",
			"",
			"> First text ^ann-first",
			"",
			"> [!surprise]",
			"> Comment one",
			"",
			"---",
			"",
			"> Second text ^ann-second",
			"",
			"> [!resonance]",
			"> Comment two",
		].join("\n");

		const result = replaceAnnotationType(multiContent, "ann-second", "caution");
		expect(result).toContain("> [!surprise]");
		expect(result).toContain("> [!caution] 注意");
		expect(result).not.toContain("> [!resonance]");
	});

	it("does not rewrite a sibling whose block ID extends the target id", () => {
		const multiContent = [
			"---",
			"type: reading-annotation",
			"---",
			"",
			"> First ^ann-1",
			"",
			"> [!surprise] 驚き",
			"> c1",
			"",
			"---",
			"",
			"> Second ^ann-1x",
			"",
			"> [!resonance] 共感",
			"> c2",
		].join("\n");

		const result = replaceAnnotationType(multiContent, "ann-1", "caution");
		expect(result).toContain("> [!caution] 注意");
		expect(result).toContain("> [!resonance] 共感");
		expect(result.match(/\[!caution\]/g)).toHaveLength(1);
	});

	it("changes the callout header, not a quote line that starts with [!word]", () => {
		const content = [
			"---",
			"type: reading-annotation",
			"---",
			"",
			"> [!important] keep this quote ^ann-xyz",
			"",
			"> [!surprise] 驚き",
			"> my comment",
		].join("\n");

		const result = replaceAnnotationType(content, "ann-xyz", "question");
		expect(result).toContain("> [!important] keep this quote ^ann-xyz");
		expect(result).toContain("> [!question] 疑問");
		expect(result).not.toContain("> [!surprise] 驚き");
	});
});
