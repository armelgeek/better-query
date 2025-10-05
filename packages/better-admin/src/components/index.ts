/**
 * Better Admin Components
 * Declarative resource management for admin interfaces
 */

export { Admin } from "./Admin.js";
export { Resource } from "./Resource.js";
export { AutoList } from "./AutoList.js";
export { AutoCreate } from "./AutoCreate.js";
export { AutoEdit } from "./AutoEdit.js";
export {
	ResourceContext,
	useResourceContext,
	useResource,
	useResources,
	useDataProvider,
	useAuthProvider,
} from "./resource-context.js";
export type {
	ResourceConfig,
	AdminProps,
	ResourceProps,
} from "./types.js";
