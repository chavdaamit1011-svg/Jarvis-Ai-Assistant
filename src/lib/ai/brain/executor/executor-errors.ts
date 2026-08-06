export class ExecutorError extends Error {
  constructor(public readonly code: 'HANDLER_DISABLED' | 'HANDLER_NOT_FOUND' | 'DUPLICATE_HANDLER' | 'TIMEOUT' | 'ABORTED' | 'INVALID_RESULT', message: string) {
    super(message);
    this.name = 'ExecutorError';
  }
}
