# GhostTown Customer Journey Law v1.0

**Status:** Governing customer-facing product contract  
**Scope:** Every GhostTown screen, message, CTA, error, email, reminder, generated page, paid workflow, and AI-assisted interaction  
**Priority:** This law governs customer-facing language and flow. It does not weaken truth, privacy, security, payment, provenance, accessibility, or legal requirements.

## 1. The law

> **The customer should never have to translate GhostTown.**
>
> GhostTown may be complex underneath. It must feel simple on top.

The customer-facing product is written for a smart non-technical person who has an idea and wants to know whether it is worth pursuing. They may be a teacher, designer, office worker, retiree, creator, small-business owner, liberal-arts graduate, student, side-project builder, or someone using modern AI/no-code tools for the first time.

Do not assume startup, software, marketing, data, AI, finance, or engineering vocabulary.

The baseline customer thought is:

> **I have an idea. Let's test it.**

The baseline paid-product thought is:

> **I want help turning this idea into something real.**

## 2. Reading standard

Write for fast understanding, not sophistication.

Target roughly fifth-to-eighth-grade clarity for core sales, navigation, instructions, reminders, and error messages. Longer explanations may use normal adult language, but they must remain plain and concrete.

Prefer:

- short words;
- short sentences;
- one idea per paragraph;
- common verbs;
- concrete outcomes;
- "you" and "your";
- clear next actions;
- examples when a field may be unclear;
- progressive disclosure for advanced detail.

Avoid:

- internal product vocabulary;
- startup jargon;
- engineering jargon;
- academic language;
- unexplained acronyms;
- abstract nouns stacked together;
- long feature lists before the outcome is clear;
- clever phrasing that makes the customer stop and decode meaning.

Plain does not mean childish or patronizing. It means low mental effort.

## 3. Outcome before mechanism

The customer should first understand:

1. What can GhostTown help me do?
2. What do I do now?
3. What will I get?
4. What happens after that?

Only then explain how GhostTown works.

Bad:

> Grounded research and adaptive execution intelligence update your evidence-driven plan.

Better:

> Tell GhostTown what happened. We help you decide what to do next.

Do not sell the LLM. Sell what the LLM does for the customer.

## 4. Heavy lifting belongs to GhostTown

A customer pays GhostTown because they do not want to become a startup researcher, marketer, analyst, or prompt engineer first.

Before purchase, ask only for information GhostTown cannot reasonably know or infer.

After purchase, GhostTown should do as much useful work as it safely can:

- research the market;
- find useful examples;
- prepare the first messages and pages;
- build the starting plan;
- prefill reasonable choices;
- show the next action;
- remind the customer what comes next;
- keep their work together;
- help them understand what happened;
- help them change the plan when new information arrives.

Do not turn paid customers into unpaid research assistants.

## 5. The customer journey is a product contract

### Stage 1 — Arrival

Customer question:

> Is my idea worth trying?

GhostTown answer:

> Test your idea before you spend months building it.

Primary action:

> **Test My Idea Free**

### Stage 2 — Idea intake

Customer question:

> What do you need from me?

Rule:

Ask one understandable question at a time. Explain why only when needed. Give a simple example when the answer format may be unclear.

### Stage 3 — Free verdict

Customer question:

> So, what do you think?

Rule:

Lead with the answer. Then explain what looks good, what could go wrong, and the cheapest useful next test.

Never make the customer learn terms such as falsification, prediction target, deterministic scoring, RAG, provenance, or model routing to understand their verdict.

### Stage 4 — Paid offer

Customer question:

> If I want to move forward, what will you do for me?

Core promise:

> **You tested your idea. Now let's help you make it real.**
>
> GhostTown builds your 30-day plan and helps you work through it one day at a time.

The PDF is the full map. The Interactive Blueprint is the product the customer works from each day.

Primary action:

> **Build My 30-Day Interactive Blueprint — $97**

### Stage 5 — Checkout

Customer question:

> What do I have to do before I pay?

Rule:

Keep work to the minimum. Prefill what GhostTown already knows. Optional questions remain optional. Do not require competitor, podcast, community, channel, or market research before checkout.

### Stage 6 — After payment

Customer question:

> What happens now?

Rule:

Immediately acknowledge payment, show what GhostTown is doing, and give one clear next action. Never leave a paying customer wondering whether anything is happening.

### Stage 7 — Research and examples

Customer question:

> Where do I start?

Rule:

GhostTown starts the customer with up to three useful examples or resources when available. Prefer the same market, a similar market, or something directly useful to building the plan. The customer may replace them, but should not start from three empty boxes.

### Stage 8 — Blueprint ready

Customer question:

> What do I do first?

Rule:

Do not lead with a download button. Lead with the next action.

The PDF remains available as the full map and durable copy.

### Stage 9 — Daily use

Customer question:

> What should I do today?

Rule:

Show today's goal, what to do, the prepared material, what result to look for, and what to record. Hide advanced detail until requested.

### Stage 10 — Reminders

Customer question:

> What am I supposed to do next?

Rule:

Reminders must point to a real next action, follow-up, or check-in. They should reduce forgetting, not create noise.

### Stage 11 — AI help

Customer question:

> Something happened. What should I do now?

Rule:

AI should help the customer understand the new information, improve a message or plan, research an open question, or choose the next useful move.

Do not expose model names, routing, RAG, grounding, token usage, provider mechanics, or internal authority boundaries unless the customer explicitly asks.

### Stage 12 — Change the plan

Customer question:

> This is not going the way I expected. Now what?

Rule:

Say what changed in plain language. Show what to keep, what to change, and the next move.

### Stage 13 — Finish

Customer question:

> What did I learn, and what should I do next?

Rule:

Summarize the strongest signals, what remains unknown, what worked, what did not, and one clear recommendation: continue, change direction, pause, or stop.

## 6. Customer-language translation table

| Internal / harder language | Customer language |
|---|---|
| validation | test your idea |
| falsification | what would prove this wrong |
| evidence capture | tell us what happened |
| evidence-driven next move | what to do next based on what happened |
| customer-access research | find where likely customers are |
| positioning strategy | what to say and who to say it to |
| execution system | your 30-day plan / what to do today |
| execution asset | message, page, script, checklist, or file |
| adaptive execution intelligence | change the plan as you learn |
| grounded research | current research |
| RAG | never expose by default |
| deterministic | never expose by default |
| workflow | never expose by default |
| provider/model routing | never expose by default |
| D1 / KV / R2 / Worker / Vertex | never expose by default |
| commitment threshold | what counts as a good result |
| branch rule | if this happens, do this next |
| checkpoint | weekly check-in, unless the product name itself is useful |

Product names such as **Interactive Blueprint** and **Execution Copilot** are allowed only when the surrounding copy immediately makes their purpose obvious.

## 7. One-screen rule

Every customer-facing screen must have one dominant job.

A first-time customer should be able to answer within a few seconds:

- Where am I?
- What is happening?
- What should I do next?

If a screen cannot answer all three, simplify it.

## 8. Error-message law

Every customer-facing error should answer, when relevant:

1. What happened?
2. Did I lose anything?
3. Was I charged?
4. What should I do now?

Bad:

> Workflow execution failed.

Better:

> We could not finish your Blueprint. Your payment and saved work are still on your account. Try again, or contact us if it does not restart.

Never expose stack traces, provider errors, internal IDs, or infrastructure terminology as the main customer message.

## 9. AI interaction law

GhostTown AI is not there to sound smart. It is there to reduce uncertainty and work.

Every AI response to a customer should prefer this order:

1. direct answer;
2. why it matters;
3. what to do next;
4. optional detail.

Do not make the customer read an essay to find the answer.

Do not use fake companionship. The value is continuity and useful help, not pretending the software is a person.

## 10. Persuasion law

Persuasion should make value easier to see, not make truth harder to see.

Allowed:

- clear outcomes;
- contrast between doing it alone and getting help;
- showing work the customer avoids;
- showing finished outputs;
- simple risk reduction;
- strong calls to action;
- specific examples;
- real proof.

Forbidden:

- fake urgency;
- fake scarcity;
- invented testimonials;
- invented results;
- hidden terms;
- confusing a feature with a guaranteed outcome;
- using complexity to make the product sound more valuable.

## 11. Customer journey outranks internal elegance

When choosing between:

- a cleaner architecture and a simpler customer experience;
- an internal term and a customer term;
- another framework and less customer work;
- another report and a clearer next action;

prefer the customer outcome unless security, correctness, law, or data integrity requires otherwise.

## 12. Release acceptance

A customer-facing change does not pass because TypeScript, Vitest, CI, or screenshots pass.

It must also pass these journey checks:

- **10-second test:** Can a new visitor say what GhostTown does?
- **next-step test:** Is the next action obvious?
- **no-translation test:** Does any phrase require startup/software/AI knowledge?
- **heavy-lifting test:** Are we asking the customer to do work GhostTown should do?
- **continuity test:** After payment, is it obvious that GhostTown is still working with them?
- **error test:** If something breaks, does the customer know what happened and what to do?
- **mobile test:** Does the same simple story survive on a phone?
- **truth test:** Is every promise supported by the product actually shipped?

## 13. Journey metrics

The customer journey is measured as seriously as build health.

Minimum funnel:

```text
visitor
→ test started
→ test completed
→ verdict understood
→ paid offer viewed
→ checkout started
→ purchase
→ Blueprint opened
→ first day opened
→ first action completed
→ first result recorded
→ day 7 reached
→ day 30 decision
```

Track where people stop. A technically perfect step that customers abandon is not a successful step.

## 14. Development rule

Every new customer-facing feature or copy change must state:

- which journey stage it changes;
- what customer question it answers;
- what work it removes;
- what the next action is;
- how success will be observed.

No customer-facing feature is complete until those answers are clear.

## 15. Governing sentence

> **You have an idea. Let's test it. If you decide to move forward, GhostTown helps you take the next step without making you learn our language first.**
