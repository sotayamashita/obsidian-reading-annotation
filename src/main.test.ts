import { beforeEach, describe, expect, it, vi } from "vitest";
import { type App, MarkdownView, type PluginManifest, TFile } from "obsidian";
import { createHighlightExtension, dispatchRefreshHighlights } from "highlight-editor";
import ReadingAnnotationPlugin from "./main";

vi.mock("highlight-editor", () => ({
	createHighlightExtension: vi.fn(() => []),
	dispatchRefreshHighlights: vi.fn(),
}));

const RuntimeTFile = TFile as unknown as new (path: string) => TFile;

function makeView(path: string | null, mode: "source" | "preview") {
	return Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, {
		file: path ? new RuntimeTFile(path) : null,
		editor: { cm: {} },
		getMode: () => mode,
		previewMode: { rerender: vi.fn() },
	});
}

describe("initial highlight loading", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([true, false])(
		"loads all open notes when layout is ready (already ready: %s)",
		async (ready) => {
			const editor = makeView("notes/Editor.md", "source");
			const preview = makeView("notes/Preview.md", "preview");
			const duplicate = makeView("notes/Editor.md", "preview");
			const empty = makeView("notes/Empty.md", "source");
			const leaves = [editor, preview, duplicate, empty, makeView(null, "source"), {}].map(
				(view) => ({ view }),
			);
			const files = ["Editor", "Preview"].map(
				(name) => new RuntimeTFile(`42-annotation/${name}.md`),
			);
			const cachedRead = vi.fn(
				async (file: TFile) =>
					`---
source: "[[notes/${file.basename}]]"
type: reading-annotation
---

> fox ^ann-1

> [!surprise] test
> reload
`,
			);
			let layoutReady: () => void = () => {};
			const app = {
				vault: {
					on: vi.fn(),
					getAbstractFileByPath: (path: string) =>
						files.find((file) => file.path === path),
					cachedRead,
				},
				workspace: {
					on: vi.fn(),
					iterateAllLeaves: (callback: (leaf: (typeof leaves)[number]) => void) =>
						leaves.forEach(callback),
					onLayoutReady: (callback: () => void) => {
						layoutReady = callback;
						if (ready) callback();
					},
				},
			} as unknown as App;
			const plugin = Object.assign(new ReadingAnnotationPlugin(app, {} as PluginManifest), {
				app,
				register: vi.fn(),
				registerMarkdownPostProcessor: vi.fn(),
				registerEditorExtension: vi.fn(),
			});

			await plugin.onload();

			if (!ready) {
				expect(cachedRead).not.toHaveBeenCalled();
				layoutReady();
			}

			await vi.waitFor(() => expect(dispatchRefreshHighlights).toHaveBeenCalledTimes(3));

			const store = vi.mocked(createHighlightExtension).mock.calls[0]![0];
			expect(store.getAnnotations("notes/Editor.md")).toHaveLength(1);
			expect(store.getAnnotations("notes/Preview.md")).toHaveLength(1);
			expect(store.getAnnotations("notes/Empty.md")).toEqual([]);
			expect(cachedRead).toHaveBeenCalledTimes(2);
			expect(preview.previewMode.rerender).toHaveBeenCalledExactlyOnceWith(true);
			expect(duplicate.previewMode.rerender).toHaveBeenCalledExactlyOnceWith(true);
			expect(editor.previewMode.rerender).not.toHaveBeenCalled();
			expect(empty.previewMode.rerender).not.toHaveBeenCalled();
		},
	);
});
