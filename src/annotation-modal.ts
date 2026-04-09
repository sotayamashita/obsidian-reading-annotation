import { App, Modal, Setting } from "obsidian";
import { truncateQuote } from "annotation-view";
import { ANNOTATION_TYPES, type AnnotationType } from "annotation-types";

const PREVIEW_MAX_LENGTH = 200;

export class AnnotationModal extends Modal {
	private selectedType: AnnotationType = ANNOTATION_TYPES[0]!;
	private comment = "";
	private readonly selectedText: string;
	private readonly onSubmit: (annotationType: AnnotationType, comment: string) => void;

	constructor(
		app: App,
		selectedText: string,
		onSubmit: (annotationType: AnnotationType, comment: string) => void,
	) {
		super(app);
		this.selectedText = selectedText;
		this.onSubmit = onSubmit;
	}

	override onOpen(): void {
		this.setTitle("Annotate");
		const { contentEl } = this;

		const preview = truncateQuote(this.selectedText, PREVIEW_MAX_LENGTH);

		const previewEl = contentEl.createDiv({
			cls: "reading-annotation-preview",
		});
		previewEl.createEl("blockquote", { text: preview });

		new Setting(contentEl).setName("Type").addDropdown((dropdown) => {
			for (const t of ANNOTATION_TYPES) {
				dropdown.addOption(t.id, t.label);
			}
			dropdown.setValue(this.selectedType.id);
			dropdown.onChange((value) => {
				this.selectedType =
					ANNOTATION_TYPES.find((t) => t.id === value) ?? ANNOTATION_TYPES[0]!;
			});
		});

		new Setting(contentEl).setName("Comment").addTextArea((textarea) => {
			textarea.inputEl.rows = 4;
			textarea.inputEl.addClass("reading-annotation-comment-input");
			textarea.onChange((value) => {
				this.comment = value;
			});
			textarea.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
					e.preventDefault();
					this.submit();
				}
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.submit();
				}),
		);
	}

	override onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		this.close();
		this.onSubmit(this.selectedType, this.comment);
	}
}
