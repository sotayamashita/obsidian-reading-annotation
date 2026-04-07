import { CALLOUT_HEADER_PATTERN } from "annotation-writer";
import { ANNOTATION_TYPES } from "annotation-types";

export function replaceAnnotationType(content: string, blockId: string, newTypeId: string): string {
	const newType = ANNOTATION_TYPES.find((t) => t.id === newTypeId);
	const label = newType ? ` ${newType.label}` : "";
	const blocks = content.split(/\n---\n/);
	const result = blocks.map((block) => {
		if (!block.includes(`^${blockId}`)) return block;
		return block.replace(CALLOUT_HEADER_PATTERN, `$1[!${newTypeId}]${label}`);
	});
	return result.join("\n---\n");
}
