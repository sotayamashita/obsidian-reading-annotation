import { type App, type Editor, type MarkdownView, Notice } from "obsidian";
import { AnnotationModal } from "annotation-modal";
import type { AnnotationType } from "annotation-types";
import { writeAnnotation } from "annotation-writer";

/**
 * Open the annotation modal for the current selection and persist the result.
 * Lives outside main.ts so the plugin entry point stays focused on lifecycle.
 */
export function openAnnotationModal(app: App, editor: Editor, view: MarkdownView): void {
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

	const modal = new AnnotationModal(app, selection, (annotationType, comment) => {
		void saveAnnotation(app, file.path, selection, annotationType, comment);
	});
	modal.open();
}

async function saveAnnotation(
	app: App,
	filePath: string,
	selection: string,
	annotationType: AnnotationType,
	comment: string,
): Promise<void> {
	try {
		await writeAnnotation(app.vault, filePath, selection, annotationType, comment);
		new Notice("Annotation saved");
	} catch (e) {
		console.error("Reading Annotation:", e);
		new Notice(e instanceof Error ? e.message : "Failed to save annotation");
	}
}
