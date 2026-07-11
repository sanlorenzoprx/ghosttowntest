import { EvaluationAnswers, RiskLevel, ScoreBand } from '../types/lit';
import { classifyBusinessDnaFromQuestion, getBusinessDnaTrap } from './businessDna';

export function calculateDeterministicScores(answers: EvaluationAnswers) {
  // Extract answer values (1-5 from each question)
  const ghostTownAnswers = [
    Number(answers['gt_1']) || 0,
    Number(answers['gt_2']) || 0,
    Number(answers['gt_3']) || 0,
    Number(answers['gt_4']) || 0
  ];
  
  const leverageAnswers = [
    Number(answers['lev_1']) || 0,
    Number(answers['lev_2']) || 0,
    Number(answers['lev_3']) || 0
  ];
  
  const insightAnswers = [
    Number(answers['ins_1']) || 0,
    Number(answers['ins_2']) || 0,
    Number(answers['ins_3']) || 0
  ];
  
  const timingAnswers = [
    Number(answers['tim_1']) || 0,
    Number(answers['tim_2']) || 0,
    Number(answers['tim_3']) || 0
  ];
  
  const passionAnswer = Number(answers['pg_1']) || 0;
  
  const highWallsAnswers = [
    Number(answers['walls_1']) || 0,
    Number(answers['walls_2']) || 0
  ];

  // Calculate averages
  const ghostTownScore = average(ghostTownAnswers);
  const leverageScore = average(leverageAnswers);
  const insightScore = average(insightAnswers);
  const timingScore = average(timingAnswers);
  const litScore = average([leverageScore, insightScore, timingScore]);
  const passionRiskScore = passionAnswer;
  const highWallsScore = average(highWallsAnswers);

  // Determine business DNA
  const dnaAnswer = answers['dna_1'];
  const businessDnaType = classifyBusinessDnaFromQuestion(dnaAnswer);
  const dnaData = getBusinessDnaTrap(businessDnaType);

  // Determine verdict
  const verdict = determineVerdict(
    ghostTownScore,
    litScore,
    leverageScore,
    passionRiskScore
  );

  return {
    ghostTownScore: roundScore(ghostTownScore),
    ghostTownRisk: scoreToRiskLevel(ghostTownScore),
    leverageScore: roundScore(leverageScore),
    insightScore: roundScore(insightScore),
    timingScore: roundScore(timingScore),
    litScore: roundScore(litScore),
    litBand: scoreToBand(litScore),
    passionRiskScore: roundScore(passionRiskScore),
    businessDnaType,
    businessDnaTrap: dnaData.trap,
    businessDnaWinStrategy: dnaData.winStrategy,
    highWallsScore: roundScore(highWallsScore),
    highWallsBand: scoreToBand(highWallsScore),
    finalVerdict: verdict.verdict,
    verdictHeadline: verdict.headline,
    verdictExplanation: verdict.explanation,
    recommendedNextTest: verdict.nextTest,
    doNotBuildUntil: verdict.doNotBuildUntil,
    oneSentenceAdvice: verdict.oneSentenceAdvice
  };
}

function average(values: number[]): number {
  const nums = values.filter(v => v > 0 && v <= 5);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

function scoreToBand(score: number): ScoreBand {
  if (score >= 4) return 'strong';
  if (score >= 3) return 'promising';
  if (score >= 2) return 'unclear';
  return 'weak';
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 2) return 'high';
  if (score <= 3.5) return 'medium';
  return 'low';
}

interface VerdictResult {
  verdict: 'build_now' | 'test_first' | 'niche_down' | 'change_business_dna' | 'kill_it_before_it_kills_years';
  headline: string;
  explanation: string;
  nextTest: string;
  doNotBuildUntil: string;
  oneSentenceAdvice: string;
}

function determineVerdict(
  ghostTownScore: number,
  litScore: number,
  leverageScore: number,
  passionRiskScore: number
): VerdictResult {
  // High ghost town risk + weak LIT = kill it
  if (ghostTownScore <= 2 || litScore <= 1.5) {
    return {
      verdict: 'kill_it_before_it_kills_years',
      headline: 'This is a ghost town.',
      explanation: 'There is no real demand or you have no unfair advantage to win in this space.',
      nextTest: 'Talk to 10 potential customers before reconsidering this idea.',
      doNotBuildUntil: 'At least one person is actively trying to solve this problem today and willing to pay.',
      oneSentenceAdvice: 'Do not build this. Kill it before it kills years of your life.'
    };
  }

  // Strong ghost town + strong LIT + good leverage = build now
  if (ghostTownScore >= 4 && litScore >= 3.5 && leverageScore >= 3) {
    return {
      verdict: 'build_now',
      headline: 'You have the advantage.',
      explanation: 'Clear demand, strong LIT score, and unfair advantage. The conditions are right.',
      nextTest: 'Build a minimal MVP and test with your first 3 customers.',
      doNotBuildUntil: 'You have already validated with at least 1 paying customer.',
      oneSentenceAdvice: 'Start building the MVP this week.'
    };
  }

  // Weak leverage = niche down
  if (leverageScore < 2) {
    return {
      verdict: 'niche_down',
      headline: 'Too broad, no moat.',
      explanation: 'Your idea is competing in a crowded space with no defensible advantage.',
      nextTest: 'Identify the smallest niche/segment where you have an unfair advantage.',
      doNotBuildUntil: 'You have a clear, defensible unfair advantage in a specific niche.',
      oneSentenceAdvice: 'Niche down. Find the segment where you win.'
    };
  }

  // Passion without proof = test first
  if (passionRiskScore < 3) {
    return {
      verdict: 'test_first',
      headline: 'Passion without proof.',
      explanation: 'You are excited, but you haven\'t validated that customers care as much as you do.',
      nextTest: 'Find ONE paying customer or clear signal of demand before building anything.',
      doNotBuildUntil: 'Someone is willing to pay for this solution today.',
      oneSentenceAdvice: 'Test before you build. Find your first customer first.'
    };
  }

  // Mixed signals = test first (default)
  return {
    verdict: 'test_first',
    headline: 'Good idea, test the assumption.',
    explanation: 'You have potential, but there are risks. Validate your riskiest assumption first.',
    nextTest: 'Run a specific test to validate your biggest assumption before building.',
    doNotBuildUntil: 'Your riskiest assumption is validated.',
    oneSentenceAdvice: 'Test one critical assumption before building.'
  };
}
