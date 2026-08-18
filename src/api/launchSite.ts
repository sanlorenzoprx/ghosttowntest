import type { Env } from "./env";
import { ownedLaunchBlueprintOrder } from "./blueprintApi";
import { loadBlueprintRecord } from "./blueprintStore";
import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";

export type LaunchSiteStatus = "draft" | "published" | "unpublished";

export interface LaunchSiteRecord {
  siteId: string;
  orderId: string;
  ownerId: string;
  publicSlug: string;
  status: LaunchSiteStatus;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LaunchSiteTruthLabel = "VERIFIED" | "INFERRED" | "VALIDATION_STAGE";

export interface LaunchSitePresentationBlock {
  job: "hero" | "specific_promise" | "customer_qualifier" | "pain_cost" | "mechanism" | "offer" | "inclusions" | "how_it_works" | "evidence_proof" | "risk_scope_boundary" | "primary_cta" | "objections" | "faq_final_cta";
  eyebrow: string;
  heading: string;
  body: string;
  truthLabel: LaunchSiteTruthLabel;
  items: string[];
}

/** A deterministic, canonical-only projection for the validation Launch Site.
 * It deliberately has no generated-site dependency. */
export interface LaunchSitePresentationModel {
  schemaVersion: "ghosttown-launch-site-presentation-v1";
  title: string;
  description: string;
  businessName: string;
  blocks: LaunchSitePresentationBlock[];
  primaryCta: string;
  secondaryCta: string;
  formConsent: string;
}

interface SiteRow {
  site_id: string;
  order_id: string;
  owner_id: string;
  public_slug: string;
  status: LaunchSiteStatus;
  published_at: string | null;
  unpublished_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadRow {
  lead_id: string;
  email: string;
  name: string | null;
  message: string | null;
  source_path: string;
  consent_text: string;
  created_at: string;
}

const privateJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });

function db(env: Env): D1Database {
  if (!env.DB) throw new Error("Launch Blueprint D1 binding is not configured");
  return env.DB;
}

function record(row: SiteRow): LaunchSiteRecord {
  return {
    siteId: row.site_id,
    orderId: row.order_id,
    ownerId: row.owner_id,
    publicSlug: row.public_slug,
    status: row.status,
    publishedAt: row.published_at,
    unpublishedAt: row.unpublished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48) || "launch"
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] || char,
  );
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

const genericCopy = /unlock your potential|revolutionize your workflow|game.?changer|best-in-class|next.?level/i;

export function composeLaunchSitePresentation(blueprint: GhostTownLaunchBlueprint): LaunchSitePresentationModel {
  const site = blueprint.launchSite;
  const copy = blueprint.landingPageCopy;
  const validation = "Validation-stage: this is a bounded offer, not a promised business, compliance, conversion, or revenue outcome.";
  const blocks: LaunchSitePresentationBlock[] = [
    { job: "hero", eyebrow: site.site.businessName, heading: site.offer.headline, body: site.offer.subheadline, truthLabel: "INFERRED", items: [] },
    { job: "specific_promise", eyebrow: "The specific promise", heading: site.offer.offerName, body: copy.offerDescription, truthLabel: "INFERRED", items: [] },
    { job: "customer_qualifier", eyebrow: "Built for", heading: site.offer.targetCustomer, body: `This is for ${site.positioning.idealFor.join(", ")}. It is not for ${site.positioning.notFor.join(", ")}.`, truthLabel: "INFERRED", items: site.positioning.idealFor },
    { job: "pain_cost", eyebrow: "The cost of waiting", heading: "The problem this tests", body: site.problem.summary, truthLabel: "INFERRED", items: site.problem.painPoints },
    { job: "mechanism", eyebrow: "Why this approach", heading: site.positioning.differentiator, body: copy.currentAlternativeSection, truthLabel: "INFERRED", items: [] },
    { job: "offer", eyebrow: "The bounded offer", heading: `${site.offer.price} — ${site.offer.priceExplanation}`, body: site.solution.summary, truthLabel: "INFERRED", items: [] },
    { job: "inclusions", eyebrow: "What you receive", heading: "Included in this scope", body: "The listed deliverables define the work before either party proceeds.", truthLabel: "VERIFIED", items: site.solution.deliverables },
    { job: "how_it_works", eyebrow: "How it works", heading: "A clear, manual path", body: site.offer.deliveryMethod, truthLabel: "INFERRED", items: copy.howItWorks.map(step => `${step.step}: ${step.description}`) },
    { job: "evidence_proof", eyebrow: "Evidence, honestly labeled", heading: "What is known and what is still being tested", body: validation, truthLabel: "VALIDATION_STAGE", items: [...site.proof.claimsAllowed, ...site.proof.proofPlaceholders] },
    { job: "risk_scope_boundary", eyebrow: "Risk and scope", heading: "What this does not claim", body: `${site.riskReversal.text} ${validation}`, truthLabel: "VALIDATION_STAGE", items: site.positioning.notFor },
    { job: "primary_cta", eyebrow: "Check fit before you commit", heading: site.offer.callToAction, body: "Share the relevant context. A request is not an acceptance or a charge.", truthLabel: "VERIFIED", items: [] },
    { job: "objections", eyebrow: "Common questions before a request", heading: "Start with the boundary", body: "We confirm fit, scope, exclusions, and the price boundary before work begins.", truthLabel: "INFERRED", items: ["This complements the current alternative; it does not pretend to replace it."] },
    { job: "faq_final_cta", eyebrow: "Still deciding?", heading: site.offer.secondaryCallToAction, body: copy.thankYouPageCopy, truthLabel: "INFERRED", items: site.faq.map(item => `${item.question} — ${item.answer}`) }
  ];
  return { schemaVersion: "ghosttown-launch-site-presentation-v1", title: copy.metadataTitle, description: copy.metadataDescription, businessName: site.site.businessName, blocks, primaryCta: site.leadCapture.buttonLabel, secondaryCta: site.offer.secondaryCallToAction, formConsent: "I agree that this business may contact me about this offer." };
}

export function validateLaunchSitePresentation(model: LaunchSitePresentationModel, blueprint: GhostTownLaunchBlueprint): string[] {
  const failures: string[] = [];
  const jobs = ["hero", "specific_promise", "customer_qualifier", "pain_cost", "mechanism", "offer", "inclusions", "how_it_works", "evidence_proof", "risk_scope_boundary", "primary_cta", "objections", "faq_final_cta"];
  if (model.blocks.map(block => block.job).join(",") !== jobs.join(",")) failures.push("The canonical 13 conversion jobs are incomplete or unordered.");
  const rendered = JSON.stringify(model);
  for (const value of [blueprint.launchSite.offer.headline, blueprint.launchSite.offer.targetCustomer, blueprint.launchSite.offer.price, blueprint.launchSite.offer.callToAction]) if (!value.trim() || !rendered.includes(value)) failures.push("Customer, offer, price, or CTA no longer matches the canonical Blueprint.");
  if (genericCopy.test(rendered)) failures.push("Generic conversion copy is not allowed on the validation Launch Site.");
  if (!model.blocks.every(block => block.heading.trim() && block.body.trim() && ["VERIFIED", "INFERRED", "VALIDATION_STAGE"].includes(block.truthLabel))) failures.push("Every conversion block needs copy and an honest truth label.");
  if (!rendered.includes("Validation-stage")) failures.push("Validation-stage truth boundary is missing.");
  return failures;
}

export function launchSitePublishFailures(
  blueprint: GhostTownLaunchBlueprint,
): string[] {
  const config = blueprint.launchSite;
  const failures: string[] = [];
  if (blueprint.status !== "ready" || !blueprint.qualityGate.passed)
    failures.push("The canonical Blueprint quality gate has not passed.");
  if (config.proof.status !== "validation-stage")
    failures.push("Proof must remain explicitly labeled as validation-stage.");
  if (!config.offer.headline.trim() || !config.offer.callToAction.trim())
    failures.push("Headline and primary call to action are required.");
  if (!config.site.contactEmail.trim())
    failures.push("A contact email is required.");
  if (
    !config.legal.privacyPolicy ||
    !config.legal.termsOfService ||
    !config.legal.disclaimer
  )
    failures.push("Privacy, terms, and disclaimer flags must be enabled.");
  if (!config.proof.proofPlaceholders.length)
    failures.push("At least one honest proof placeholder is required.");
  return failures;
}

async function siteByOrder(env: Env, orderId: string): Promise<SiteRow | null> {
  return db(env)
    .prepare("SELECT * FROM launch_sites WHERE order_id = ?")
    .bind(orderId)
    .first<SiteRow>();
}

async function ensureSite(
  env: Env,
  blueprint: GhostTownLaunchBlueprint,
): Promise<SiteRow> {
  const existing = await siteByOrder(env, blueprint.orderId);
  if (existing) return existing;
  const base = `${safeSlug(blueprint.launchSite.site.businessName || blueprint.offer.offerName)}-${blueprint.orderId.slice(-8).toLowerCase()}`;
  const now = new Date().toISOString();
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    try {
      await db(env)
        .prepare(
          `INSERT INTO launch_sites (site_id, order_id, owner_id, public_slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
        )
        .bind(
          `site_${crypto.randomUUID()}`,
          blueprint.orderId,
          blueprint.ownerId.trim().toLowerCase(),
          slug,
          now,
          now,
        )
        .run();
      const created = await siteByOrder(env, blueprint.orderId);
      if (created) return created;
    } catch (error) {
      const concurrent = await siteByOrder(env, blueprint.orderId);
      if (concurrent) return concurrent;
      if (!String(error).toLowerCase().includes("unique")) throw error;
    }
  }
  throw new Error("A unique Launch Site URL could not be allocated");
}

export async function handleLaunchSiteOwner(
  request: Request,
  env: Env,
  orderId: string,
  action: "get" | "publish" | "unpublish" | "leads" | "csv",
): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const stored = await loadBlueprintRecord(env, orderId);
  if (!stored)
    return privateJson(
      { error: "Canonical Launch Blueprint record not found" },
      404,
    );
  let site = await ensureSite(env, stored.blueprint);
  if (site.owner_id !== owned.email.trim().toLowerCase())
    return privateJson({ error: "Launch Site not found" }, 404);
  if (action === "publish") {
    const failures = launchSitePublishFailures(stored.blueprint);
    if (failures.length)
      return privateJson(
        { error: "Launch Site is not publishable", failures },
        409,
      );
    const now = new Date().toISOString();
    await db(env)
      .prepare(
        `UPDATE launch_sites SET status = 'published', published_at = ?, unpublished_at = NULL, updated_at = ? WHERE order_id = ? AND owner_id = ?`,
      )
      .bind(now, now, orderId, site.owner_id)
      .run();
    site = (await siteByOrder(env, orderId))!;
  } else if (action === "unpublish") {
    const now = new Date().toISOString();
    await db(env)
      .prepare(
        `UPDATE launch_sites SET status = 'unpublished', unpublished_at = ?, updated_at = ? WHERE order_id = ? AND owner_id = ?`,
      )
      .bind(now, now, orderId, site.owner_id)
      .run();
    site = (await siteByOrder(env, orderId))!;
  }
  const publicUrl = `${new URL(request.url).origin}/launch/${encodeURIComponent(site.public_slug)}`;
  if (action === "leads" || action === "csv") {
    const result = await db(env)
      .prepare(
        "SELECT lead_id, email, name, message, source_path, consent_text, created_at FROM launch_site_leads WHERE site_id = ? ORDER BY created_at DESC",
      )
      .bind(site.site_id)
      .all<LeadRow>();
    const leads = result.results || [];
    if (action === "csv") {
      const cell = (value: unknown) => {
        const raw = String(value ?? "");
        const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const rows = [
        [
          "lead_id",
          "email",
          "name",
          "message",
          "source_path",
          "consent_text",
          "created_at",
        ],
        ...leads.map((item) => [
          item.lead_id,
          item.email,
          item.name || "",
          item.message || "",
          item.source_path,
          item.consent_text,
          item.created_at,
        ]),
      ];
      return new Response(
        rows.map((row) => row.map(cell).join(",")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="launch-site-${site.public_slug}-leads.csv"`,
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return privateJson({ site: record(site), publicUrl, leads });
  }
  return privateJson({
    site: record(site),
    publicUrl,
    publishFailures: launchSitePublishFailures(stored.blueprint),
    canonicalBlueprintId: stored.blueprint.blueprintId,
  });
}

async function publishedSite(
  env: Env,
  slug: string,
): Promise<{ site: SiteRow; blueprint: GhostTownLaunchBlueprint } | null> {
  const site = await db(env)
    .prepare(
      `SELECT * FROM launch_sites WHERE public_slug = ? AND status = 'published'`,
    )
    .bind(slug)
    .first<SiteRow>();
  if (!site) return null;
  const stored = await loadBlueprintRecord(env, site.order_id);
  return stored ? { site, blueprint: stored.blueprint } : null;
}

export async function handlePublicLaunchSite(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const loaded = await publishedSite(env, slug);
  if (!loaded)
    return new Response("Launch Site not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const html = renderLaunchSite(
    loaded.blueprint,
    loaded.site.public_slug,
  ).replace("<script>", `<script nonce="${nonce}">`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

export async function handlePublicLaunchLead(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const loaded = await publishedSite(env, slug);
  if (!loaded) return privateJson({ error: "Launch Site not found" }, 404);
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${loaded.site.site_id}:${ip}`),
    ),
  );
  const rateKey = `launch_lead_rate_${Array.from(digest.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const count = Number((await env.KV.get(rateKey)) || "0");
  if (count >= 5)
    return privateJson(
      { error: "Too many submissions. Try again later." },
      429,
    );
  let body: {
    email?: unknown;
    name?: unknown;
    message?: unknown;
    consent?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body" }, 400);
  }
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const name = String(body.name || "")
    .trim()
    .slice(0, 120);
  const message = String(body.message || "")
    .trim()
    .slice(0, 2000);
  if (!validEmail(email) || body.consent !== true)
    return privateJson(
      { error: "A valid email and explicit consent are required" },
      400,
    );
  const now = new Date().toISOString();
  await db(env)
    .prepare(
      "INSERT INTO launch_site_leads (lead_id, site_id, email, name, message, source_path, consent_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `lead_${crypto.randomUUID()}`,
      loaded.site.site_id,
      email,
      name || null,
      message || null,
      `/launch/${slug}`,
      "I agree that this business may contact me about this offer.",
      now,
    )
    .run();
  await env.KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  return privateJson(
    { ok: true, message: loaded.blueprint.landingPageCopy.thankYouPageCopy },
    201,
  );
}

export function renderLaunchSite(
  blueprint: GhostTownLaunchBlueprint,
  slug: string,
): string {
  const config = blueprint.launchSite;
  const presentation = composeLaunchSitePresentation(blueprint);
  const presentationFailures = validateLaunchSitePresentation(presentation, blueprint);
  if (presentationFailures.length) {
    throw new Error(`Launch Site presentation is not safe to render: ${presentationFailures.join(" ")}`);
  }
  const list = (values: string[]) =>
    values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  const positioning = presentation.blocks
    .slice(1)
    .map((block) => `<section class="conversion-job conversion-${escapeHtml(block.job)}" data-conversion-job="${escapeHtml(block.job)}"><p><small>${escapeHtml(block.truthLabel.replace(/_/g, " "))}</small></p><h2>${escapeHtml(block.heading)}</h2><p>${escapeHtml(block.body)}</p>${block.items.length ? `<ul>${list(block.items)}</ul>` : ""}</section>`)
    .join("");
  const faq = positioning + config.faq
    .map(
      (item) =>
        `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(blueprint.landingPageCopy.metadataTitle)}</title><meta name="description" content="${escapeHtml(blueprint.landingPageCopy.metadataDescription)}"><style>body{margin:0;font:17px/1.55 system-ui;background:#f7f2e8;color:#17231d}main{max-width:920px;margin:auto;padding:48px 20px}section{background:#fff;padding:28px;margin:22px 0;border:1px solid #ddd5c8;border-radius:16px}h1{font-size:clamp(2.4rem,7vw,5rem);line-height:1}button{min-height:48px;background:#b64f2d;color:white;border:0;border-radius:8px;padding:12px 20px;font-weight:800}input,textarea{box-sizing:border-box;width:100%;padding:12px;margin:6px 0 14px;border:1px solid #aaa;border-radius:8px}.proof{background:#fff4d6}small{color:#555}</style></head><body><main><p>${escapeHtml(config.site.businessName)}</p><h1>${escapeHtml(config.offer.headline)}</h1><p>${escapeHtml(config.offer.subheadline)}</p><section><h2>${escapeHtml(config.offer.offerName)}</h2><p>${escapeHtml(config.solution.summary)}</p><ul>${list(config.solution.deliverables)}</ul><p><strong>${escapeHtml(config.offer.price)}</strong> — ${escapeHtml(config.offer.priceExplanation)}</p></section><section><h2>The problem</h2><p>${escapeHtml(config.problem.summary)}</p><ul>${list(config.problem.painPoints)}</ul></section><section class="proof"><strong>Validation-stage offer</strong><p>${escapeHtml(config.proof.claimsAllowed.join(" "))}</p><ul>${list(config.proof.proofPlaceholders)}</ul></section><section><h2>Questions</h2>${faq}</section><section id="contact"><h2>${escapeHtml(config.offer.callToAction)}</h2><form data-lead-form><label>Email<input name="email" type="email" required maxlength="254"></label><label>Name<input name="name" maxlength="120"></label><label>Message<textarea name="message" maxlength="2000"></textarea></label><label><input name="consent" type="checkbox" required style="width:auto"> I agree that this business may contact me about this offer.</label><p><button type="submit">${escapeHtml(config.leadCapture.buttonLabel)}</button></p><p data-message></p></form></section><small>${escapeHtml(config.riskReversal.text)} · Privacy policy · Terms of service · Validation disclaimer</small></main><script>document.querySelector('[data-lead-form]').addEventListener('submit',async function(e){e.preventDefault();const f=e.currentTarget,m=document.querySelector('[data-message]');const r=await fetch('/api/launch-sites/${encodeURIComponent(slug)}/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value,name:f.name.value,message:f.message.value,consent:f.consent.checked})});const b=await r.json();m.textContent=b.message||b.error||'Saved';if(r.ok)f.reset()})</script></body></html>`;
}
