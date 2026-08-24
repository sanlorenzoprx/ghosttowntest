import { describe, expect, it } from 'vitest';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';
import {
  checkoutAccessibilityBlueprintFixture,
  checkoutAccessibilityOrder
} from './fixtures/checkoutAccessibilityBlueprint';

describe('deterministic fixture ownership contracts', () => {
  it('derives the shared Blueprint owner from one canonical identity input', () => {
    const owner = 'canonical-owner@example.com';
    const blueprint = launchBlueprintFixture(owner);
    expect(blueprint.ownerId).toBe(owner);
  });

  it('keeps the checkout Blueprint owner identical to its paid-order owner', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    expect(blueprint.ownerId).toBe(checkoutAccessibilityOrder.email);
  });
});
