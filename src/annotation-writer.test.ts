import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import {
	getAnnotationPath,
	toBlockquote,
	formatEntry,
	formatFrontmatter,
	generateBlockId,
	ensureUniqueBlockId,
	extractBlockIds,
	extractAnnotationSource,
	writeAnnotation,
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

	it("attaches block ID to the last non-empty line when the selection ends in a newline", () => {
		const result = formatEntry("real text\n", surprise, "comment");
		const blockId = generateBlockId("real text\n");
		expect(result).toContain(`> real text ^${blockId}`);
		// The block ref must not land on an empty "> " line (unresolvable ref).
		expect(result).not.toContain(`>  ^${blockId}`);
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

describe("ensureUniqueBlockId", () => {
	it("returns the base id when unused", () => {
		expect(ensureUniqueBlockId("ann-1a", new Set())).toBe("ann-1a");
	});

	it("appends a suffix when the base id is already taken", () => {
		const id = ensureUniqueBlockId("ann-1a", new Set(["ann-1a"]));
		expect(id).not.toBe("ann-1a");
		expect(id).toMatch(/^ann-[a-z0-9]+$/);
	});

	it("skips taken suffixes until it finds a free id", () => {
		const taken = new Set(["ann-1a", "ann-1a2", "ann-1a3"]);
		const id = ensureUniqueBlockId("ann-1a", taken);
		expect(taken.has(id)).toBe(false);
		expect(id).toMatch(/^ann-[a-z0-9]+$/);
	});
});

describe("extractBlockIds", () => {
	it("collects every block id in the content", () => {
		const content = "> a ^ann-1\n\n> [!note] x\n\n---\n\n> b ^ann-2x";
		expect(extractBlockIds(content)).toEqual(new Set(["ann-1", "ann-2x"]));
	});

	it("returns an empty set when there are none", () => {
		expect(extractBlockIds("no ids here")).toEqual(new Set());
	});
});

describe("extractAnnotationSource", () => {
	it("reads the source wikilink from frontmatter", () => {
		const content = '---\nsource: "[[40-raw/Article]]"\ntype: reading-annotation\n---\n';
		expect(extractAnnotationSource(content)).toBe("40-raw/Article");
	});

	it("returns null when no source is present", () => {
		expect(extractAnnotationSource("no frontmatter")).toBeNull();
	});
});

describe("writeAnnotation", () => {
	const surprise = { id: "surprise", label: "驚き", icon: "lightbulb" };

	// The mock TFile takes a path; the real obsidian type declares a 0-arg
	// constructor, so cast to construct a real mock instance (instanceof must
	// still hold for writeAnnotation's TFile check).
	const makeFile = (p: string): TFile => new (TFile as unknown as { new (path: string): TFile })(p);

	function makeVault(initial: Record<string, string> = {}) {
		const files = new Map(Object.entries(initial));
		const vault = {
			files,
			getAbstractFileByPath: (p: string) => (files.has(p) ? makeFile(p) : null),
			read: async (f: TFile) => files.get(f.path) ?? "",
			append: async (f: TFile, data: string) => {
				files.set(f.path, (files.get(f.path) ?? "") + data);
			},
			create: async (p: string, data: string) => {
				if (files.has(p)) throw new Error("exists");
				files.set(p, data);
			},
			createFolder: async () => {},
		};
		return vault;
	}

	it("assigns distinct block ids to two annotations of the same text", async () => {
		const vault = makeVault();
		await writeAnnotation(vault as never, "40-raw/A.md", "same text", surprise, "c1");
		await writeAnnotation(vault as never, "40-raw/A.md", "same text", surprise, "c2");
		const content = vault.files.get("42-annotation/A.md")!;
		const ids = [...content.matchAll(/\^(ann-[a-z0-9]+)/g)].map((m) => m[1]);
		expect(ids).toHaveLength(2);
		expect(new Set(ids).size).toBe(2);
	});

	it("appends to the annotation file that belongs to the same note", async () => {
		const vault = makeVault({
			"42-annotation/A.md":
				'---\nsource: "[[40-raw/A]]"\ntype: reading-annotation\n---\n\n> q ^ann-1\n\n> [!surprise] 驚き\n>',
		});
		await writeAnnotation(vault as never, "40-raw/A.md", "new text", surprise, "c");
		const content = vault.files.get("42-annotation/A.md")!;
		expect(content).toContain("new text");
		expect([...content.matchAll(/\^(ann-[a-z0-9]+)/g)]).toHaveLength(2);
	});

	it("refuses to write into an annotation file owned by a different note", async () => {
		const vault = makeVault({
			"42-annotation/A.md":
				'---\nsource: "[[40-raw/A]]"\ntype: reading-annotation\n---\n\n> q ^ann-1\n\n> [!surprise] 驚き\n>',
		});
		await expect(
			writeAnnotation(vault as never, "90-archive/A.md", "new text", surprise, "c"),
		).rejects.toThrow(/different|belongs/);
	});
});
