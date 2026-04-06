export interface HeaderContainer {
	createEl(
		tag: string,
		opts?: {
			text?: string;
			cls?: string;
			attr?: Record<string, string>;
		},
	): {
		addEventListener(event: string, handler: () => void): void;
	};
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
	btn.addEventListener("click", onOpenFile);
}
