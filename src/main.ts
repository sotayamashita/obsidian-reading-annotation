import {
	Editor,
	type MarkdownFileInfo,
	MarkdownView,
	Notice,
	Plugin,
	WorkspaceLeaf,
} from "obsidian";
import { AnnotationModal } from "annotation-modal";
import { AnnotationView, VIEW_TYPE_ANNOTATION } from "annotation-view";
import { writeAnnotation } from "annotation-writer";

export default class ReadingAnnotationPlugin extends Plugin {
	override async onload(): Promise<void> {
		this.registerView(VIEW_TYPE_ANNOTATION, (leaf) => new AnnotationView(leaf));

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
