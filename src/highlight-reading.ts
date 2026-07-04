import type { MarkdownPostProcessorContext } from "obsidian";
import type { HighlightStore } from "highlight-store";
import { isAnnotationPath } from "annotation-types";
import { findQuoteRanges, normalizeWhitespace } from "text-match";

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
		if (isAnnotationPath(ctx.sourcePath)) return;

		const entries = store.getAnnotations(ctx.sourcePath);
		if (entries.length === 0) return;

		const segments = collectTextSegments(el);
		if (segments.length === 0) return;

		const fullText = segments.map((s) => s.text).join("");
		const normalizedFull = normalizeWhitespace(fullText);

		// Collect every match range first (all entries, every occurrence) against
		// the stable full text, before any DOM mutation.
		const ranges: Array<{ from: number; to: number; type: string }> = [];
		for (const entry of entries) {
			const normalizedQuote = normalizeWhitespace(entry.quote);
			if (normalizedQuote === "") continue;

			for (const range of findQuoteRanges(normalizedFull, fullText, normalizedQuote, 0)) {
				ranges.push({ from: range.from, to: range.to, type: entry.type });
			}
		}

		// Apply non-overlapping ranges. Re-collect segments before each wrap:
		// wrapMatchInSegments replaces text nodes, so a cached segments array
		// would point at detached nodes and silently drop a later highlight that
		// lands in the same original text node.
		ranges.sort((a, b) => a.from - b.from || a.to - b.to);
		let lastTo = -1;
		for (const range of ranges) {
			if (range.from < lastTo) continue;
			const cssClass = `reading-annotation-hl reading-annotation-hl-${range.type}`;
			wrapMatchInSegments(collectTextSegments(el), range.from, range.to, cssClass);
			lastTo = range.to;
		}
	};
}
