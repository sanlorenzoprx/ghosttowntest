export type ResultOwnershipClaim = () => Promise<Response>;

export interface ResultOwnershipCoordinator {
  ensureOwned: (resultId: string, claim: ResultOwnershipClaim) => Promise<boolean>;
}

/**
 * Serializes ownership claims for one visible verdict. Signup changes React auth
 * state, which can start an automatic save at the same moment the customer
 * opens paid checkout. Both paths must await the same claim instead of racing
 * the one-time anonymous claim token.
 */
export function createResultOwnershipCoordinator(): ResultOwnershipCoordinator {
  let active: { resultId: string; promise: Promise<boolean> } | null = null;

  return {
    ensureOwned(resultId, claim) {
      if (active?.resultId === resultId) return active.promise;

      const promise = claim()
        .then(response => response.ok)
        .catch(() => false);
      active = { resultId, promise };
      return promise;
    }
  };
}
