import { VerdictData, VerdictValidation } from '../types/verdict';

export function validateVerdict(verdict: VerdictData): VerdictValidation {
  const errors: string[] = [];

  // Check verdict is valid
  const validVerdicts = [
    'build_now',
    'test_first',
    'niche_down',
    'change_business_dna',
    'kill_it_before_it_kills_years'
  ];
  if (!validVerdicts.includes(verdict.verdict)) {
    errors.push(`Invalid verdict type: ${verdict.verdict}`);
  }

  // Check headline is punchy (max 10 words)
  const headlineWords = verdict.verdict_headline.split(' ').length;
  if (headlineWords > 10) {
    errors.push(`Headline too long: ${headlineWords} words (max 10)`);
  }
  if (headlineWords < 2) {
    errors.push('Headline too short');
  }

  // Check confidence is reasonable
  if (typeof verdict.confidence !== 'number' || verdict.confidence < 0.7 || verdict.confidence > 0.95) {
    errors.push(`Confidence out of range: ${verdict.confidence} (should be 0.7–0.95)`);
  }

  // Check next test is specific (min 30 chars, not vague)
  const vaguePhrases = [
    'consider testing',
    'think about',
    'maybe try',
    'you might want to',
    'it depends',
    'should probably',
    'eventually',
  ];
  const nextTestLower = verdict.recommended_next_test.toLowerCase();
  if (nextTestLower.length < 30) {
    errors.push('Next test is too vague (min 30 characters)');
  }
  if (vaguePhrases.some(p => nextTestLower.includes(p))) {
    errors.push('Next test contains vague language');
  }

  // Check "do not build until" has specific metric
  if (verdict.do_not_build_until.length < 20) {
    errors.push('Do not build until is too vague');
  }

  // Check advice is not generic
  const genericPhrases = [
    'consult a lawyer',
    'talk to people',
    'do your own research',
    'it depends on your situation',
    'everyone is different'
  ];
  const adviceLower = verdict.one_sentence_advice.toLowerCase();
  if (genericPhrases.some(p => adviceLower.includes(p))) {
    errors.push('Advice is too generic');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function isValidVerdictJSON(text: string): boolean {
  try {
    const json = JSON.parse(text);
    return (
      json.verdict &&
      json.verdict_headline &&
      json.one_sentence_advice &&
      json.biggest_trap &&
      json.do_not_build_until &&
      json.recommended_next_test &&
      typeof json.confidence === 'number'
    );
  } catch {
    return false;
  }
}

export function extractJSONFromText(text: string): Record<string, any> | null {
  try {
    // Try direct JSON parse first
    return JSON.parse(text);
  } catch {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return null;
      }
    }
    // Try to find raw JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
