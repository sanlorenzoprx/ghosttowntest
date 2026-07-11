import { describe, expect, it } from 'vitest';
import { calculateDeterministicScores } from '../src/lib/scoring';

const strongAnswers = {
  gt_1: 5, gt_2: 5, gt_3: 5, gt_4: 5,
  pg_1: 5,
  lev_1: 5, lev_2: 4, lev_3: 4,
  ins_1: 5, ins_2: 4, ins_3: 4,
  tim_1: 5, tim_2: 4, tim_3: 5,
  dna_1: 3,
  walls_1: 4, walls_2: 4
};

describe('deterministic scoring', () => {
  it('recommends building when demand and LIT evidence are strong', () => {
    const result = calculateDeterministicScores(strongAnswers);
    expect(result.finalVerdict).toBe('build_now');
    expect(result.litBand).toBe('strong');
    expect(result.ghostTownRisk).toBe('low');
  });

  it('kills ideas with weak demand and weak LIT evidence', () => {
    const weakAnswers = Object.fromEntries(Object.keys(strongAnswers).map(key => [key, 1]));
    const result = calculateDeterministicScores(weakAnswers);
    expect(result.finalVerdict).toBe('kill_it_before_it_kills_years');
    expect(result.ghostTownRisk).toBe('high');
  });

  it('supports all seven business DNA types', () => {
    expect(calculateDeterministicScores({ ...strongAnswers, dna_1: 6 }).businessDnaType).toBe('capital');
    expect(calculateDeterministicScores({ ...strongAnswers, dna_1: 7 }).businessDnaType).toBe('asset');
  });
});
