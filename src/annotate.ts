import { type App, type Editor, type MarkdownView, Notice } from "obsidian";
import { AnnotationModal } from "annotation-modal";
import { ANNOTATION_DIR } from "annotation-types";
import { writeAnnotation } from "annotation-writer";

/**
 * Open the annotation modal for the current selection and persist the result.
 * Lives outside main.ts so the plugin entry point stays focused on lifecycle.
 */
export function openAnnotationModal(
	app: App,
	editor: Editor,
	view: MarkdownView,
	directory = ANNOTATION_DIR,
): void {
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

	const modal = new AnnotationModal(app, selection, async (annotationType, comment) => {
		try {
			await writeAnnotation(
				app.vault,
				file.path,
				selection,
				annotationType,
				comment,
				directory,
			);
			new Notice("Annotation saved");
		} catch (error) {
			console.error("Reading Annotation:", error);
			new Notice(error instanceof Error ? error.message : "Failed to save annotation");
		}
	});
	modal.open();
}
