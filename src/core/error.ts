/**
 * Standardized application error hierarchy and reporting utilities.
 */

export type ErrorSeverity = 'recoverable' | 'degraded' | 'fatal';

export class SynapseXRError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code = 'ERR_UNKNOWN',
    severity: ErrorSeverity = 'recoverable',
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SynapseXRError';
    this.code = code;
    this.severity = severity;
    this.context = context;
  }
}

export class XrSessionError extends SynapseXRError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ERR_XR_SESSION', 'degraded', context);
    this.name = 'XrSessionError';
  }
}

export class WorkflowExecutionError extends SynapseXRError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ERR_WORKFLOW_EXECUTION', 'recoverable', context);
    this.name = 'WorkflowExecutionError';
  }
}

export class BackendCommunicationError extends SynapseXRError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ERR_BACKEND_COMMUNICATION', 'recoverable', context);
    this.name = 'BackendCommunicationError';
  }
}

export function handleUncaughtError(error: unknown, contextName = 'Global'): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Error Handler] Uncaught exception in ${contextName}:`, error);
}

