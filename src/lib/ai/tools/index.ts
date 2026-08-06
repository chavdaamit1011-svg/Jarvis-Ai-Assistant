import { toolRegistry } from './tool-registry'; import { utilityTool } from './utility';
if(!toolRegistry.getTool(utilityTool.name)) toolRegistry.registerTool(utilityTool);
export { toolRegistry }; export { utilityTool } from './utility'; export type { ToolContext } from './tool-context'; export type { ToolResult } from './tool-result';
