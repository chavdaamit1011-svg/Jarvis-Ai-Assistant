export class ToolExecutionError extends Error { constructor(public code:string, message:string) { super(message); } }
