import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { CustomWebsiteSpec, WebsiteAsset } from '../types/customWebsite';

export interface WebsiteAssetGenerator {
  generate(input: { spec: CustomWebsiteSpec; blueprint: GhostTownLaunchBlueprint }): Promise<WebsiteAsset[]>;
}

function safeHttps(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.local')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeRenderedAsset(value: string): boolean {
  if (safeHttps(value)) return true;
  if (/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(value)) return true;
  return /^\/assets\/[a-zA-Z0-9._-]+$/.test(value);
}

/**
 * Conservative default: reuse only an explicit HTTPS logo already present in
 * the approved Blueprint. Generated/licensed imagery can be supplied later by
 * another WebsiteAssetGenerator without giving Vertex authority over asset
 * provenance or production publication.
 */
export const blueprintWebsiteAssetGenerator: WebsiteAssetGenerator = {
  async generate({ blueprint }) {
    const logo = safeHttps(blueprint.launchSite.site.logoUrl);
    if (!logo) return [];
    return [{
      assetId: `asset_logo_${blueprint.blueprintId}`,
      role: 'logo',
      origin: 'blueprint',
      publicUrl: logo,
      altText: `${blueprint.launchSite.site.businessName} logo`,
      sourceReference: `blueprint:${blueprint.blueprintId}:launchSite.site.logoUrl`
    }];
  }
};

export function assertWebsiteAssets(assets: WebsiteAsset[]): void {
  const ids = new Set<string>();
  for (const asset of assets) {
    if (!asset.assetId.trim() || ids.has(asset.assetId)) throw new Error('Website assets require unique non-empty asset IDs.');
    ids.add(asset.assetId);
    if (!safeRenderedAsset(asset.publicUrl)) throw new Error(`Website asset ${asset.assetId} does not have an approved image location.`);
    if (!asset.altText.trim()) throw new Error(`Website asset ${asset.assetId} requires alt text.`);
    if (!asset.sourceReference.trim()) throw new Error(`Website asset ${asset.assetId} requires a provenance reference.`);
  }
}
