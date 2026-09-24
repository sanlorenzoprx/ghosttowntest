import { describe, expect, it, vi } from 'vitest';
import { createResultOwnershipCoordinator } from '../src/lib/resultOwnership';

describe('signup to paid checkout verdict ownership continuity', () => {
  it('shares one in-flight ownership claim between signup save and checkout', async () => {
    const coordinator = createResultOwnershipCoordinator();
    let release!: (response: Response) => void;
    const response = new Promise<Response>(resolve => { release = resolve; });
    const claim = vi.fn(() => response);

    const signupSave = coordinator.ensureOwned('verdict-1', claim);
    const checkout = coordinator.ensureOwned('verdict-1', claim);

    expect(claim).toHaveBeenCalledTimes(1);
    release(new Response(JSON.stringify({ saved: true }), { status: 200 }));

    await expect(signupSave).resolves.toBe(true);
    await expect(checkout).resolves.toBe(true);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('does not treat a failed ownership claim as checkout-ready', async () => {
    const coordinator = createResultOwnershipCoordinator();
    const claim = vi.fn(async () => new Response(JSON.stringify({ error: 'Assessment not found' }), { status: 404 }));

    await expect(coordinator.ensureOwned('verdict-2', claim)).resolves.toBe(false);
  });
});
