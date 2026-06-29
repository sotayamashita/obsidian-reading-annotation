// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { AnnotationEntry } from "annotation-parser";
import type { HighlightStore } from "highlight-store";
import { highlightPostProcessor } from "highlight-reading";

function makeStore(entries: AnnotationEntry[]): HighlightStore {
	return {
		getAnnotations: () => entries,
		refreshForPath: async () => {},
		onDidChange: () => () => {},
	};
}

function makeCtx(sourcePath: string): {
	sourcePath: string;
	docId: string;
	frontmatter: null;
	addChild: () => void;
	getSectionInfo: () => null;
} {
	return {
		sourcePath,
		docId: "doc",
		frontmatter: null,
		addChild: () => {},
		getSectionInfo: () => null,
	};
}

describe("highlightPostProcessor", () => {
	it("highlights the full quote span in a single text node paragraph", () => {
		const text =
			"2025年は「AIエージェントを試す・使う」という1年でした。2026年は「AIエージェントを実際に組織で機能させ、アウトカムに変える」ことが主題の1年になると思います。";
		const quote =
			"2026年は「AIエージェントを実際に組織で機能させ、アウトカムに変える」ことが主題の1年になると思います。";

		const el = document.createElement("div");
		const p = document.createElement("p");
		p.textContent = text;
		el.appendChild(p);

		const entry: AnnotationEntry = {
			quote,
			type: "important",
			comment: "",
			blockId: "ann-test",
		};

		const processor = highlightPostProcessor(makeStore([entry]));
		processor(el, makeCtx("40-raw/test.md") as never);

		const span = el.querySelector("span.reading-annotation-hl-important");
		expect(span?.textContent).toBe(quote);
	});

	it("highlights every occurrence of a repeated quote", () => {
		const el = document.createElement("div");
		const p = document.createElement("p");
		p.append(document.createTextNode("cat dog cat"));
		el.appendChild(p);

		const entry: AnnotationEntry = {
			quote: "cat",
			type: "note",
			comment: "",
			blockId: "ann-1",
		};

		highlightPostProcessor(makeStore([entry]))(el, makeCtx("40-raw/x.md") as never);

		expect(el.querySelectorAll("span.reading-annotation-hl-note")).toHaveLength(2);
	});

	it("highlights two quotes that fall in the same text node", () => {
		const el = document.createElement("div");
		const p = document.createElement("p");
		p.append(document.createTextNode("alpha beta gamma"));
		el.appendChild(p);

		const entries: AnnotationEntry[] = [
			{ quote: "alpha", type: "note", comment: "", blockId: "ann-1" },
			{ quote: "gamma", type: "important", comment: "", blockId: "ann-2" },
		];

		highlightPostProcessor(makeStore(entries))(el, makeCtx("40-raw/x.md") as never);

		expect(el.querySelector("span.reading-annotation-hl-note")?.textContent).toBe("alpha");
		expect(el.querySelector("span.reading-annotation-hl-important")?.textContent).toBe("gamma");
	});
});
