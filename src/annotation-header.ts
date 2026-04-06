import { setIcon } from "obsidian";

export interface HeaderContainer {
	createEl(
		tag: string,
		opts?: {
			text?: string;
			cls?: string;
			attr?: Record<string, string>;
		},
	): HTMLElement;
}

export function renderHeader(
	container: HeaderContainer,
	count: number,
	onOpenFile: () => void,
): void {
	container.createEl("h4", {
		text: `Annotations (${count})`,
		cls: "reading-annotation-header-title",
	});

	const btn = container.createEl("button", {
		cls: "reading-annotation-open-file clickable-icon",
		attr: { "aria-label": "Open annotation file" },
	});
	setIcon(btn, "external-link");
	btn.addEventListener("click", onOpenFile);
}
