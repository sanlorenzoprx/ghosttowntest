import { EvaluationResult } from '../types/lit';

export function createShareSummary(
  result: EvaluationResult,
  shareUrl = 'https://lit-ghosttown.com',
  includeIdeaName = true
): string {
  const scores = result.deterministicScores;
  const decision = result.verdictDecisionV2;
  const ideaLine = includeIdeaName ? `Idea: ${result.idea.ideaName}\n\n` : '';

  if (!decision) {
    const verdict = result.verdict || {
      verdict_headline: scores.verdictHeadline,
      one_sentence_advice: scores.oneSentenceAdvice
    };
    return `I tested a business idea with GhostTown before building it.

${ideaLine}Verdict: ${verdict.verdict_headline}

Next step: ${verdict.one_sentence_advice}

Test your idea before you spend months building it: ${shareUrl}

#GhostTownTest`;
  }

  return `I tested a business idea with GhostTown before building it.

${ideaLine}Verdict: ${decision.decision.replace(/_/g, ' ')}

Biggest unknown: ${decision.largestUncertainty.assumption}

Next step: ${decision.firstAction.action}

Test your idea before you spend months building it: ${shareUrl}

#GhostTownTest`;
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

export function getReferralIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

export function getShareText(result: EvaluationResult): string {
  return createShareSummary(result);
}
