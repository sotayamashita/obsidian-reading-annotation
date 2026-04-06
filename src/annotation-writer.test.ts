import { describe, expect, it } from "vitest";
import { getAnnotationPath, toBlockquote, formatEntry, formatFrontmatter } from "annotation-writer";

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

	it("formats quote and comment", () => {
		const result = formatEntry("selected text", surprise, "my comment");
		expect(result).toBe("> selected text\n\n> [!surprise]\n> my comment");
	});

	it("handles empty comment", () => {
		const result = formatEntry("selected text", surprise, "");
		expect(result).toBe("> selected text\n\n> [!surprise]\n>");
	});

	it("handles whitespace-only comment", () => {
		const result = formatEntry("selected text", surprise, "   ");
		expect(result).toBe("> selected text\n\n> [!surprise]\n>");
	});

	it("handles multiline quote and comment", () => {
		const result = formatEntry("line1\nline2", surprise, "comment1\ncomment2");
		expect(result).toBe("> line1\n> line2\n\n> [!surprise]\n> comment1\n> comment2");
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
