export interface AnnotationType {
	id: string;
	label: string;
	icon: string;
}

export const ANNOTATION_DIR = "42-annotation";

export const ANNOTATION_TYPES: readonly AnnotationType[] = [
	{ id: "surprise", label: "驚き", icon: "lightbulb" },
	{ id: "resonance", label: "共感", icon: "heart" },
	{ id: "question", label: "疑問", icon: "help-circle" },
	{ id: "caution", label: "注意", icon: "alert-triangle" },
] as const;
