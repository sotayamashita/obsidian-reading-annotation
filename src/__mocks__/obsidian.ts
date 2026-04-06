export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	constructor(path: string) {
		this.path = path;
		this.name = path.split("/").pop() ?? path;
		this.basename = this.name.replace(/\.[^.]+$/, "");
		this.extension = this.name.split(".").pop() ?? "";
	}
}

export class TAbstractFile {
	path = "";
}

export class TFolder extends TAbstractFile {}

export class Modal {
	app: unknown;
	contentEl = { empty: () => {}, createDiv: () => ({}), createEl: () => ({}) };
	constructor(_app: unknown) {
		this.app = _app;
	}
	open(): void {}
	close(): void {}
	setTitle(_title: string): void {}
}

export class Setting {
	constructor(_el: unknown) {}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addText(_cb: unknown): this {
		return this;
	}
	addTextArea(_cb: unknown): this {
		return this;
	}
	addDropdown(_cb: unknown): this {
		return this;
	}
	addButton(_cb: unknown): this {
		return this;
	}
}

export class Notice {
	constructor(_message: string) {}
}

export class Plugin {
	app = {};
	addCommand(_cmd: unknown): void {}
	registerEvent(_ref: unknown): void {}
	registerView(_type: string, _factory: unknown): void {}
}

export class ItemView {
	app = { workspace: {}, vault: {} };
	contentEl = { empty: () => {} };
	constructor(_leaf: unknown) {}
	getViewType(): string {
		return "";
	}
	getDisplayText(): string {
		return "";
	}
	registerEvent(_ref: unknown): void {}
}

export class WorkspaceLeaf {}

export class MarkdownView {}
export class MarkdownFileInfo {}

export class Editor {
	getSelection(): string {
		return "";
	}
}

export function setIcon(_el: unknown, _icon: string): void {}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, _delay: number): T {
	return fn;
}
