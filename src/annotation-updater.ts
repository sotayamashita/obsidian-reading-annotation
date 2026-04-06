export function replaceAnnotationType(content: string, blockId: string, newTypeId: string): string {
	const blocks = content.split(/\n---\n/);
	const result = blocks.map((block) => {
		if (!block.includes(`^${blockId}`)) return block;
		return block.replace(/^(>\s*)\[!(\w+)\]/m, `$1[!${newTypeId}]`);
	});
	return result.join("\n---\n");
}
