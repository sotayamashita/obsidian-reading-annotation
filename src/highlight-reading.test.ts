// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { AnnotationEntry } from "annotation-view";
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
			typeLabel: "重要",
			comment: "",
			blockId: "ann-test",
		};

		const processor = highlightPostProcessor(makeStore([entry]));
		processor(el, makeCtx("40-raw/test.md") as never);

		const span = el.querySelector("span.reading-annotation-hl-important");
		expect(span?.textContent).toBe(quote);
	});
});
