import { QueryContext, ResourceConfig } from "../types";
import { RelationshipManager } from "./relationships";

export function inferRelationships(
	context: QueryContext,
	allResources: ResourceConfig[],
	relationshipManager: RelationshipManager,
) {
	const pluralize = (str: string) => {
		if (str.endsWith("y")) return str.slice(0, -1) + "ies";
		if (str.endsWith("s")) return str;
		return str + "s";
	};

	// 1. Auto-infer belongsTo relationships from foreign keys (e.g. projectId -> project)
	for (const resourceConfig of allResources) {
		const existingRelationships = relationshipManager.getRelationships(
			resourceConfig.name,
		);
		const resourceSchema = context.schemas.get(resourceConfig.name);
		if (resourceSchema?.fields) {
			const autoRelationships = { ...existingRelationships };
			let inferred = false;
			for (const fieldName of Object.keys(resourceSchema.fields)) {
				if (fieldName.endsWith("Id") && fieldName !== "id") {
					const target = fieldName.slice(0, -2);
					if (context.schemas.has(target) && !autoRelationships[target]) {
						autoRelationships[target] = {
							type: "belongsTo" as const,
							target,
							foreignKey: fieldName,
							targetKey: "id",
						};
						inferred = true;
					}
				}
			}
			if (inferred) {
				relationshipManager.registerRelationships(
					resourceConfig.name,
					autoRelationships,
				);
			}
		}
	}

	// 2. Auto-infer hasMany relationships back to the source (e.g. user hasMany posts)
	for (const resourceConfig of allResources) {
		const existingBelongsTo = relationshipManager.getRelationships(
			resourceConfig.name,
		);
		for (const [_, relationConfig] of Object.entries(existingBelongsTo)) {
			if (relationConfig.type === "belongsTo") {
				const targetResource = relationConfig.target;
				const targetRelationships =
					relationshipManager.getRelationships(targetResource);
				const pluralName = pluralize(resourceConfig.name);

				if (!targetRelationships[pluralName]) {
					const updatedTargetRelationships = {
						...targetRelationships,
						[pluralName]: {
							type: "hasMany" as const,
							target: resourceConfig.name,
							foreignKey: relationConfig.foreignKey,
							targetKey: "id",
						},
					};
					relationshipManager.registerRelationships(
						targetResource,
						updatedTargetRelationships,
					);
				}
			}
		}
	}
}
