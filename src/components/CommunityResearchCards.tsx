import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import type { CommunityObservation, CommunityProblem, CommunityPromotionRule } from '../types/communityResearch';
import type { Locale } from '../lib/locale';

interface Props {
  blueprint: GhostTownLaunchBlueprintV21;
  onCopy: (text: string) => void;
  locale?: Locale;
}

interface Copy {
  kicker: string;
  heading: string;
  boundary: string;
  unavailable: string;
  strength: Record<CommunityProblem['strength'], string>;
  promotion: Record<CommunityPromotionRule, string>;
  why: string;
  struggling: string;
  who: string;
  when: string;
  workaround: string;
  against: string;
  howTheyTalk: string;
  fits: string;
  askNext: string;
  prepared: string;
  interviewGuide: string;
  firstMessage: string;
  postFor: string;
  changePlan: string;
  gaps: string;
  copy: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    kicker: 'What your likely customers are struggling with',
    heading: 'Problems in their own words, from the communities we found',
    boundary: 'These quotes show problems people describe in public. They do not show that anyone will buy. Commitments and payments are recorded separately during the Sprint.',
    unavailable: 'GhostTown could not keep a quote that checks out word for word yet. Start with the interview guide, and record what people tell you.',
    strength: { one_mention: 'Mentioned once', repeated_in_one_place: 'Repeated in one place', seen_in_several_places: 'Seen in several places' },
    promotion: { allowed: 'Promotion allowed', limited: 'Promotion limited', not_allowed: 'No promotion', unclear: 'Promotion rule unclear' },
    why: 'Why this matters',
    struggling: 'What people are struggling with',
    who: 'Who',
    when: 'When',
    workaround: 'How they handle it now',
    against: 'What argues against it',
    howTheyTalk: 'How these places talk',
    fits: 'Fits',
    askNext: 'What to ask next',
    prepared: 'What we prepared',
    interviewGuide: 'Interview guide',
    firstMessage: 'First message',
    postFor: 'Post for',
    changePlan: 'What would change the plan',
    gaps: 'Research gaps',
    copy: 'Copy'
  },
  es: {
    kicker: 'Con qué batallan tus posibles clientes',
    heading: 'Problemas con sus propias palabras, de las comunidades que encontramos',
    boundary: 'Estas citas muestran problemas que la gente describe en público. No muestran que alguien vaya a comprar. Los compromisos y pagos se registran aparte durante el Sprint.',
    unavailable: 'GhostTown todavía no pudo guardar una cita que coincida palabra por palabra. Empieza con la guía de entrevistas y anota lo que te digan.',
    strength: { one_mention: 'Mencionado una vez', repeated_in_one_place: 'Repetido en un lugar', seen_in_several_places: 'Visto en varios lugares' },
    promotion: { allowed: 'Se permite promoción', limited: 'Promoción limitada', not_allowed: 'Sin promoción', unclear: 'Regla de promoción no clara' },
    why: 'Por qué importa',
    struggling: 'Con qué batalla la gente',
    who: 'Quién',
    when: 'Cuándo',
    workaround: 'Cómo lo resuelven hoy',
    against: 'Lo que dice lo contrario',
    howTheyTalk: 'Cómo se habla en estos lugares',
    fits: 'Encaja',
    askNext: 'Qué preguntar ahora',
    prepared: 'Lo que preparamos',
    interviewGuide: 'Guía de entrevistas',
    firstMessage: 'Primer mensaje',
    postFor: 'Publicación para',
    changePlan: 'Qué cambiaría el plan',
    gaps: 'Vacíos de investigación',
    copy: 'Copiar'
  }
};

function Quote({ item }: { item: CommunityObservation }) {
  return (
    <li className="rounded-lg bg-gray-50 p-3 text-sm">
      <q className="text-gray-800">{item.quote}</q>
      <a className="mt-1 block text-xs font-black text-ghost-rust" href={item.url} target="_blank" rel="noreferrer">{item.community} ↗</a>
    </li>
  );
}

function Prepared({ title, body, onCopy, copyLabel }: { title: string; body: string; onCopy: (text: string) => void; copyLabel: string }) {
  return (
    <details className="rounded-lg border border-black/10 p-3">
      <summary className="cursor-pointer text-sm font-black">{title}</summary>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{body}</p>
      <button type="button" onClick={() => onCopy(body)} className="mt-2 rounded-lg border border-ghost-rust px-3 py-1 text-xs font-black text-ghost-rust">{copyLabel}</button>
    </details>
  );
}

export default function CommunityResearchCards({ blueprint, onCopy, locale = 'en' }: Props) {
  const research = blueprint.communityResearch;
  if (!research) return null;
  const t = COPY[locale];
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
        <p className="text-xs font-black uppercase text-ghost-rust">{t.kicker}</p>
        <h2 className="mt-1 text-2xl font-black">{t.heading}</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-700">{t.boundary}</p>
        {research.status === 'unavailable' && <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">{t.unavailable}</p>}
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
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black">{t.strength[problem.strength]}</span>
            </div>
            <p className="mt-3 rounded-lg bg-[#fff7f2] p-3 text-sm text-gray-800"><strong>{t.why}:</strong> {problem.whyItMatters}</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-gray-500">{t.struggling}</p>
                <p className="mt-1 text-sm text-gray-700"><strong>{t.who}:</strong> {problem.who} · <strong>{t.when}:</strong> {problem.when} · <strong>{t.workaround}:</strong> {problem.currentWorkaround}</p>
                <ul className="mt-3 space-y-2">{supporting.map(item => <Quote key={item.observationId} item={item} />)}</ul>
                {contradicting.length > 0 && <>
                  <p className="mt-4 text-xs font-black uppercase text-gray-500">{t.against}</p>
                  <ul className="mt-2 space-y-2">{contradicting.map(item => <Quote key={item.observationId} item={item} />)}</ul>
                </>}
                {styles.length > 0 && <>
                  <p className="mt-4 text-xs font-black uppercase text-gray-500">{t.howTheyTalk}</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">{styles.map(style => <li key={style.channelId}><strong>{style.community}:</strong> {style.howPeopleTalk} {t.fits}: {style.formatThatFits} ({t.promotion[style.promotionRule]})</li>)}</ul>
                </>}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">{t.askNext}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{problem.whatToAskNext}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">{t.prepared}</p>
                  <div className="mt-2 space-y-2">
                    <Prepared title={t.interviewGuide} body={interviewGuide} onCopy={onCopy} copyLabel={t.copy} />
                    {messages.map(script => <Prepared key={script.scriptId} title={`${t.firstMessage}: ${script.title}`} body={script.message} onCopy={onCopy} copyLabel={t.copy} />)}
                    {posts.map(post => <Prepared key={post.postId} title={`${t.postFor} ${post.intendedCommunity}: ${post.title}`} body={`${post.title}\n\n${post.body}\n\n${post.closingQuestion}`} onCopy={onCopy} copyLabel={t.copy} />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-500">{t.changePlan}</p>
                  <p className="mt-1 text-sm text-gray-700">{problem.whatWouldChangePlan}</p>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {research.gaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase text-amber-900">{t.gaps}</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">{research.gaps.map(gap => <li key={gap.channelId}><a className="font-black underline" href={gap.url} target="_blank" rel="noreferrer">{gap.community}</a>: {gap.reason}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
