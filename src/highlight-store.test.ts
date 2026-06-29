import { describe, expect, it } from "vitest";
import { TFile, type Vault } from "obsidian";
import { createHighlightStore } from "highlight-store";

type RuntimeTFileConstructor = new (path: string) => TFile;

const RuntimeTFile = TFile as unknown as RuntimeTFileConstructor;

function makeVault(content: string): Vault {
	const file = new RuntimeTFile("42-annotation/Article.md");
	return {
		getAbstractFileByPath: (path: string) => (path === file.path ? file : null),
		cachedRead: async () => content,
	} as unknown as Vault;
}

describe("highlight-store", () => {
	it("notifies listeners with the changed sourcePath", async () => {
		const content = `---
source: "[[40-raw/Article]]"
date: 2026-04-07
type: reading-annotation
---

> Hello World ^ann-x
`;
		const vault = makeVault(content);
		const store = createHighlightStore(vault);

		const calls: string[] = [];
		store.onDidChange((path) => {
			calls.push(path);
		});

		await store.refreshForPath("40-raw/Article.md");

		expect(calls).toEqual(["40-raw/Article.md"]);
	});
});
