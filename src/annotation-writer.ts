import { TFile, type Vault } from "obsidian";
import { ANNOTATION_DIR, type AnnotationType } from "annotation-types";

export function getAnnotationPath(sourcePath: string): string {
	const fileName = sourcePath.split("/").pop() ?? sourcePath;
	return `${ANNOTATION_DIR}/${fileName}`;
}

export function toBlockquote(text: string): string {
	return text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

export function formatEntry(
	selectedText: string,
	annotationType: AnnotationType,
	comment: string,
): string {
	const quoted = toBlockquote(selectedText);
	const calloutHeader = `> [!${annotationType.id}]`;
	const calloutBody = comment.trim() === "" ? ">" : toBlockquote(comment);

	return `${quoted}\n\n${calloutHeader}\n${calloutBody}`;
}

export function formatFrontmatter(sourcePath: string): string {
	const sourceWithoutExt = sourcePath.replace(/\.md$/, "");
	const date = new Date().toISOString().slice(0, 10);
	return `---\nsource: "[[${sourceWithoutExt}]]"\ndate: ${date}\ntype: reading-annotation\n---`;
}

export async function writeAnnotation(
	vault: Vault,
	sourcePath: string,
	selectedText: string,
	annotationType: AnnotationType,
	comment: string,
): Promise<void> {
	const annotationPath = getAnnotationPath(sourcePath);
	const entry = formatEntry(selectedText, annotationType, comment);

	const existing = vault.getAbstractFileByPath(annotationPath);

	if (existing instanceof TFile) {
		await vault.append(existing, `\n\n---\n\n${entry}`);
		return;
	}

	if (!vault.getAbstractFileByPath(ANNOTATION_DIR)) {
		await vault.createFolder(ANNOTATION_DIR);
	}

	const content = `${formatFrontmatter(sourcePath)}\n\n${entry}`;
	try {
		await vault.create(annotationPath, content);
	} catch {
		const file = vault.getAbstractFileByPath(annotationPath);
		if (file instanceof TFile) {
			await vault.append(file, `\n\n---\n\n${entry}`);
		} else {
			throw new Error(`Failed to create or append to ${annotationPath}`);
		}
	}
}
