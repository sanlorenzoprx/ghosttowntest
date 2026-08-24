import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const storeV2 = readFileSync(new URL('../src/api/blueprintStore.ts', import.meta.url), 'utf8');
const storeV21 = readFileSync(new URL('../src/api/blueprintStoreV21.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0006_launch_blueprint_identity_reservations.sql', import.meta.url), 'utf8');

describe('Launch Blueprint first-write identity contract', () => {
  it('uses a D1 first-writer-wins identity reservation', () => {
    expect(migration).toContain('launch_blueprint_identity_reservations');
    expect(migration).toContain('order_id TEXT PRIMARY KEY');
    expect(storeV2).toContain('ON CONFLICT(order_id) DO NOTHING');
    expect(storeV2).toContain('Launch Blueprint source verdict is immutable');
  });

  it('checks/reserves identity before either persistence path touches shared R2 keys', () => {
    const v2Check = storeV2.indexOf('await assertStoredBlueprintOwner(db, blueprint.orderId');
    const v2Write = storeV2.indexOf('bucket.put(pdfKey');
    expect(v2Check).toBeGreaterThan(-1);
    expect(v2Write).toBeGreaterThan(v2Check);

    const v21Check = storeV21.indexOf('await assertStoredBlueprintOwner(env.DB, blueprint.orderId');
    const v21Write = storeV21.indexOf('env.BLUEPRINTS.put(pdf');
    expect(v21Check).toBeGreaterThan(-1);
    expect(v21Write).toBeGreaterThan(v21Check);
  });
});
