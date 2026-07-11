import type { IdeaInput, VerdictProvider, VerdictSignals } from './aiVerdictProvider';
import type { RichVerdict } from './verdictSchema';
import { validateRichVerdict } from './verdictValidator';

export class VerdictEngineError extends Error {}

export async function generateValidatedVerdict(
  provider: VerdictProvider,
  idea: IdeaInput,
  signals: VerdictSignals
): Promise<RichVerdict> {
  const candidate = await provider.generateVerdict(idea, signals);
  const validation = validateRichVerdict(candidate);
  if (!validation.valid || !validation.value) {
    throw new VerdictEngineError(`Verdict validation failed: ${validation.errors.join('; ')}`);
  }
  return validation.value;
}
