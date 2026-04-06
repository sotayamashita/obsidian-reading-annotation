import { debounce, ItemView, Menu, setIcon, TFile } from "obsidian";
import { renderHeader } from "annotation-header";
import { ANNOTATION_TYPES } from "annotation-types";
import { replaceAnnotationType } from "annotation-updater";
import { BLOCK_ID_PATTERN, getAnnotationPath } from "annotation-writer";

export const VIEW_TYPE_ANNOTATION = "reading-annotation-view";

export interface AnnotationEntry {
	quote: string;
	type: string;
	typeLabel: string;
	comment: string;
	blockId: string;
}

export function parseBlockquoteLine(line: string): string | null {
	if (line.startsWith("> ")) return line.slice(2);
	if (line === ">") return "";
	return null;
}

export function parseAnnotationFile(content: string): AnnotationEntry[] {
	const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
	if (!bodyMatch) return [];
	const body = bodyMatch[1]!;

	const blocks = body.split(/\n---\n/).filter((b) => b.trim() !== "");
	const entries: AnnotationEntry[] = [];

	for (const block of blocks) {
		const lines = block.trim().split("\n");
		const quoteLines: string[] = [];
		let type = "";
		let blockId = "";
		const commentLines: string[] = [];
		let inCallout = false;

		for (const line of lines) {
			const calloutMatch = line.match(/^>\s*\[!(\w+)\]\s*$/);
			if (calloutMatch) {
				type = calloutMatch[1]!;
				inCallout = true;
				continue;
			}

			const parsed = parseBlockquoteLine(line);
			if (parsed !== null) {
				if (inCallout) {
					commentLines.push(parsed);
				} else {
					const blockIdMatch = parsed.match(BLOCK_ID_PATTERN);
					if (blockIdMatch) {
						blockId = blockIdMatch[1]!;
						quoteLines.push(parsed.replace(BLOCK_ID_PATTERN, ""));
					} else {
						quoteLines.push(parsed);
					}
				}
			}
		}

		const typeInfo = ANNOTATION_TYPES.find((t) => t.id === type);
		entries.push({
			quote: quoteLines.join("\n").trim(),
			type,
			typeLabel: typeInfo?.label ?? type,
			comment: commentLines.join("\n").trim(),
			blockId,
		});
	}

	return entries;
}

const DEBOUNCE_MS = 300;

export class AnnotationView extends ItemView {
	private lastFilePath: string | null = null;
	private readonly debouncedRefresh = debounce(() => {
		void this.refresh();
	}, DEBOUNCE_MS);

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
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const activeFile = this.app.workspace.getActiveFile();
				const newPath = activeFile?.path ?? null;
				if (newPath !== this.lastFilePath) {
					void this.refresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!(file instanceof TFile)) return;
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return;
				const expectedPath = getAnnotationPath(activeFile.path);
				if (file.path === expectedPath) {
					this.debouncedRefresh();
				}
			}),
		);
		void this.refresh();
	}

	override async onClose(): Promise<void> {
		this.debouncedRefresh.cancel();
		this.contentEl.empty();
	}

	private async refresh(): Promise<void> {
		const container = this.contentEl;
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
		const annotationPath = getAnnotationPath(activeFile.path);
		const annotationFile = this.app.vault.getAbstractFileByPath(annotationPath);

		if (!(annotationFile instanceof TFile)) {
			container.createEl("p", {
				text: "No annotations for this file",
				cls: "reading-annotation-empty",
			});
			return;
		}

		const content = await this.app.vault.cachedRead(annotationFile);
		const entries = parseAnnotationFile(content);

		if (entries.length === 0) {
			container.createEl("p", {
				text: "No annotations found",
				cls: "reading-annotation-empty",
			});
			return;
		}

		const header = container.createDiv({
			cls: "reading-annotation-header",
		});
		renderHeader(header, entries.length, () => {
			void this.app.workspace.openLinkText(annotationPath, "");
		});

		const list = container.createDiv({ cls: "reading-annotation-list" });

		for (const entry of entries) {
			const card = list.createDiv({ cls: "reading-annotation-card" });

			const cardHeader = card.createDiv({ cls: "reading-annotation-card-header" });

			const badge = cardHeader.createEl("span", {
				text: entry.typeLabel,
				cls: `reading-annotation-badge reading-annotation-badge-${entry.type} clickable-icon`,
			});

			if (entry.blockId && annotationFile instanceof TFile) {
				badge.addEventListener("click", (e) => {
					const menu = new Menu();
					for (const t of ANNOTATION_TYPES) {
						if (t.id === entry.type) continue;
						menu.addItem((item) => {
							item.setTitle(t.label)
								.setIcon(t.icon)
								.onClick(async () => {
									const content = await this.app.vault.read(annotationFile);
									const updated = replaceAnnotationType(
										content,
										entry.blockId,
										t.id,
									);
									await this.app.vault.modify(annotationFile, updated);
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
			quoteEl.setText(
				entry.quote.length > 150 ? entry.quote.slice(0, 150) + "..." : entry.quote,
			);

			if (entry.comment) {
				card.createEl("p", {
					text: entry.comment,
					cls: "reading-annotation-comment",
				});
			}
		}
	}
}
