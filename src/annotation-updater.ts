import { CALLOUT_HEADER_PATTERN } from "annotation-writer";
import { ANNOTATION_TYPES } from "annotation-types";

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceAnnotationType(content: string, blockId: string, newTypeId: string): string {
	if (!blockId) return content;
	const newType = ANNOTATION_TYPES.find((t) => t.id === newTypeId);
	const label = newType ? ` ${newType.label}` : "";
	// Match the exact block-id token, not a prefix of a longer id, so changing
	// one annotation's type never rewrites a sibling whose id extends this one
	// (e.g. "ann-1" must not match "ann-1x").
	const idRegex = new RegExp(`\\^${escapeRegExp(blockId)}(?![a-z0-9])`);
	const blocks = content.split(/\n---\n/);
	const result = blocks.map((block) => {
		const match = idRegex.exec(block);
		if (!match) return block;
		// The callout header always follows the block-id line, so only rewrite
		// the part after the id. This avoids clobbering a quote line that itself
		// starts with "[!word]" (which would destroy the quote and the ^id).
		const splitAt = match.index + match[0].length;
		const head = block.slice(0, splitAt);
		const tail = block.slice(splitAt);
		return head + tail.replace(CALLOUT_HEADER_PATTERN, `$1[!${newTypeId}]${label}`);
	});
	return result.join("\n---\n");
}
