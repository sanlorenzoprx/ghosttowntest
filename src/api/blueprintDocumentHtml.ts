import type { BlueprintDocumentModel } from './blueprintDocumentModel';
import { validateBlueprintDocumentModel } from './blueprintDocumentModel';

export const BLUEPRINT_DOCUMENT_RENDERER_VERSION = 'ghosttown-document-html-v1+deterministic-pdf-fallback-v1';

/** Escape all model text before it reaches a customer document. */
export function escapeBlueprintDocumentHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const list = (items: string[]) => `<ul>${items.map(item => `<li>${escapeBlueprintDocumentHtml(item)}</li>`).join('')}</ul>`;
const label = (name: string, content: string) => `<section class="block"><h3>${name}</h3><p>${escapeBlueprintDocumentHtml(content)}</p></section>`;
const accessTable = (section: BlueprintDocumentModel['prioritySections'][number]) => section.accessGroups ? `<section class="block"><h3>Priority access targets</h3>${section.accessGroups.map(group => `<table><caption>${escapeBlueprintDocumentHtml(group.title)}</caption><thead><tr><th scope="col">Target / URL</th><th scope="col">Evidence and access</th><th scope="col">Risk / first action</th></tr></thead><tbody>${group.targets.map(target => `<tr><td>${escapeBlueprintDocumentHtml(target.name)}<br><a href="${escapeBlueprintDocumentHtml(target.publicUrl)}">${escapeBlueprintDocumentHtml(target.publicUrl)}</a></td><td>Sources: ${escapeBlueprintDocumentHtml(target.sourceRefs.join(', '))}<br>Evidence dated: ${escapeBlueprintDocumentHtml(target.evidenceDate || 'unknown')} (${escapeBlueprintDocumentHtml(target.evidenceRecency)})<br>Researched: ${escapeBlueprintDocumentHtml(target.researchDate)}<br>Current activity: ${escapeBlueprintDocumentHtml(target.currentActivityStatus)}${target.currentActivityVerifiedAt ? `; verified ${escapeBlueprintDocumentHtml(target.currentActivityVerifiedAt)}` : ''}<br>Evidence confidence: ${escapeBlueprintDocumentHtml(target.confidence)}<br>Path: ${escapeBlueprintDocumentHtml(target.accessPath)}<br>Resource: ${escapeBlueprintDocumentHtml(`${target.matchedAssetOrScript.kind}: ${target.matchedAssetOrScript.title} (${target.matchedAssetOrScript.resourceId})`)}</td><td>Risk: ${escapeBlueprintDocumentHtml(target.risk)}<br>First action: ${escapeBlueprintDocumentHtml(target.firstAction)}</td></tr>`).join('')}</tbody></table>`).join('')}</section>` : '';

export function renderBlueprintDocumentHtml(model: BlueprintDocumentModel): string {
  const failures = validateBlueprintDocumentModel(model);
  if (failures.length) throw new Error(`Invalid Blueprint document model: ${failures.join(', ')}`);
  const priorities = model.prioritySections.map(section => `<section id="${section.sectionId}" class="priority" aria-labelledby="${section.sectionId}-title">
    <h2 id="${section.sectionId}-title">${escapeBlueprintDocumentHtml(section.title)}</h2>
    ${label('Decision', section.decision)}${label('Why', section.why)}
    <section class="block"><h3>Evidence</h3>${list(section.evidence.map(item => `[${item.truthLabel}] ${item.statement}${item.sourceRefs.length ? ` (sources: ${item.sourceRefs.join(', ')})` : ''}`))}</section>
    <section class="block"><h3>Ready-to-use assets</h3>${section.readyToUseAssets.map(asset => `<article class="asset"><h4>${escapeBlueprintDocumentHtml(asset.title)}</h4><pre>${escapeBlueprintDocumentHtml(asset.finishedContent)}</pre><p>${escapeBlueprintDocumentHtml(asset.usageInstructions)}</p></article>`).join('')}</section>
    <section class="block"><h3>Measurement</h3>${list([`Success: ${section.measurement.successThreshold}`, `Failure: ${section.measurement.failureThreshold}`, `Complete when: ${section.measurement.completionDefinition}`, ...section.measurement.evidenceToCapture.map(value => `Capture: ${value}`)])}</section>
    ${accessTable(section)}<section class="block"><h3>Adaptation rule</h3>${list(section.adaptationRule.map(rule => `IF ${rule.condition} THEN ${rule.action} (${rule.route}); capture ${rule.evidenceRequired.join(', ')}`))}</section>
  </section>`).join('');
  const supporting = model.supportingSections.map(section => `<section id="${section.sectionId}" class="supporting"><h2>${escapeBlueprintDocumentHtml(section.title)}</h2>${list(section.content)}</section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GhostTown Launch Blueprint</title><style>
  @page { size: Letter; margin: .58in; @bottom-center { content: "GhostTown Launch Blueprint · " counter(page); } } * { box-sizing: border-box; } body { color:#17202a; background:#fff; font-family:Arial,Helvetica,sans-serif; font-size:10pt; line-height:1.45; margin:0; } main { max-width:7.4in; margin:auto; } header,footer { border-color:#b36a32; } footer { font-size:9.5pt; border-top:1px solid; margin-top:.2in; padding-top:.05in; } h1 { font-size:25pt; margin:0 0 .15in; } h2 { font-size:16pt; margin:.28in 0 .08in; border-bottom:2px solid #b36a32; padding-bottom:.04in; } h3 { font-size:10pt; text-transform:uppercase; letter-spacing:.04em; color:#7a3e12; margin:.12in 0 .03in; } h4 { font-size:10.5pt; margin:.04in 0; } p,li { overflow-wrap:anywhere; } .subtitle { color:#34495e; } .asset,.block,table { break-inside:avoid; page-break-inside:avoid; } .priority { margin-bottom:.22in; } .asset, .block { border-left:3px solid #d59b4b; padding:0 .1in; margin:.08in 0; } pre { white-space:pre-wrap; word-break:break-word; font:9.5pt/1.38 'Courier New',monospace; background:#f7f3ed; padding:.1in; } table { border-collapse:collapse; width:100%; font-size:9.5pt; margin:.08in 0; } caption { text-align:left; font-weight:bold; margin:.05in 0; } th,td { border:1px solid #a9a9a9; padding:.05in; text-align:left; vertical-align:top; overflow-wrap:anywhere; } a { color:#153f71; } @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } h2 { break-after:avoid; } p { orphans:3; widows:3; } }
  </style></head><body><main><header><p class="subtitle">GhostTown Launch Blueprint · ${escapeBlueprintDocumentHtml(model.sourceBlueprint.blueprintVersion)}</p><h1>${escapeBlueprintDocumentHtml(model.presentation.title)}</h1><p class="subtitle">For ${escapeBlueprintDocumentHtml(model.presentation.customer)} · ${escapeBlueprintDocumentHtml(model.presentation.subtitle)}</p><p class="subtitle">Customer actions: Open Blueprint · PDF</p></header>${priorities}${supporting}<footer>GhostTown Launch Blueprint · ${escapeBlueprintDocumentHtml(model.sourceBlueprint.contractVersion)} · page counter enabled for print</footer></main></body></html>`;
}

export interface BrowserPdfRenderer { render(html: string): Promise<Uint8Array>; }
function validPdfBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 512) return false;
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 8));
  const tail = new TextDecoder('latin1').decode(bytes.slice(-32));
  return head.startsWith('%PDF-') && tail.includes('%%EOF');
}
/** A seam for a browser-grade renderer in approved environments; fallback stays deterministic and local. */
export async function renderWithBrowserPdfOrFallback(html: string, fallback: () => Uint8Array, renderer?: BrowserPdfRenderer): Promise<{ bytes: Uint8Array; mode: 'browser' | 'deterministic_fallback' }> {
  const mode = renderer ? 'browser' : 'deterministic_fallback';
  const bytes = renderer ? await renderer.render(html) : fallback();
  if (!validPdfBytes(bytes)) throw new Error(`Invalid ${mode} PDF output`);
  return { bytes, mode };
}
