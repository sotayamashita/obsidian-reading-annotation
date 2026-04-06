import type { MarkdownPostProcessorContext } from "obsidian";
import type { HighlightStore } from "highlight-store";
import { ANNOTATION_DIR } from "annotation-types";
import { mapNormalizedRange, normalizeWhitespace } from "text-match";

interface TextSegment {
	node: Text;
	start: number;
	text: string;
}

function collectTextSegments(el: HTMLElement): TextSegment[] {
	const segments: TextSegment[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let offset = 0;

	let node = walker.nextNode();
	while (node !== null) {
		const text = node.textContent ?? "";
		segments.push({ node: node as Text, start: offset, text });
		offset += text.length;
		node = walker.nextNode();
	}

	return segments;
}

function wrapMatchInSegments(
	segments: TextSegment[],
	matchStart: number,
	matchEnd: number,
	cssClass: string,
): void {
	for (const segment of segments) {
		const segEnd = segment.start + segment.text.length;
		if (segEnd <= matchStart || segment.start >= matchEnd) continue;

		const overlapStart = Math.max(0, matchStart - segment.start);
		const overlapEnd = Math.min(segment.text.length, matchEnd - segment.start);

		if (overlapStart === 0 && overlapEnd === segment.text.length) {
			const span = document.createElement("span");
			span.className = cssClass;
			segment.node.parentNode?.replaceChild(span, segment.node);
			span.appendChild(segment.node);
		} else {
			const before = segment.text.slice(0, overlapStart);
			const match = segment.text.slice(overlapStart, overlapEnd);
			const after = segment.text.slice(overlapEnd);

			const frag = document.createDocumentFragment();

			if (before) frag.appendChild(document.createTextNode(before));

			const span = document.createElement("span");
			span.className = cssClass;
			span.textContent = match;
			frag.appendChild(span);

			if (after) frag.appendChild(document.createTextNode(after));

			segment.node.parentNode?.replaceChild(frag, segment.node);
		}
	}
}

export function highlightPostProcessor(
	store: HighlightStore,
): (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void {
	return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		if (ctx.sourcePath.startsWith(ANNOTATION_DIR + "/")) return;

		const entries = store.getAnnotations(ctx.sourcePath);
		if (entries.length === 0) return;

		const segments = collectTextSegments(el);
		if (segments.length === 0) return;

		const fullText = segments.map((s) => s.text).join("");
		const normalizedFull = normalizeWhitespace(fullText);

		for (const entry of entries) {
			const normalizedQuote = normalizeWhitespace(entry.quote);
			if (normalizedQuote === "") continue;

			const matchIndex = normalizedFull.indexOf(normalizedQuote);
			if (matchIndex === -1) continue;

			const range = mapNormalizedRange(
				fullText,
				matchIndex,
				matchIndex + normalizedQuote.length,
			);
			if (!range) continue;

			const cssClass = `reading-annotation-hl reading-annotation-hl-${entry.type}`;
			wrapMatchInSegments(segments, range.from, range.to, cssClass);
		}
	};
}
