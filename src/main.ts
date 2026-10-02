import { type EditorView } from "@codemirror/view";
import {
	Editor,
	type MarkdownFileInfo,
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { openAnnotationModal } from "annotate";
import { ANNOTATION_DIR, isAnnotationPath } from "annotation-types";
import { AnnotationView, VIEW_TYPE_ANNOTATION } from "annotation-view";
import { getAnnotationPath } from "annotation-writer";
import { createHighlightExtension, dispatchRefreshHighlights } from "highlight-editor";
import { highlightPostProcessor } from "highlight-reading";
import { AnnotationSettingTab, normalizeAnnotationDirectory } from "settings";
import { createHighlightStore, type HighlightStore } from "highlight-store";

function getEditorView(editor: Editor): EditorView | null {
	return (editor as unknown as { cm?: EditorView }).cm ?? null;
}

export default class ReadingAnnotationPlugin extends Plugin {
	annotationDirectory = ANNOTATION_DIR;
	private store!: HighlightStore;

	override async onload(): Promise<void> {
		const data = await this.loadData();
		this.annotationDirectory = normalizeAnnotationDirectory(data?.annotationDirectory);
		this.addSettingTab(new AnnotationSettingTab(this.app, this));

		const getDirectory = () => this.annotationDirectory;
		const store = createHighlightStore(this.app.vault, getDirectory);
		this.store = store;
		this.registerView(
			VIEW_TYPE_ANNOTATION,
			(leaf) => new AnnotationView(leaf, store, getDirectory),
		);

		this.registerMarkdownPostProcessor(highlightPostProcessor(store, getDirectory));
		this.registerEditorExtension(createHighlightExtension(store, getDirectory));

		const dispatchToFile = (path: string): void => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;
				const mdView = leaf.view;
				if (mdView.file?.path !== path) return;
				// Refresh the editor decorations even while the editor is hidden
				// behind reading mode, so switching back shows fresh highlights.
				const cmView = getEditorView(mdView.editor);
				if (cmView) dispatchRefreshHighlights(cmView);
				// Reading mode is rendered by post-processors, which the CM
				// dispatch does not re-run — re-render the preview as well.
				if (mdView.getMode() === "preview") {
					mdView.previewMode.rerender(true);
				}
			});
		};

		this.register(store.onDidChange(dispatchToFile));

		this.app.workspace.onLayoutReady(() => {
			void this.refreshOpenNotes();
		});

		// Refresh every open pane whose annotation file changed — created,
		// modified, deleted, or renamed — not just the active one, so split
		// panes and background notes stay in sync with what is on disk.
		const refreshAffectedSources = (annotationPath: string): void => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;
				const file = leaf.view.file;
				if (file && getAnnotationPath(file.path, getDirectory()) === annotationPath) {
					void store.refreshForPath(file.path);
				}
			});
		};

		// Only annotation-file changes affect highlights; a non-annotation path
		// never matches a source note's annotation path, so skip it instead of
		// scanning every open leaf on each unrelated vault event.
		const onAnnotationFileChanged = (path: string): void => {
			if (isAnnotationPath(path, getDirectory())) refreshAffectedSources(path);
		};

		this.registerEvent(
			this.app.vault.on("create", (file) => onAnnotationFileChanged(file.path)),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => onAnnotationFileChanged(file.path)),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => onAnnotationFileChanged(file.path)),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				onAnnotationFileChanged(oldPath);
				onAnnotationFileChanged(file.path);
				// A source note moved → re-resolve its highlights for the new path.
				if (file instanceof TFile && !isAnnotationPath(file.path, getDirectory())) {
					void store.refreshForPath(file.path);
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return;
				void store.refreshForPath(activeFile.path);
			}),
		);

		this.addCommand({
			id: "open-annotation-panel",
			name: "Open annotation panel",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "annotate",
			name: "Annotate selection",
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				if (ctx instanceof MarkdownView) {
					openAnnotationModal(this.app, editor, ctx, getDirectory());
				}
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selection = editor.getSelection();
				if (!selection) return;

				menu.addItem((item) => {
					item.setTitle("Annotate")
						.setIcon("message-square")
						.onClick(() => {
							if (view instanceof MarkdownView) {
								openAnnotationModal(this.app, editor, view, getDirectory());
							}
						});
				});
			}),
		);
	}

	async setAnnotationDirectory(value: unknown): Promise<void> {
		const directory = normalizeAnnotationDirectory(value);
		if (directory === this.annotationDirectory) return;

		await this.saveData({ annotationDirectory: directory });
		this.annotationDirectory = directory;

		await this.refreshOpenNotes();

		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ANNOTATION)) {
			if (leaf.view instanceof AnnotationView) leaf.view.refresh();
		}
	}

	private async refreshOpenNotes(): Promise<void> {
		const paths = new Set<string>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.file) {
				paths.add(leaf.view.file.path);
			}
		});
		await Promise.all([...paths].map((path) => this.store.refreshForPath(path)));
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ANNOTATION);

		let leaf: WorkspaceLeaf;
		if (leaves.length > 0) {
			leaf = leaves[0]!;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) {
				new Notice("Could not open the annotation panel");
				return;
			}
			leaf = rightLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_ANNOTATION, active: true });
		}

		await workspace.revealLeaf(leaf);
	}
}
