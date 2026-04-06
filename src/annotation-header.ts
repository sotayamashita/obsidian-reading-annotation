export interface HeaderContainer {
	createEl(
		tag: string,
		opts?: { cls?: string; attr?: Record<string, string> },
	): {
		addEventListener(event: string, handler: () => void): void;
		text?: string | undefined;
	};
}

export function renderHeader(
	container: HeaderContainer,
	count: number,
	onOpenFile: () => void,
): void {
	const h4 = container.createEl("h4", {
		cls: "reading-annotation-header-title",
	});
	h4.text = `Annotations (${count})`;

	const btn = container.createEl("button", {
		cls: "reading-annotation-open-file clickable-icon",
		attr: { "aria-label": "Open annotation file" },
	});
	btn.addEventListener("click", onOpenFile);
}
