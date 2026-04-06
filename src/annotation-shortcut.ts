import { ANNOTATION_TYPES, type AnnotationType } from "annotation-types";

export function resolveTypeByKey(key: string, isTextareaFocused: boolean): AnnotationType | null {
	if (isTextareaFocused) return null;

	const index = Number(key) - 1;
	return ANNOTATION_TYPES[index] ?? null;
}
