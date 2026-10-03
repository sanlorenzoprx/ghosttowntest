import { describe, expect, it } from 'vitest';
import { assessmentPackReturnFromSearch } from '../src/app/App';

describe('assessment pack checkout return', () => {
  it('recognizes a successful assessment-pack checkout return', () => {
    expect(assessmentPackReturnFromSearch('?purchase=assessments_success')).toBe('success');
  });

  it('recognizes a cancelled assessment-pack checkout return', () => {
    expect(assessmentPackReturnFromSearch('?purchase=assessments_cancelled')).toBe('cancelled');
  });

  it('ignores unrelated purchase parameters', () => {
    expect(assessmentPackReturnFromSearch('?purchase=other')).toBeNull();
    expect(assessmentPackReturnFromSearch('')).toBeNull();
  });
});
