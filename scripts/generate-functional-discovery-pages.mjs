import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_ORIGIN = 'https://ghosttowntest.com';
const API_ORIGIN = 'https://api.ghosttowntest.com';
const INTENTS_PATH = path.join(ROOT, 'config', 'functional-discovery-intents.json');
const ACQUISITION_KEYS = ['source', 'utm_source', 'campaign', 'utm_campaign', 'platform', 'creative_id', 'publication_id', 'experiment_id', 'distribution_account_id', 'share_type'];

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function jsonScript(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function renderMarkdown(intent) {
  const url = `${SITE_ORIGIN}/${intent.slug}`;
  return `# ${intent.headline}\n\n${intent.description}\n\n## What GhostTown does\n\nGhostTown turns a business idea into a bounded verdict about what is worth testing next. It identifies the largest uncertainty, reasons for and against the current hypothesis, the fastest useful commitment test, and the first action. It does not guarantee that the business will succeed.\n\n## Start the ${intent.intent} test\n\nUse the interactive version: ${url}\n\nThe page calls GhostTown's canonical free-verdict adapter at ${API_ORIGIN}/api/v1/free-verdict. Missing assessment answers are requested from the user rather than inferred.\n\n## Questions to answer\n\n- Customer: ${intent.customerPrompt}\n- Problem: ${intent.problemPrompt}\n- Current alternative: ${intent.alternativePrompt}\n\n## Examples\n\n${intent.examples.map(item => `- ${item}`).join('\n')}\n\n## Paid continuation\n\nAfter a completed free verdict, a human may choose the GhostTown Launch Blueprint for $97 USD. Purchase always requires explicit human account and checkout action.\n`;
}

function renderPage(intent) {
  const canonical = `${SITE_ORIGIN}/${intent.slug}`;
  const markdown = `${canonical}.md`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: intent.title,
        url: canonical,
        description: intent.description,
        isPartOf: { '@type': 'WebSite', name: 'GhostTown', url: SITE_ORIGIN },
        mainEntity: { '@id': '#ghosttown-verdict' }
      },
      {
        '@id': '#ghosttown-verdict',
        '@type': 'Service',
        name: `GhostTown ${intent.intent}`,
        serviceType: 'Business idea validation',
        description: 'A free business-idea verdict that identifies the largest uncertainty and fastest useful evidence-seeking test.',
        provider: { '@type': 'Organization', name: 'Zayas House LLC', url: SITE_ORIGIN },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
      }
    ]
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(intent.title)}</title>
  <meta name="description" content="${esc(intent.description)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="text/markdown" href="${markdown}">
  <link rel="alternate" type="application/json" href="${SITE_ORIGIN}/openapi.json">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GhostTown">
  <meta property="og:title" content="${esc(intent.title)}">
  <meta property="og:description" content="${esc(intent.description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${jsonScript(structuredData)}</script>
  <style>
    :root{--ink:#1d2622;--forest:#26473b;--rust:#a7472d;--sand:#f4ecdf;--paper:#fffdf8;--line:#ddd3c4;--muted:#606860}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--paper);color:var(--ink)}a{color:var(--forest)}.shell{width:min(1120px,calc(100% - 32px));margin:0 auto}header{border-bottom:1px solid var(--line);background:rgba(255,253,248,.96)}header .shell{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:15px 0}.brand{text-decoration:none;color:var(--ink);font-weight:900;font-size:1.2rem}.brand small{display:block;color:var(--rust);letter-spacing:.18em;text-transform:uppercase;font-size:.58rem}.hero{display:grid;gap:30px;grid-template-columns:minmax(0,1.05fr) minmax(340px,.95fr);padding:58px 0 34px;align-items:start}.eyebrow{color:var(--rust);text-transform:uppercase;font-weight:900;letter-spacing:.14em;font-size:.76rem}h1{font-size:clamp(2.4rem,5vw,4.7rem);line-height:.98;letter-spacing:-.045em;margin:.65rem 0 1.25rem}.lede{font-size:1.18rem;line-height:1.7;color:#4f5651}.proof{margin-top:25px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.proof div,.card{border:1px solid var(--line);background:white;border-radius:14px}.proof div{padding:13px;font-size:.86rem}.card{padding:24px;box-shadow:0 14px 45px rgba(41,35,29,.08)}label{display:block;font-weight:800;margin:16px 0 7px}input,textarea{width:100%;border:1px solid #bfc5bf;border-radius:10px;padding:12px 13px;font:inherit;background:white;color:var(--ink)}textarea{min-height:88px;resize:vertical}.help,.status{color:var(--muted);font-size:.84rem;line-height:1.45}.ack{display:flex;gap:10px;align-items:flex-start;margin:17px 0;padding:13px;background:#f6f8f4;border-radius:10px;font-size:.83rem;line-height:1.45}.ack input,.option input{width:auto}.button,button{border:0;border-radius:10px;background:var(--rust);color:white;font:inherit;font-weight:900;padding:13px 18px;cursor:pointer;display:inline-flex;text-decoration:none}button[disabled]{opacity:.55}.assessment,.result{display:none;margin-top:20px}.assessment.active,.result.active{display:block}fieldset{border:1px solid var(--line);border-radius:12px;padding:15px;margin:12px 0}legend{font-weight:900}.option{display:flex;gap:9px;align-items:flex-start;font-weight:500;margin:9px 0}.verdict{font-size:2rem;font-weight:950;text-transform:capitalize}.fastest{border-left:4px solid var(--forest);background:#eef5f0;padding:14px 16px}.content-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px 0 64px}.content-grid article{background:var(--sand);border-radius:16px;padding:22px}li{line-height:1.6}footer{border-top:1px solid var(--line);padding:28px 0 40px;color:var(--muted);font-size:.86rem}.machine{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px}@media(max-width:860px){.hero,.proof,.content-grid{grid-template-columns:1fr}.hero{padding-top:36px}}
  </style>
</head>
<body data-intent="${esc(intent.slug)}">
<header><div class="shell"><a class="brand" href="/"><small>Leverage / Insight / Timing</small>Ghost Town Test</a><a href="/">All business ideas</a></div></header>
<main class="shell">
  <section class="hero">
    <div>
      <p class="eyebrow">Free ${esc(intent.intent)}</p>
      <h1>${esc(intent.headline)}</h1>
      <p class="lede">${esc(intent.description)}</p>
      <div class="proof"><div><strong>Biggest unknown</strong><br>Find the assumption carrying the most risk.</div><div><strong>Fastest test</strong><br>Get a bounded real-world test.</div><div><strong>Next action</strong><br>Know what to do before deeper build investment.</div></div>
    </div>
    <section class="card" aria-labelledby="tool-title">
      <p class="eyebrow">Run GhostTown now</p><h2 id="tool-title">Start with the business, customer and pain.</h2>
      <form id="idea-form">
        <label for="ideaName">What should we call the idea?</label><input id="ideaName" name="ideaName" required maxlength="160" placeholder="A short working name">
        <label for="description">What does it do?</label><textarea id="description" name="description" required maxlength="1000" placeholder="Describe the offer or product clearly."></textarea>
        <label for="targetUser">Who is the first specific customer?</label><textarea id="targetUser" name="targetUser" required maxlength="320" placeholder="${esc(intent.customerPrompt)}"></textarea>
        <label for="painfulProblem">What painful problem does it solve?</label><textarea id="painfulProblem" name="painfulProblem" required maxlength="500" placeholder="${esc(intent.problemPrompt)}"></textarea>
        <label for="currentAlternative">How do they solve it today?</label><textarea id="currentAlternative" name="currentAlternative" maxlength="500" placeholder="${esc(intent.alternativePrompt)}"></textarea>
        <label for="motivation">Why are you considering it now?</label><textarea id="motivation" name="motivation" maxlength="500" placeholder="Why this idea, and why now?"></textarea>
        <label class="ack"><input type="checkbox" required><span>I understand my submitted business-idea content and GhostTown verdict may be public-facing content. I will not include private, confidential or identifying information.</span></label>
        <button id="start-button" type="submit">Start the free verdict</button>
      </form>
      <p id="status" class="status" role="status" aria-live="polite"></p>
      <section id="assessment" class="assessment"><h2>Finish the assessment</h2><p class="help">GhostTown will not invent these answers.</p><form id="assessment-form"></form><button id="continue-button" type="button">Continue verdict</button></section>
      <section id="result" class="result"><p class="eyebrow">GhostTown verdict</p><div id="verdict" class="verdict"></div><p id="summary"></p><div class="fastest"><strong>Fastest useful test</strong><p id="fastest-test"></p></div><h3>Primary risks</h3><ul id="risks"></ul><h3>Next actions</h3><ol id="actions"></ol><p><a id="result-link" class="button" href="#">Open the secure verdict handoff</a></p><p class="help">The $97 GhostTown Launch Blueprint is available only after a human saves the verdict and explicitly chooses checkout.</p></section>
    </section>
  </section>
  <section class="content-grid"><article><h2>Answer the questions that matter</h2><ul><li><strong>Customer:</strong> ${esc(intent.customerPrompt)}</li><li><strong>Problem:</strong> ${esc(intent.problemPrompt)}</li><li><strong>Alternative:</strong> ${esc(intent.alternativePrompt)}</li></ul></article><article><h2>Common examples</h2><ul>${intent.examples.map(item => `<li>${esc(item)}</li>`).join('')}</ul></article><article><h2>What this is</h2><p>A decision aid for the next evidence-seeking step.</p></article><article><h2>What this is not</h2><p>It is not a promise of success or permission to spend heavily.</p></article></section>
</main>
<footer><div class="shell"><strong>GhostTown</strong> · Zayas House LLC<div class="machine"><a href="${markdown}">Markdown</a><a href="/llms.txt">llms.txt</a><a href="/openapi.json">OpenAPI</a><a href="/agent/privacy.md">Privacy</a></div></div></footer>
<script>
(() => {
  const API = ${JSON.stringify(`${API_ORIGIN}/api/v1/free-verdict`)};
  const SITE_ORIGIN = ${JSON.stringify(SITE_ORIGIN)};
  const INTENT = ${JSON.stringify(intent.slug)};
  const ACQUISITION_KEYS = ${JSON.stringify(ACQUISITION_KEYS)};
  const state = { idea: {}, answers: {} };
  const ideaForm = document.getElementById('idea-form');
  const assessment = document.getElementById('assessment');
  const assessmentForm = document.getElementById('assessment-form');
  const continueButton = document.getElementById('continue-button');
  const startButton = document.getElementById('start-button');
  const status = document.getElementById('status');
  const result = document.getElementById('result');

  function acquisition() {
    const input = new URLSearchParams(location.search);
    const output = new URLSearchParams();
    for (const key of ACQUISITION_KEYS) {
      const value = input.get(key);
      if (value) output.set(key, value.slice(0, 160));
    }
    return output;
  }
  function token(value, max = 24) { return (value || 'organic').slice(0, max).replace(/[^a-z0-9_-]/gi, '-'); }
  function clientName() {
    const params = acquisition();
    return ['web-intent', INTENT, token(params.get('source') || params.get('utm_source')), token(params.get('platform')), token(params.get('campaign') || params.get('utm_campaign')), token(params.get('creative_id'))].join(':').slice(0, 80);
  }
  function payload() { return { idea: state.idea, answers: state.answers, public_content_acknowledged: true, locale: navigator.language || 'en-US', agent: { client: clientName(), protocol: 'search' } }; }
  function setBusy(busy, message) { startButton.disabled = busy; continueButton.disabled = busy; status.textContent = message || ''; }
  function collectIdea() {
    const data = new FormData(ideaForm);
    state.idea = { ideaName:String(data.get('ideaName')||'').trim(), description:String(data.get('description')||'').trim(), targetUser:String(data.get('targetUser')||'').trim(), painfulProblem:String(data.get('painfulProblem')||'').trim(), currentAlternative:String(data.get('currentAlternative')||'').trim(), motivation:String(data.get('motivation')||'').trim() };
  }
  function renderQuestions(questions) {
    assessmentForm.replaceChildren();
    for (const q of questions) {
      const fieldset=document.createElement('fieldset'), legend=document.createElement('legend'); legend.textContent=q.prompt||q.field; fieldset.appendChild(legend);
      if(q.helper){const helper=document.createElement('p');helper.className='help';helper.textContent=q.helper;fieldset.appendChild(helper)}
      if(Array.isArray(q.options)&&q.options.length){for(const option of q.options){const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');label.className='option';input.type='radio';input.name='q_'+q.field;input.value=String(option.value);input.required=true;input.dataset.agentField=q.field;span.textContent=option.label;label.append(input,span);fieldset.appendChild(label)}}else{const input=document.createElement('textarea');input.required=true;input.maxLength=600;input.dataset.agentField=q.field;fieldset.appendChild(input)}
      assessmentForm.appendChild(fieldset);
    }
    assessment.classList.add('active'); result.classList.remove('active'); assessment.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function collectAssessment() {
    const grouped=new Map();
    for(const input of assessmentForm.querySelectorAll('[data-agent-field]')){const field=input.dataset.agentField;if(!field||(input.type==='radio'&&!input.checked))continue;const value=String(input.value||'').trim();if(value)grouped.set(field,value)}
    for(const fieldset of assessmentForm.querySelectorAll('fieldset')){const field=fieldset.querySelector('[data-agent-field]')?.dataset.agentField;if(field&&!grouped.has(field))throw new Error('Please answer every assessment question.')}
    const ideaFields=new Set(['ideaName','description','targetUser','painfulProblem','currentAlternative','motivation']);
    for(const [field,value] of grouped){if(ideaFields.has(field))state.idea[field]=value;else state.answers[field]=Number.isFinite(Number(value))?Number(value):value}
  }
  function renderComplete(data) {
    assessment.classList.remove('active'); result.classList.add('active');
    document.getElementById('verdict').textContent=String(data.verdict||'').replaceAll('_',' '); document.getElementById('summary').textContent=data.summary||''; document.getElementById('fastest-test').textContent=data.fastest_test||'';
    const risks=document.getElementById('risks');risks.replaceChildren();for(const item of data.primary_risks||[]){const li=document.createElement('li');li.textContent=item;risks.appendChild(li)}
    const actions=document.getElementById('actions');actions.replaceChildren();for(const item of data.next_actions||[]){const li=document.createElement('li');li.textContent=item;actions.appendChild(li)}
    const link=document.getElementById('result-link');
    try{const handoff=new URL(data.result_url);if(handoff.origin!==SITE_ORIGIN||!/^\/agent\/handoff\/[a-f0-9]{64}\/?$/i.test(handoff.pathname))throw new Error('Unexpected handoff URL');for(const [key,value] of acquisition())handoff.searchParams.set(key,value);handoff.searchParams.set('intent',INTENT);link.href=handoff.toString()}catch{link.removeAttribute('href');link.textContent='Handoff unavailable'}
    status.textContent='Verdict complete.'; result.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function requestVerdict() {
    setBusy(true,'Running GhostTown…');
    try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Agent-Client':clientName()},body:JSON.stringify(payload())});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'GhostTown is unavailable right now.');if(data.status==='needs_input'){renderQuestions(data.questions||[]);setBusy(false,'A few answers are still needed. GhostTown will not guess them.');return}if(data.status==='complete'){renderComplete(data);setBusy(false,'Verdict complete.');return}throw new Error('Unexpected GhostTown response.')}catch(error){setBusy(false,error instanceof Error?error.message:'GhostTown is unavailable right now.')}
  }
  ideaForm.addEventListener('submit',event=>{event.preventDefault();if(!ideaForm.reportValidity())return;collectIdea();void requestVerdict()});
  continueButton.addEventListener('click',()=>{try{collectAssessment();void requestVerdict()}catch(error){status.textContent=error instanceof Error?error.message:'Please answer every question.'}});
})();
</script>
</body>
</html>`;
}

async function writeFile(relativePath, content) {
  const target = path.join(DIST, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
}

async function appendDiscoveryToSitemap(intents) {
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  let sitemap = await fs.readFile(sitemapPath, 'utf8');
  const additions = intents.map(intent => `  <url><loc>${SITE_ORIGIN}/${intent.slug}</loc></url>`).join('\n');
  if (!sitemap.includes(`${SITE_ORIGIN}/${intents[0].slug}`)) sitemap = sitemap.replace('</urlset>', `${additions}\n</urlset>`);
  await fs.writeFile(sitemapPath, sitemap, 'utf8');
}

async function appendDiscoveryToLlms(intents) {
  const section = `\n## Functional discovery utilities\n\n${intents.map(intent => `- ${intent.intent}: ${SITE_ORIGIN}/${intent.slug} (Markdown: ${SITE_ORIGIN}/${intent.slug}.md)`).join('\n')}\n`;
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const target = path.join(DIST, file);
    let current = await fs.readFile(target, 'utf8');
    if (!current.includes('## Functional discovery utilities')) current += section;
    await fs.writeFile(target, current, 'utf8');
  }
}

const intents = JSON.parse(await fs.readFile(INTENTS_PATH, 'utf8'));
if (!Array.isArray(intents) || intents.length !== 10) throw new Error('GhostTown functional discovery catalog must contain exactly 10 intents.');
if (new Set(intents.map(intent => intent.slug)).size !== intents.length) throw new Error('GhostTown functional discovery slugs must be unique.');

for (const intent of intents) {
  await writeFile(path.join(intent.slug, 'index.html'), renderPage(intent));
  await writeFile(`${intent.slug}.md`, renderMarkdown(intent));
}
await appendDiscoveryToSitemap(intents);
await appendDiscoveryToLlms(intents);
await writeFile('discovery-manifest.json', JSON.stringify({
  schemaVersion: 'ghosttown-functional-discovery-v1',
  generatedAt: new Date().toISOString(),
  product: 'GhostTown',
  defaultAction: 'Run the free canonical GhostTown verdict',
  acquisitionParameters: ['source','campaign','platform','creative_id','publication_id','experiment_id','distribution_account_id','share_type'],
  channelTemplates: {
    storyStudio: '?source=story-studio&campaign=functional-discovery-01&platform={platform}&creative_id={creative_id}',
    partner: '?source=partner&campaign={partner_id}&platform=partner&publication_id={placement_id}',
    directory: '?source=directory&campaign={directory_id}&platform={directory_id}',
    newsletter: '?source=newsletter&campaign={newsletter_id}&publication_id={issue_id}',
    community: '?source=community&campaign={community_id}&publication_id={post_id}',
    social: '?source=social&campaign={campaign_id}&platform={platform}&creative_id={creative_id}'
  },
  intents: intents.map(intent => ({ slug:intent.slug, intent:intent.intent, url:`${SITE_ORIGIN}/${intent.slug}`, markdown:`${SITE_ORIGIN}/${intent.slug}.md` }))
}, null, 2));

console.log(`Generated ${intents.length} GhostTown functional discovery utilities.`);
