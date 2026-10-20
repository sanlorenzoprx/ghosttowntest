import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import type { CommunityObservation, CommunityProblem } from '../types/communityResearch';

interface Props {
  blueprint: GhostTownLaunchBlueprintV21;
  onCopy: (text: string) => void;
}

const STRENGTH_LABELS: Record<CommunityProblem['strength'], string> = {
  one_mention: 'Mentioned once',
  repeated_in_one_place: 'Repeated in one place',
  seen_in_several_places: 'Seen in several places'
};

const PROMOTION_LABELS = {
  allowed: 'Promotion allowed',
  limited: 'Promotion limited',
  not_allowed: 'No promotion',
  unclear: 'Promotion rule unclear'
} as const;

function Quote({ item }: { item: CommunityObservation }) {
  return (
    <li className="rounded-lg bg-gray-50 p-3 text-sm">
      <q className="text-gray-800">{item.quote}</q>
      <a className="mt-1 block text-xs font-black text-ghost-rust" href={item.url} target="_blank" rel="noreferrer">{item.community} ↗</a>
    </li>
  );
}

function Prepared({ title, body, onCopy }: { title: string; body: string; onCopy: (text: string) => void }) {
  return (
    <details className="rounded-lg border border-black/10 p-3">
      <summary className="cursor-pointer text-sm font-black">{title}</summary>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{body}</p>
      <button type="button" onClick={() => onCopy(body)} className="mt-2 rounded-lg border border-ghost-rust px-3 py-1 text-xs font-black text-ghost-rust">Copy</button>
    </details>
  );
}

export default function CommunityResearchCards({ blueprint, onCopy }: Props) {
  const research = blueprint.communityResearch;
  if (!research) return null;
  const observations = new Map(research.observations.map(item => [item.observationId, item]));
  const channels = new Map(blueprint.customerAccessPack.channels.map(channel => [channel.channelId, channel]));
  const scripts = new Map(blueprint.customerAccessPack.outreachScripts.map(script => [script.scriptId, script]));
  const guide = blueprint.customerInterviewGuide;
  const interviewGuide = [guide.opening, ...guide.lastOccurrenceQuestions, ...guide.currentWorkaroundQuestions, ...guide.costAndConsequenceQuestions]
    .filter(Boolean)
    .join('\n');

  return (
    <section data-testid="community-research" className="space-y-4">
      <div className="rounded-xl border border-black/10 bg-white p-6">
        <p className="text-xs font-black uppercase text-ghost-rust">What your likely customers are struggling with</p>
        <h2 className="mt-1 text-2xl font-black">Problems in their own words, from the communities we found</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-700">{research.boundary}</p>
        {research.status === 'unavailable' && <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">GhostTown could not keep a quote that checks out word for word yet. Start with the interview guide, and record what people tell you.</p>}
      </div>

      {research.problems.map(problem => {
        const supporting = problem.observationIds.map(id => observations.get(id)).filter((item): item is CommunityObservation => Boolean(item));
        const contradicting = problem.contradictingObservationIds.map(id => observations.get(id)).filter((item): item is CommunityObservation => Boolean(item));
        const places = problem.channelIds.map(id => channels.get(id)).filter(Boolean);
        const posts = blueprint.customerAccessPack.helpfulPosts.filter(post => places.some(channel => channel && post.intendedCommunity === channel.community));
        const messages = places.map(channel => channel?.outreachScriptId ? scripts.get(channel.outreachScriptId) : undefined).filter((item, index, all): item is NonNullable<typeof item> => Boolean(item) && all.indexOf(item) === index);
        const styles = research.styles.filter(style => problem.channelIds.includes(style.channelId));
        return (
          <article key={problem.problemId} data-testid="community-problem" className="rounded-xl border border-black/10 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-xl font-black">{problem.title}</h3>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black">{STRENGTH_LABELS[problem.strength]}</span>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-gray-500">What people are struggling with</p>
                <p className="mt-1 text-sm text-gray-700"><strong>Who:</strong> {problem.who} · <strong>When:</strong> {problem.when} · <strong>How they handle it now:</strong> {problem.currentWorkaround}</p>
                <ul className="mt-3 space-y-2">{supporting.map(item => <Quote key={item.observationId} item={item} />)}</ul>
                {contradicting.length > 0 && <>
                  <p className="mt-4 text-xs font-black uppercase text-gray-500">What argues against it</p>
                  <ul className="mt-2 space-y-2">{contradicting.map(item => <Quote key={item.observationId} item={item} />)}</ul>
                </>}
                {styles.length > 0 && <>
                  <p className="mt-4 text-xs font-black uppercase text-gray-500">How these places talk</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">{styles.map(style => <li key={style.channelId}><strong>{style.community}:</strong> {style.howPeopleTalk} Fits: {style.formatThatFits} ({PROMOTION_LABELS[style.promotionRule]})</li>)}</ul>
                </>}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">What to ask next</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{problem.whatToAskNext}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">What we prepared</p>
                  <div className="mt-2 space-y-2">
                    <Prepared title="Interview guide" body={interviewGuide} onCopy={onCopy} />
                    {messages.map(script => <Prepared key={script.scriptId} title={`First message: ${script.title}`} body={script.message} onCopy={onCopy} />)}
                    {posts.map(post => <Prepared key={post.postId} title={`Post for ${post.intendedCommunity}: ${post.title}`} body={`${post.title}\n\n${post.body}\n\n${post.closingQuestion}`} onCopy={onCopy} />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">What would change the plan</p>
                  <p className="mt-1 text-sm text-gray-700">{problem.whatWouldChangePlan}</p>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {research.gaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase text-amber-900">Research gaps</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">{research.gaps.map(gap => <li key={gap.channelId}><a className="font-black underline" href={gap.url} target="_blank" rel="noreferrer">{gap.community}</a>: {gap.reason}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
