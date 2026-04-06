import { describe, expect, it, vi } from "vitest";
import { renderHeader } from "annotation-header";

function createMockContainer() {
	const children: {
		tag: string;
		text?: string | undefined;
		cls?: string | undefined;
		listeners: Record<string, (() => void)[]>;
	}[] = [];
	return {
		children,
		createDiv(opts?: { cls?: string }) {
			const div = createMockContainer();
			children.push({ tag: "div", cls: opts?.cls, listeners: {} });
			return div;
		},
		createEl(
			tag: string,
			opts?: { text?: string; cls?: string; attr?: Record<string, string> },
		) {
			const el = {
				tag,
				cls: opts?.cls,
				text: opts?.text as string | undefined,
				listeners: {} as Record<string, (() => void)[]>,
				addEventListener(event: string, handler: () => void) {
					if (!el.listeners[event]) el.listeners[event] = [];
					el.listeners[event].push(handler);
				},
			};
			children.push(el);
			return el;
		},
	};
}

describe("renderHeader", () => {
	it("renders annotation count and open-file button", () => {
		const container = createMockContainer();
		const onOpenFile = vi.fn();

		renderHeader(container, 3, onOpenFile);

		const h4 = container.children.find((c) => c.tag === "h4");
		expect(h4).toBeDefined();
		expect(h4!.text).toBe("Annotations (3)");

		const button = container.children.find((c) => c.tag === "button");
		expect(button).toBeDefined();
		expect(button!.cls).toContain("reading-annotation-open-file");
	});

	it("calls onOpenFile when the button is clicked", () => {
		const container = createMockContainer();
		const onOpenFile = vi.fn();

		renderHeader(container, 2, onOpenFile);

		const button = container.children.find((c) => c.tag === "button");
		expect(button).toBeDefined();
		expect(button!.listeners["click"]).toBeDefined();

		button!.listeners["click"]![0]!();
		expect(onOpenFile).toHaveBeenCalledOnce();
	});
});
