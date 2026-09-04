import { useEffect, useMemo, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type {
  DistributionTargetType,
  GhostTownLaunchBlueprint,
} from "../types/launchBlueprint";
import LaunchSitePanel from "./LaunchSitePanel";

type Section =
  | "overview"
  | "offer"
  | "distribution"
  | "copy"
  | "site"
  | "calendar"
  | "decision";
type MetricKey =
  | "outreachSent"
  | "replies"
  | "interviews"
  | "qualifiedConversations"
  | "commitments"
  | "revenueCents";

interface BlueprintProgress {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  metrics: Record<MetricKey, number>;
  finalDecision?: "continue" | "revise" | "pivot" | "stop";
  updatedAt: string;
}

interface BlueprintPayload {
  blueprint: GhostTownLaunchBlueprint;
  progress: BlueprintProgress;
  research: {
    provider: string;
    model: string;
    completedAt: string;
    webSearchQueries: string[];
    attemptedSourceCount: number;
    successfulSourceCount: number;
    sourceTypeCount: number;
    verifiedChannelCount: number;
    rejectedUrlCount: number;
    failedSourceCount: number;
    seedDomains?: string[];
    targetTypeCounts?: Record<string, number>;
  };
}

interface Props {
  orderId: string;
  onBack: () => void;
}

const sections: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "offer", label: "Offer" },
  { id: "distribution", label: "Media Network" },
  { id: "copy", label: "Launch Copy" },
  { id: "site", label: "Launch Site" },
  { id: "calendar", label: "30-Day Calendar" },
  { id: "decision", label: "Decision" },
];

const targetLabels: Record<DistributionTargetType, string> = {
  podcast: "Podcasts",
  youtube_creator: "YouTube Creators",
  newsletter_or_publication: "Newsletters & Publications",
  event: "Events",
  association: "Associations",
  review_site: "Review Sites",
  complementary_partner: "Complementary Partners",
  community: "Communities",
};

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function targetLabel(value?: DistributionTargetType): string {
  return value ? targetLabels[value] : "Distribution Target";
}

export default function LaunchBlueprintView({ orderId, onBack }: Props) {
  const [payload, setPayload] = useState<BlueprintPayload | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(
      apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`),
      { headers: authHeaders() },
    )
      .then(async (response) => {
        const body = await response.json<
          BlueprintPayload & { error?: string }
        >();
        if (!response.ok || !body.blueprint)
          throw new Error(body.error || "Launch Blueprint could not be opened");
        return body;
      })
      .then(setPayload)
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Launch Blueprint could not be opened",
        ),
      )
      .finally(() => setLoading(false));
  }, [orderId]);

  const completionPercent = useMemo(() => {
    if (!payload) return 0;
    return Math.round((payload.progress.completedDays.length / 30) * 100);
  }, [payload]);

  const groupedChannels = useMemo(() => {
    const groups = new Map<
      string,
      GhostTownLaunchBlueprint["customerAccessPack"]["channels"]
    >();
    for (const channel of payload?.blueprint.customerAccessPack.channels ||
      []) {
      const key = channel.targetType || "community";
      const group = groups.get(key) || [];
      group.push(channel);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }, [payload]);

  const saveProgress = async (progress: BlueprintProgress) => {
    if (!payload) return;
    setPayload({ ...payload, progress });
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        apiUrl(
          `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`,
        ),
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(progress),
        },
      );
      const body = await response.json<{
        progress?: BlueprintProgress;
        error?: string;
      }>();
      if (!response.ok || !body.progress)
        throw new Error(body.error || "Progress could not be saved");
      setPayload((current) =>
        current ? { ...current, progress: body.progress! } : current,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Progress could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayNumber: number) => {
    if (!payload) return;
    const completed = new Set(payload.progress.completedDays);
    if (completed.has(dayNumber)) completed.delete(dayNumber);
    else completed.add(dayNumber);
    void saveProgress({
      ...payload.progress,
      completedDays: [...completed].sort((a, b) => a - b),
    });
  };

  const setEvidenceNote = (key: string, value: string) => {
    if (!payload) return;
    setPayload({
      ...payload,
      progress: {
        ...payload.progress,
        evidenceNotes: { ...payload.progress.evidenceNotes, [key]: value },
      },
    });
  };

  const setMetric = (key: MetricKey, value: number) => {
    if (!payload) return;
    void saveProgress({
      ...payload.progress,
      metrics: {
        ...payload.progress.metrics,
        [key]: Math.max(0, Math.floor(value || 0)),
      },
    });
  };

  const copyText = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const download = async () => {
    setError("");
    try {
      const path = `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error('Blueprint PDF is not available');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed");
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-6xl p-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" />
        <p className="mt-4 text-gray-600">Opening your Launch Blueprint...</p>
      </div>
    );
  if (error && !payload)
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </p>
        <button onClick={onBack} className="mt-5 font-bold text-ghost-rust">
          Return to Dashboard
        </button>
      </div>
    );
  if (!payload) return null;

  const { blueprint, progress, research } = payload;

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-ghost-ink">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-ghost-ink text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10"
            >
              ← Dashboard
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                GhostTown Launch Blueprint
              </p>
              <h1 className="text-lg font-black sm:text-xl">
                {blueprint.offer.offerName}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 text-right text-xs text-white/70">
              <div>{progress.completedDays.length}/30 days complete</div>
              <div>
                {saving
                  ? "Saving..."
                  : `Saved ${new Date(progress.updatedAt).toLocaleString()}`}
              </div>
            </div>
            <button
              onClick={() => void download()}
              className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white"
            >
              PDF
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold ${section === item.id ? "bg-ghost-rust text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7 sm:p-6">
        {error && (
          <p
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {section === "overview" && (
          <div className="space-y-6">
            <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <article className="rounded-2xl bg-ghost-ink p-7 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                  Executive launch decision
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight">
                  {blueprint.executiveDecision.strongestOpportunity}
                </h2>
                <p className="mt-5 text-white/80">
                  {blueprint.executiveDecision.verdict}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase text-ghost-gold">
                      First customer
                    </p>
                    <p className="mt-2 font-bold">
                      {blueprint.executiveDecision.recommendedInitialCustomer}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase text-ghost-gold">
                      Risk boundary
                    </p>
                    <p className="mt-2 font-bold">
                      {blueprint.executiveDecision.founderTimeRiskHours} hours ·
                      ${blueprint.executiveDecision.founderCashRiskMaximum}
                    </p>
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">Execution progress</h2>
                  <span className="text-3xl font-black text-ghost-rust">
                    {completionPercent}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-ghost-rust"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt>Distribution targets</dt>
                    <dd className="font-black">
                      {research.verifiedChannelCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Target types</dt>
                    <dd className="font-black">{research.sourceTypeCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Finished posts</dt>
                    <dd className="font-black">5</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Outreach scripts</dt>
                    <dd className="font-black">
                      {blueprint.customerAccessPack.outreachScripts.length}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
            <section className="rounded-2xl border border-ghost-rust/30 bg-[#fff7f2] p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">
                Where to find likely customers
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Places and people that already reach customers like yours.
              </h2>
              <p className="mt-3 text-gray-700">
                GhostTown found podcasts, creators, publications, events, review sites, associations, and partners that may help you reach likely customers. Each one includes a public way to reach them, what to send, what to say, and why it may fit.
              </p>
              <button
                onClick={() => setSection("distribution")}
                className="mt-5 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white"
              >
                Review these opportunities
              </button>
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {blueprint.weeklyMilestones.map((week) => (
                <article
                  key={week.weekNumber}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <p className="text-xs font-black uppercase text-ghost-rust">
                    Week {week.weekNumber}
                  </p>
                  <h3 className="mt-2 font-black">{week.objective}</h3>
                  <p className="mt-3 text-sm text-gray-600">{week.milestone}</p>
                </article>
              ))}
            </section>
          </div>
        )}

        {section === "offer" && (
          <div className="space-y-6">
            <section className="rounded-2xl bg-ghost-ink p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                Ready-to-test offer
              </p>
              <h2 className="mt-3 text-3xl font-black">
                {blueprint.offer.offerName}
              </h2>
              <p className="mt-4 max-w-4xl text-lg text-white/80">
                {blueprint.offer.oneSentencePromise}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-ghost-rust px-4 py-2 font-black">
                  {blueprint.offer.initialTestPrice}
                </span>
                <span className="rounded-full border border-white/25 px-4 py-2">
                  First value: {blueprint.offer.timeToFirstUsefulResult}
                </span>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-2">
              {blueprint.offer.deliverables.map((item) => (
                <article
                  key={item.name}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <h3 className="font-black text-ghost-rust">{item.name}</h3>
                  <p className="mt-2 text-sm text-gray-700">
                    {item.description}
                  </p>
                  {item.timeToValue && (
                    <p className="mt-3 text-xs font-bold uppercase text-gray-500">
                      Time to value: {item.timeToValue}
                    </p>
                  )}
                </article>
              ))}
            </section>
            <section className="space-y-3">
              {blueprint.offer.objections.map((item) => (
                <details
                  key={item.objection}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <summary className="cursor-pointer font-black">
                    {item.objection}
                  </summary>
                  <p className="mt-3 text-sm text-gray-700">{item.response}</p>
                </details>
              ))}
            </section>
          </div>
        )}

        {section === "distribution" && (
          <div className="space-y-8">
            <section className="rounded-2xl bg-ghost-ink p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                Media & Distribution Network
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Where comparable businesses already earn attention.
              </h2>
              <p className="mt-4 max-w-4xl text-white/80">
                GhostTown finished this research on{" "}
                {new Date(research.completedAt).toLocaleString()}. Review the places and people it found, then choose where to start.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(research.seedDomains || []).map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold"
                  >
                    Starting example: {domain}
                  </span>
                ))}
              </div>
            </section>
            {groupedChannels.map(([type, channels]) => (
              <section key={type}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-ghost-rust">
                      {channels.length} verified targets
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {targetLabel(type as DistributionTargetType)}
                    </h2>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {channels.map((channel, index) => (
                    <article
                      key={channel.channelId}
                      className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-ghost-rust">
                            #{index + 1} · {targetLabel(channel.targetType)}
                          </p>
                          <h3 className="mt-1 text-xl font-black">
                            {channel.community}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            {channel.platform} · {channel.activity} ·{" "}
                            {channel.confidence} confidence
                          </p>
                        </div>
                        <a
                          href={channel.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust"
                        >
                          Open source ↗
                        </a>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-gray-700">
                        {channel.relevance}
                      </p>
                      {Boolean(channel.competitorEvidence?.length) && (
                        <div className="mt-4 rounded-lg bg-[#fff7f2] p-4">
                          <p className="text-xs font-black uppercase text-ghost-rust">
                            Why this target is proven
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-gray-700">
                            {channel.competitorEvidence?.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <dl className="mt-4 space-y-3 text-sm">
                        <div>
                          <dt className="font-black">Audience owner</dt>
                          <dd className="text-gray-600">
                            {channel.audienceOwner || channel.community}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">Public access path</dt>
                          <dd className="text-gray-600">
                            {channel.accessPath || channel.participationRules}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">Prepared asset</dt>
                          <dd className="text-gray-600">
                            {channel.preparedAsset || channel.usefulTopic}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">Recommended approach</dt>
                          <dd className="text-gray-600">
                            {channel.recommendedApproach}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">Matching script</dt>
                          <dd className="text-gray-600">
                            {channel.outreachScriptId ||
                              "Use the closest relationship-specific script."}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">First action</dt>
                          <dd className="text-gray-600">
                            {channel.firstAction}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">Risk</dt>
                          <dd className="text-gray-600">{channel.risk}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            <section>
              <h2 className="text-2xl font-black">
                Five finished helpful assets
              </h2>
              <div className="mt-4 space-y-4">
                {blueprint.customerAccessPack.helpfulPosts.map((post) => (
                  <article
                    key={post.postId}
                    className="rounded-xl border border-black/10 bg-white p-6"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-ghost-rust">
                          {post.intendedCommunity}
                        </p>
                        <h3 className="mt-1 text-xl font-black">
                          {post.title}
                        </h3>
                      </div>
                      <button
                        onClick={() =>
                          void copyText(
                            post.postId,
                            `${post.title}\n\n${post.body}\n\n${post.closingQuestion}`,
                          )
                        }
                        className="h-fit rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust"
                      >
                        {copied === post.postId ? "Copied" : "Copy asset"}
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {post.body}
                    </p>
                    <p className="mt-4 font-bold">{post.closingQuestion}</p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">
                Relationship-specific outreach scripts
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {blueprint.customerAccessPack.outreachScripts.map((script) => (
                  <article
                    key={script.scriptId}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <div className="flex justify-between gap-3">
                      <h3 className="font-black">{script.title}</h3>
                      <button
                        onClick={() =>
                          void copyText(script.scriptId, script.message)
                        }
                        className="text-xs font-black text-ghost-rust"
                      >
                        {copied === script.scriptId ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-gray-500">
                      {script.useWhen}
                    </p>
                    <p className="mt-4 text-sm leading-6 text-gray-700">
                      {script.message}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === "copy" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
            <section className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm">
              <p className="text-xs font-black uppercase text-ghost-rust">
                Launch page preview
              </p>
              <p className="mt-8 text-sm font-black uppercase tracking-widest text-gray-500">
                {blueprint.landingPageCopy.targetCustomerCallout}
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight">
                {blueprint.landingPageCopy.headline}
              </h2>
              <p className="mt-5 text-xl text-gray-600">
                {blueprint.landingPageCopy.subheadline}
              </p>
              <div className="mt-8 rounded-xl bg-[#fff7f2] p-5">
                <h3 className="font-black">The problem</h3>
                <p className="mt-2 text-gray-700">
                  {blueprint.landingPageCopy.problemSection}
                </p>
              </div>
              <div className="mt-6">
                <h3 className="text-2xl font-black">What is included</h3>
                <ul className="mt-4 space-y-3">
                  {blueprint.landingPageCopy.deliverables.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-black/10 p-4 font-medium"
                    >
                      ✓ {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 rounded-xl bg-ghost-ink p-6 text-white">
                <p className="text-3xl font-black text-ghost-gold">
                  {blueprint.landingPageCopy.pricePresentation}
                </p>
                <p className="mt-3 text-white/75">
                  {blueprint.landingPageCopy.riskReversal}
                </p>
                <button className="mt-5 rounded-lg bg-ghost-rust px-5 py-3 font-black">
                  {blueprint.landingPageCopy.primaryCallToAction}
                </button>
              </div>
            </section>
            <div className="space-y-5">
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">Metadata</h3>
                <p className="mt-3 font-bold">
                  {blueprint.landingPageCopy.metadataTitle}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {blueprint.landingPageCopy.metadataDescription}
                </p>
              </section>
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">How it works</h3>
                <div className="mt-4 space-y-4">
                  {blueprint.landingPageCopy.howItWorks.map((item) => (
                    <div key={item.step}>
                      <p className="font-black text-ghost-rust">{item.step}</p>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">Confirmation email</h3>
                <p className="mt-3 text-sm font-black">
                  {blueprint.landingPageCopy.confirmationEmailSubject}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                  {blueprint.landingPageCopy.confirmationEmailBody}
                </p>
              </section>
            </div>
          </div>
        )}

        {section === "calendar" && (
          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black">
                  30-Day execution calendar
                </h2>
                <p className="mt-2 text-gray-600">
                  Each day includes exact actions, prepared assets, a
                  deliverable, a measurement, and evidence to record.
                </p>
              </div>
              <p className="font-black text-ghost-rust">
                {progress.completedDays.length}/30 complete
              </p>
            </div>
            <div className="space-y-4">
              {blueprint.dailyCalendar.map((day) => {
                const complete = progress.completedDays.includes(day.dayNumber);
                const noteKey = `day-${day.dayNumber}`;
                return (
                  <article
                    key={day.dayNumber}
                    className={`rounded-xl border p-5 ${complete ? "border-green-300 bg-green-50" : "border-black/10 bg-white"}`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleDay(day.dayNumber)}
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 font-black ${complete ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}
                      >
                        {complete ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase text-ghost-rust">
                          Day {day.dayNumber} · {day.estimatedEffort}
                        </p>
                        <h3 className="mt-1 text-xl font-black">{day.title}</h3>
                        <p className="mt-2 text-gray-700">
                          {day.primaryObjective}
                        </p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              Exact actions
                            </p>
                            <ul className="mt-2 space-y-2 text-sm">
                              {day.requiredActions.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              Prepared assets
                            </p>
                            <ul className="mt-2 space-y-2 text-sm">
                              {day.preparedAssets.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 rounded-lg bg-black/5 p-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              Deliverable
                            </p>
                            <p className="mt-1 text-sm">
                              {day.expectedDeliverable}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              Success measurement
                            </p>
                            <p className="mt-1 text-sm">
                              {day.successMeasurement}
                            </p>
                          </div>
                        </div>
                        <label className="mt-4 block text-xs font-black uppercase text-gray-500">
                          Evidence and notes
                          <textarea
                            value={progress.evidenceNotes[noteKey] || ""}
                            onChange={(event) =>
                              setEvidenceNote(noteKey, event.target.value)
                            }
                            onBlur={() => void saveProgress(progress)}
                            placeholder="Record exact replies, links, commitments, objections, screenshots, or other evidence."
                            className="mt-2 min-h-24 w-full rounded-lg border border-gray-300 p-3 text-sm font-normal normal-case"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {section === "decision" && (
          <div className="space-y-7">
            <section>
              <h2 className="text-3xl font-black">Evidence scoreboard</h2>
              <p className="mt-2 text-gray-600">
                Track behavior and commitments, not compliments.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    "outreachSent",
                    "replies",
                    "interviews",
                    "qualifiedConversations",
                    "commitments",
                  ] as MetricKey[]
                ).map((key) => (
                  <label
                    key={key}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <span className="text-xs font-black uppercase text-gray-500">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={progress.metrics[key]}
                      onChange={(event) =>
                        setMetric(key, Number(event.target.value))
                      }
                      className="mt-2 w-full text-3xl font-black outline-none"
                    />
                  </label>
                ))}
                <label className="rounded-xl border border-black/10 bg-white p-5">
                  <span className="text-xs font-black uppercase text-gray-500">
                    Revenue
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(progress.metrics.revenueCents / 100).toFixed(2)}
                    onChange={(event) =>
                      setMetric(
                        "revenueCents",
                        Math.round(Number(event.target.value) * 100),
                      )
                    }
                    className="mt-2 w-full text-3xl font-black outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {money(progress.metrics.revenueCents)}
                  </p>
                </label>
              </div>
            </section>
            <section>
              <h2 className="text-3xl font-black">Final decision</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {blueprint.finalDecision.criteria.map((item) => (
                  <button
                    key={item.decision}
                    onClick={() =>
                      void saveProgress({
                        ...progress,
                        finalDecision: item.decision,
                      })
                    }
                    className={`rounded-xl border p-5 text-left ${progress.finalDecision === item.decision ? "border-ghost-rust bg-[#fff0e7] ring-2 ring-ghost-rust" : "border-black/10 bg-white"}`}
                  >
                    <p className="text-lg font-black uppercase text-ghost-rust">
                      {item.decision}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      {item.condition}
                    </p>
                    <p className="mt-3 text-sm font-bold">
                      Next: {item.nextAction}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Public source appendix</h2>
              <div className="mt-4 space-y-3">
                {blueprint.sources.map((source) => (
                  <article
                    key={source.sourceId}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black">{source.title}</h3>
                        <p className="text-xs text-gray-500">
                          {source.publisher} · accessed{" "}
                          {new Date(source.accessedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-black text-ghost-rust"
                      >
                        Open source ↗
                      </a>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-gray-600">
                      {source.supports.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {section === 'site' && <LaunchSitePanel orderId={orderId} />}
      </main>
    </div>
  );
}
