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
import { isAnnotationPath } from "annotation-types";
import { AnnotationView, VIEW_TYPE_ANNOTATION } from "annotation-view";
import { getAnnotationPath } from "annotation-writer";
import { createHighlightExtension, dispatchRefreshHighlights } from "highlight-editor";
import { highlightPostProcessor } from "highlight-reading";
import { createHighlightStore } from "highlight-store";

function getEditorView(editor: Editor): EditorView | null {
	return (editor as unknown as { cm?: EditorView }).cm ?? null;
}

export default class ReadingAnnotationPlugin extends Plugin {
	override async onload(): Promise<void> {
		const store = createHighlightStore(this.app.vault);
		this.registerView(VIEW_TYPE_ANNOTATION, (leaf) => new AnnotationView(leaf, store));

		this.registerMarkdownPostProcessor(highlightPostProcessor(store));
		this.registerEditorExtension(createHighlightExtension(store));

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

		const unsubscribe = store.onDidChange((sourcePath) => {
			dispatchToFile(sourcePath);
		});
		this.register(unsubscribe);

		// Refresh every open pane whose annotation file changed — created,
		// modified, deleted, or renamed — not just the active one, so split
		// panes and background notes stay in sync with what is on disk.
		const refreshAffectedSources = (annotationPath: string): void => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;
				const file = leaf.view.file;
				if (file && getAnnotationPath(file.path) === annotationPath) {
					void store.refreshForPath(file.path);
				}
			});
		};

		// Only annotation-file changes affect highlights; a non-annotation path
		// never matches a source note's annotation path, so skip it instead of
		// scanning every open leaf on each unrelated vault event.
		const onAnnotationFileChanged = (path: string): void => {
			if (isAnnotationPath(path)) refreshAffectedSources(path);
		};

		this.registerEvent(this.app.vault.on("create", (file) => onAnnotationFileChanged(file.path)));
		this.registerEvent(this.app.vault.on("modify", (file) => onAnnotationFileChanged(file.path)));
		this.registerEvent(this.app.vault.on("delete", (file) => onAnnotationFileChanged(file.path)));
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				onAnnotationFileChanged(oldPath);
				onAnnotationFileChanged(file.path);
				// A source note moved → re-resolve its highlights for the new path.
				if (file instanceof TFile && !isAnnotationPath(file.path)) {
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
					openAnnotationModal(this.app, editor, ctx);
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
								openAnnotationModal(this.app, editor, view);
							}
						});
				});
			}),
		);
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
