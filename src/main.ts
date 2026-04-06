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
import { AnnotationModal } from "annotation-modal";
import { AnnotationView, VIEW_TYPE_ANNOTATION } from "annotation-view";
import { getAnnotationPath, writeAnnotation } from "annotation-writer";
import { createHighlightExtension, dispatchRefreshHighlights } from "highlight-editor";
import { highlightPostProcessor } from "highlight-reading";
import { createHighlightStore } from "highlight-store";

function getEditorView(editor: Editor): EditorView | null {
	return (editor as unknown as { cm?: EditorView }).cm ?? null;
}

export default class ReadingAnnotationPlugin extends Plugin {
	override async onload(): Promise<void> {
		this.registerView(VIEW_TYPE_ANNOTATION, (leaf) => new AnnotationView(leaf));

		const store = createHighlightStore(this.app.vault);
		this.registerMarkdownPostProcessor(highlightPostProcessor(store));
		this.registerEditorExtension(createHighlightExtension(store));

		let lastRefreshedPath: string | null = null;

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!(file instanceof TFile)) return;
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return;
				const expectedPath = getAnnotationPath(activeFile.path);
				if (file.path !== expectedPath) return;

				void store.refreshForPath(activeFile.path).then(() => {
					this.app.workspace.iterateAllLeaves((leaf) => {
						if (!(leaf.view instanceof MarkdownView)) return;
						if (leaf.view.file?.path !== activeFile.path) return;
						const cmView = getEditorView(leaf.view.editor);
						if (cmView) dispatchRefreshHighlights(cmView);
					});
				});
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile || activeFile.path === lastRefreshedPath) return;
				lastRefreshedPath = activeFile.path;
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
					this.openAnnotationModal(editor, ctx);
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
								this.openAnnotationModal(editor, view);
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
			leaf = workspace.getRightLeaf(false)!;
			await leaf.setViewState({ type: VIEW_TYPE_ANNOTATION, active: true });
		}

		await workspace.revealLeaf(leaf);
	}

	private openAnnotationModal(editor: Editor, view: MarkdownView): void {
		const selection = editor.getSelection();
		if (!selection) {
			new Notice("Select text to annotate");
			return;
		}

		const file = view.file;
		if (!file) {
			new Notice("No active file");
			return;
		}

		const modal = new AnnotationModal(this.app, selection, (annotationType, comment) => {
			void writeAnnotation(this.app.vault, file.path, selection, annotationType, comment)
				.then(() => {
					new Notice("Annotation saved");
				})
				.catch((e: unknown) => {
					console.error("Reading Annotation:", e);
					new Notice("Failed to save annotation");
				});
		});
		modal.open();
	}
}
