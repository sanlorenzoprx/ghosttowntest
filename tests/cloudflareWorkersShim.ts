export interface WorkflowEvent<T> {
  payload: T;
}

export class WorkflowStep {
  async do<T>(
    _name: string,
    optionsOrCallback: unknown,
    possibleCallback?: () => Promise<T>
  ): Promise<T> {
    const callback = typeof optionsOrCallback === 'function'
      ? optionsOrCallback as () => Promise<T>
      : possibleCallback;
    if (!callback) throw new Error('Workflow test shim requires a callback');
    return callback();
  }
}

export class WorkflowEntrypoint<Environment, Parameters> {
  protected env: Environment;

  constructor(_context: unknown, env: Environment) {
    this.env = env;
  }

  async run(_event: WorkflowEvent<Parameters>, _step: WorkflowStep): Promise<unknown> {
    throw new Error('WorkflowEntrypoint.run must be implemented');
  }
}
