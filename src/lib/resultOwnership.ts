export type ResultOwnershipClaim = () => Promise<Response>;

export interface ResultOwnershipCoordinator {
  ensureOwned: (resultId: string, claim: ResultOwnershipClaim) => Promise<boolean>;
}

/**
 * Serializes concurrent ownership claims for one visible verdict. A successful
 * claim is cached. A failed claim is cleared so checkout can retry after signup
 * auth has settled instead of permanently reusing an earlier anonymous failure.
 */
export function createResultOwnershipCoordinator(): ResultOwnershipCoordinator {
  let active: { resultId: string; promise: Promise<boolean> } | null = null;
  let ownedResultId: string | null = null;

  return {
    ensureOwned(resultId, claim) {
      if (ownedResultId === resultId) return Promise.resolve(true);
      if (active?.resultId === resultId) return active.promise;

      const promise = claim()
        .then(response => {
          const ok = response.ok;
          if (ok) ownedResultId = resultId;
          return ok;
        })
        .catch(() => false)
        .finally(() => {
          if (active?.resultId === resultId) active = null;
        });
      active = { resultId, promise };
      return promise;
    }
  };
}
