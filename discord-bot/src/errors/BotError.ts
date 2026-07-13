/**
 * Typed error classes so the global error handler (`errorHandler.ts`) can
 * tell categories apart and log/report them distinctly.
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class CommandError extends Error {
  constructor(message: string, public readonly commandName?: string) {
    super(message);
    this.name = "CommandError";
  }
}
