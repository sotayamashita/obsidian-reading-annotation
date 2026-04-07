import { describe, expect, it } from "vitest";
import {
	getAnnotationPath,
	toBlockquote,
	formatEntry,
	formatFrontmatter,
	generateBlockId,
} from "annotation-writer";

describe("getAnnotationPath", () => {
	it("extracts filename and places in 42-annotation/", () => {
		expect(getAnnotationPath("40-raw/Article Title.md")).toBe("42-annotation/Article Title.md");
	});

	it("handles nested paths", () => {
		expect(getAnnotationPath("some/deep/path/file.md")).toBe("42-annotation/file.md");
	});

	it("handles bare filename", () => {
		expect(getAnnotationPath("file.md")).toBe("42-annotation/file.md");
	});
});

describe("toBlockquote", () => {
	it("prefixes single line", () => {
		expect(toBlockquote("hello")).toBe("> hello");
	});

	it("prefixes each line", () => {
		expect(toBlockquote("line1\nline2\nline3")).toBe("> line1\n> line2\n> line3");
	});

	it("handles empty string", () => {
		expect(toBlockquote("")).toBe("> ");
	});
});

describe("formatEntry", () => {
	const surprise = { id: "surprise", label: "驚き", icon: "lightbulb" };

	it("formats quote with block ID and comment", () => {
		const result = formatEntry("selected text", surprise, "my comment");
		const blockId = generateBlockId("selected text");
		expect(result).toContain(`> selected text ^${blockId}`);
		expect(result).toContain("> [!surprise] 驚き\n> my comment");
	});

	it("handles empty comment with block ID", () => {
		const result = formatEntry("selected text", surprise, "");
		const blockId = generateBlockId("selected text");
		expect(result).toContain(`^${blockId}`);
		expect(result).toContain("> [!surprise] 驚き\n>");
	});

	it("handles multiline quote with block ID on last line", () => {
		const result = formatEntry("line1\nline2", surprise, "comment");
		const blockId = generateBlockId("line1\nline2");
		expect(result).toContain(`> line2 ^${blockId}`);
	});
});

describe("generateBlockId", () => {
	it("returns a deterministic ID for the same text", () => {
		const id1 = generateBlockId("hello world");
		const id2 = generateBlockId("hello world");
		expect(id1).toBe(id2);
	});

	it("returns different IDs for different text", () => {
		const id1 = generateBlockId("hello world");
		const id2 = generateBlockId("goodbye world");
		expect(id1).not.toBe(id2);
	});

	it("returns an ID starting with 'ann-'", () => {
		const id = generateBlockId("test");
		expect(id).toMatch(/^ann-[a-z0-9]+$/);
	});
});

describe("formatFrontmatter", () => {
	it("strips .md extension for wikilink", () => {
		const result = formatFrontmatter("40-raw/Article.md");
		expect(result).toContain('source: "[[40-raw/Article]]"');
	});

	it("includes type: reading-annotation", () => {
		const result = formatFrontmatter("40-raw/Article.md");
		expect(result).toContain("type: reading-annotation");
	});

	it("includes date in YYYY-MM-DD format", () => {
		const result = formatFrontmatter("40-raw/Article.md");
		expect(result).toMatch(/date: \d{4}-\d{2}-\d{2}/);
	});

	it("wraps in frontmatter delimiters", () => {
		const result = formatFrontmatter("40-raw/Article.md");
		expect(result).toMatch(/^---\n[\s\S]*\n---$/);
	});
});
