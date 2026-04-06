import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
	ViewPlugin,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import { isAnnotationPath } from "annotation-types";
import type { HighlightStore } from "highlight-store";
import { mapNormalizedRange, normalizeWhitespace } from "text-match";

function findQuoteRanges(
	normalizedDoc: string,
	docText: string,
	normalizedQuote: string,
	offset: number,
): Array<{ from: number; to: number }> {
	const ranges: Array<{ from: number; to: number }> = [];

	let searchFrom = 0;
	while (searchFrom < normalizedDoc.length) {
		const matchIndex = normalizedDoc.indexOf(normalizedQuote, searchFrom);
		if (matchIndex === -1) break;

		const originalRange = mapNormalizedRange(
			docText,
			matchIndex,
			matchIndex + normalizedQuote.length,
		);

		if (originalRange) {
			ranges.push({
				from: originalRange.from + offset,
				to: originalRange.to + offset,
			});
		}

		searchFrom = matchIndex + normalizedQuote.length;
	}

	return ranges;
}

const refreshHighlightsEffect = StateEffect.define<null>();

const refreshHighlightsField = StateField.define<number>({
	create() {
		return 0;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(refreshHighlightsEffect)) return value + 1;
		}
		return value;
	},
});

export function dispatchRefreshHighlights(view: EditorView): void {
	view.dispatch({ effects: refreshHighlightsEffect.of(null) });
}

export function createHighlightExtension(store: HighlightStore): Extension {
	const highlightPlugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate): void {
				const hasRefreshEffect = update.transactions.some((tr) =>
					tr.effects.some((e) => e.is(refreshHighlightsEffect)),
				);

				if (update.docChanged || update.viewportChanged || hasRefreshEffect) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const info = view.state.field(editorInfoField);
				const filePath = info?.file?.path;
				if (!filePath || isAnnotationPath(filePath)) return Decoration.none;

				const entries = store.getAnnotations(filePath);
				if (entries.length === 0) return Decoration.none;

				const allRanges: Array<{ from: number; to: number; type: string }> = [];

				for (const { from: vpFrom, to: vpTo } of view.visibleRanges) {
					const docText = view.state.doc.sliceString(vpFrom, vpTo);
					const normalizedDoc = normalizeWhitespace(docText);

					for (const entry of entries) {
						const normalizedQuote = normalizeWhitespace(entry.quote);
						if (normalizedQuote === "") continue;

						const ranges = findQuoteRanges(
							normalizedDoc,
							docText,
							normalizedQuote,
							vpFrom,
						);
						for (const range of ranges) {
							allRanges.push({ ...range, type: entry.type });
						}
					}
				}

				// CodeMirror requires decorations in document order
				allRanges.sort((a, b) => a.from - b.from || a.to - b.to);

				const builder = new RangeSetBuilder<Decoration>();
				for (const range of allRanges) {
					builder.add(
						range.from,
						range.to,
						Decoration.mark({
							class: `reading-annotation-hl reading-annotation-hl-${range.type}`,
						}),
					);
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	);

	return [refreshHighlightsField, highlightPlugin];
}
