import { describe, expect, it } from "vitest";
import { parseBlockquoteLine, parseAnnotationFile } from "annotation-view";

describe("parseBlockquoteLine", () => {
	it("extracts content after '> '", () => {
		expect(parseBlockquoteLine("> hello")).toBe("hello");
	});

	it("returns empty string for bare '>'", () => {
		expect(parseBlockquoteLine(">")).toBe("");
	});

	it("returns null for non-blockquote line", () => {
		expect(parseBlockquoteLine("plain text")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseBlockquoteLine("")).toBeNull();
	});
});

describe("parseAnnotationFile", () => {
	const sampleContent = [
		"---",
		'source: "[[40-raw/Article]]"',
		"date: 2026-04-06",
		"type: reading-annotation",
		"---",
		"",
		"> First quoted text",
		"",
		"> [!surprise]",
		"> This surprised me",
		"",
		"---",
		"",
		"> Second quoted text",
		"",
		"> [!question]",
		"> Why is this?",
	].join("\n");

	it("parses entries from annotation file", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries).toHaveLength(2);
	});

	it("extracts quote text", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries[0]!.quote).toBe("First quoted text");
		expect(entries[1]!.quote).toBe("Second quoted text");
	});

	it("extracts annotation type", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries[0]!.type).toBe("surprise");
		expect(entries[1]!.type).toBe("question");
	});

	it("extracts comment text", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries[0]!.comment).toBe("This surprised me");
		expect(entries[1]!.comment).toBe("Why is this?");
	});

	it("resolves type labels from ANNOTATION_TYPES", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries[0]!.typeLabel).toBe("驚き");
		expect(entries[1]!.typeLabel).toBe("疑問");
	});

	it("handles empty comment (bare >)", () => {
		const content = [
			"---",
			'source: "[[40-raw/X]]"',
			"date: 2026-04-06",
			"type: reading-annotation",
			"---",
			"",
			"> Some text",
			"",
			"> [!caution]",
			">",
		].join("\n");
		const entries = parseAnnotationFile(content);
		expect(entries).toHaveLength(1);
		expect(entries[0]!.comment).toBe("");
	});

	it("extracts blockID from quote with block reference", () => {
		const content = [
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
		const entries = parseAnnotationFile(content);
		expect(entries).toHaveLength(1);
		expect(entries[0]!.blockId).toBe("ann-abc123");
		expect(entries[0]!.quote).toBe("Some quoted text");
	});

	it("returns empty blockId when no block reference exists", () => {
		const entries = parseAnnotationFile(sampleContent);
		expect(entries[0]!.blockId).toBe("");
	});

	it("returns empty array for content without frontmatter", () => {
		expect(parseAnnotationFile("no frontmatter here")).toEqual([]);
	});

	it("returns empty array for empty body", () => {
		const content = "---\nkey: value\n---\n";
		expect(parseAnnotationFile(content)).toEqual([]);
	});

	it("skips blocks without any blockquote lines (e.g. claims section)", () => {
		const content = [
			"---",
			'source: "[[40-raw/Article]]"',
			"type: reading-annotation",
			"---",
			"",
			"## 重要なポイント",
			"",
			"- 主張 1",
			"- 主張 2",
			"",
			"---",
			"",
			"> Quoted text ^ann-abc123",
			"",
			"> [!note] メモ",
			"> A comment",
		].join("\n");
		const entries = parseAnnotationFile(content);
		expect(entries).toHaveLength(1);
		expect(entries[0]!.blockId).toBe("ann-abc123");
		expect(entries[0]!.quote).toBe("Quoted text");
	});

	it("skips claims section placed between entries", () => {
		const content = [
			"---",
			'source: "[[40-raw/Article]]"',
			"type: reading-annotation",
			"---",
			"",
			"> First ^ann-aaa",
			"",
			"> [!note] メモ",
			"> c1",
			"",
			"---",
			"",
			"## 補足",
			"",
			"plain prose here",
			"",
			"---",
			"",
			"> Second ^ann-bbb",
			"",
			"> [!question] 疑問",
			"> c2",
		].join("\n");
		const entries = parseAnnotationFile(content);
		expect(entries).toHaveLength(2);
		expect(entries[0]!.blockId).toBe("ann-aaa");
		expect(entries[1]!.blockId).toBe("ann-bbb");
	});
});
