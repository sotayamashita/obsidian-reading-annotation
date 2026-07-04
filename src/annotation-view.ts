import {
	Component,
	debounce,
	ItemView,
	MarkdownRenderer,
	Menu,
	setIcon,
	TFile,
	type WorkspaceLeaf,
} from "obsidian";
import { renderHeader } from "annotation-header";
import { ANNOTATION_TYPES } from "annotation-types";
import { replaceAnnotationType } from "annotation-updater";
import { getAnnotationPath } from "annotation-writer";
import type { HighlightStore } from "highlight-store";

export const VIEW_TYPE_ANNOTATION = "reading-annotation-view";

const DEBOUNCE_MS = 300;

const SENTENCE_BOUNDARIES = ["。", ". "];

/**
 * Append a closing `**` when the input has an odd number of bold markers,
 * so a truncation that lands mid-emphasis still renders as valid markdown.
 * Single `*` is left alone because it collides with list markers and is
 * harder to disambiguate; we only handle the common bold case.
 */
function closeDanglingBold(text: string): string {
	const matches = text.match(/\*\*/g);
	if (matches && matches.length % 2 === 1) return text + "**";
	return text;
}

/**
 * Truncate a quote at the latest sentence boundary that still fits within
 * `limit` characters, so we don't chop mid-sentence. Falls back to a hard
 * character cut when no boundary exists before the limit.
 */
export function truncateQuote(quote: string, limit: number): string {
	if (quote.length <= limit) return quote;

	let cut = -1;
	for (const boundary of SENTENCE_BOUNDARIES) {
		const window = quote.slice(0, limit + 1);
		const idx = window.lastIndexOf(boundary);
		if (idx >= 0) {
			const end = idx + boundary.length;
			if (end > cut) cut = end;
		}
	}

	const sliced = cut > 0 ? quote.slice(0, cut) : quote.slice(0, limit);
	return closeDanglingBold(sliced.trimEnd()) + "…";
}

export class AnnotationView extends ItemView {
	private lastFilePath: string | null = null;
	private pendingFlashBlockId: string | null = null;
	private renderComponent: Component | null = null;
	private readonly debouncedRefresh = debounce(() => {
		this.refresh();
	}, DEBOUNCE_MS);

	constructor(
		leaf: WorkspaceLeaf,
		private readonly store: HighlightStore,
	) {
		super(leaf);
	}

	override getViewType(): string {
		return VIEW_TYPE_ANNOTATION;
	}

	override getDisplayText(): string {
		return "Annotations";
	}

	override getIcon(): string {
		return "message-square";
	}

	override async onOpen(): Promise<void> {
		// Switch the displayed file when the active leaf changes.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const newPath = this.app.workspace.getActiveFile()?.path ?? null;
				if (newPath !== this.lastFilePath) this.refresh();
			}),
		);
		// Re-render when the store's entries for the active file change, instead
		// of re-reading and re-parsing the annotation file ourselves.
		this.register(
			this.store.onDidChange((sourcePath) => {
				if (sourcePath === this.app.workspace.getActiveFile()?.path) {
					this.debouncedRefresh();
				}
			}),
		);
		this.refresh();
	}

	override async onClose(): Promise<void> {
		this.debouncedRefresh.cancel();
		this.contentEl.empty();
	}

	private refresh(): void {
		const container = this.contentEl;
		// Unload the markdown child components from the previous render; empty()
		// only clears the DOM and would otherwise leak one Component per refresh.
		if (this.renderComponent) {
			this.removeChild(this.renderComponent);
			this.renderComponent = null;
		}
		container.empty();

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.lastFilePath = null;
			container.createEl("p", {
				text: "No active file",
				cls: "reading-annotation-empty",
			});
			return;
		}

		this.lastFilePath = activeFile.path;
		const entries = this.store.getAnnotations(activeFile.path);

		if (entries.length === 0) {
			container.createEl("p", {
				text: "No annotations for this file",
				cls: "reading-annotation-empty",
			});
			return;
		}

		const annotationPath = getAnnotationPath(activeFile.path);
		const annotationFile = this.app.vault.getAbstractFileByPath(annotationPath);
		const editableFile = annotationFile instanceof TFile ? annotationFile : null;

		const header = container.createDiv({
			cls: "reading-annotation-header",
		});
		renderHeader(header, entries.length, () => {
			void this.app.workspace.openLinkText(annotationPath, "");
		});

		const list = container.createDiv({ cls: "reading-annotation-list" });

		// One child component per render pass; unloaded at the next refresh.
		const renderComponent = new Component();
		this.addChild(renderComponent);
		this.renderComponent = renderComponent;

		for (const entry of entries) {
			const cardClasses = [
				"reading-annotation-card",
				`reading-annotation-card-${entry.type}`,
			];
			if (entry.blockId && entry.blockId === this.pendingFlashBlockId) {
				cardClasses.push("reading-annotation-card-flash");
				this.pendingFlashBlockId = null;
			}
			const card = list.createDiv({ cls: cardClasses.join(" ") });

			const cardHeader = card.createDiv({ cls: "reading-annotation-card-header" });

			const badgeClasses = [
				"reading-annotation-badge",
				`reading-annotation-badge-${entry.type}`,
			];
			if (entry.blockId && editableFile) {
				badgeClasses.push("reading-annotation-badge-interactive");
			}
			const typeLabel =
				ANNOTATION_TYPES.find((t) => t.id === entry.type)?.label ?? entry.type;
			const badge = cardHeader.createEl("span", {
				text: typeLabel,
				cls: badgeClasses.join(" "),
			});

			if (entry.blockId && editableFile) {
				badge.setAttribute("role", "button");
				badge.setAttribute("aria-label", "Change annotation type");
				badge.addEventListener("click", (e) => {
					const menu = new Menu();
					for (const t of ANNOTATION_TYPES) {
						if (t.id === entry.type) continue;
						menu.addItem((item) => {
							item.setTitle(t.label)
								.setIcon(t.icon)
								.onClick(() => {
									this.pendingFlashBlockId = entry.blockId;
									void this.app.vault.process(editableFile, (data) =>
										replaceAnnotationType(data, entry.blockId, t.id),
									);
								});
						});
					}
					menu.showAtMouseEvent(e);
				});
			}

			if (entry.blockId) {
				const linkBtn = cardHeader.createEl("button", {
					cls: "reading-annotation-card-link clickable-icon",
					attr: { "aria-label": "Open in annotation file" },
				});
				setIcon(linkBtn, "external-link");
				linkBtn.addEventListener("click", () => {
					void this.app.workspace.openLinkText(`${annotationPath}#^${entry.blockId}`, "");
				});
			}

			const quoteEl = card.createEl("blockquote", {
				cls: "reading-annotation-quote",
			});
			void MarkdownRenderer.render(
				this.app,
				truncateQuote(entry.quote, 150),
				quoteEl,
				annotationPath,
				renderComponent,
			);

			if (entry.comment) {
				const commentEl = card.createDiv({
					cls: "reading-annotation-comment",
				});
				void MarkdownRenderer.render(
					this.app,
					entry.comment,
					commentEl,
					annotationPath,
					renderComponent,
				);
			}
		}
	}
}
