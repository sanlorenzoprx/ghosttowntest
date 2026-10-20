import { LEGAL_POLICY } from './businessPolicy';
import { GHOSTTOWN_FIRST_30_V1 } from './ghosttownOffer';

// Email to the First 30 list when First 30 opens. Every list email is
// commercial email under CAN-SPAM, so the footer always carries an
// unsubscribe link and the postal address, and the message carries the
// one-click unsubscribe headers (RFC 8058) that Gmail and Yahoo require of
// bulk senders.

export interface First30EmailInput {
  locale: 'en' | 'es';
  unsubscribeUrl: string;
  first30Url: string;
}

export interface RenderedEmail {
  subject: string;
  preheader: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}

const escape = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const COPY = {
  en: {
    subject: 'First 30 is open',
    preheader: `You asked to hear when First 30 opens. It's open now.`,
    greeting: 'Hi,',
    opening: 'You asked us to tell you when First 30 opens. It is open now.',
    price: `First 30 is ${GHOSTTOWN_FIRST_30_V1.displayPrice}, paid once. For ${GHOSTTOWN_FIRST_30_V1.durationDays} days, GhostTown helps you test your idea with real customers. You get:`,
    includes: [...GHOSTTOWN_FIRST_30_V1.includes],
    refund: 'You can get a full refund until your website build starts.',
    button: 'Start First 30',
    questions: `Questions? Write to ${LEGAL_POLICY.supportEmail}.`,
    signoff: 'GhostTown',
    why: `You are getting this email because you joined the First 30 list on ${LEGAL_POLICY.website}.`,
    unsubscribe: 'Unsubscribe',
    unsubscribeText: 'Unsubscribe with one click:'
  },
  es: {
    subject: 'First 30 ya abrió',
    preheader: 'Pediste saber cuándo abre First 30. Ya está abierto.',
    greeting: 'Hola:',
    opening: 'Nos pediste avisarte cuando First 30 abriera. Ya está abierto.',
    price: `First 30 cuesta ${GHOSTTOWN_FIRST_30_V1.displayPrice}, un solo pago. Durante ${GHOSTTOWN_FIRST_30_V1.durationDays} días, GhostTown te ayuda a probar tu idea con clientes reales. Recibes:`,
    includes: [...GHOSTTOWN_FIRST_30_V1.includesEs],
    refund: 'Puedes pedir el reembolso completo hasta que empiece la construcción de tu sitio web.',
    button: 'Empezar First 30',
    questions: `¿Preguntas? Escribe a ${LEGAL_POLICY.supportEmail}.`,
    signoff: 'GhostTown',
    why: `Recibes este email porque te uniste a la lista de First 30 en ${LEGAL_POLICY.website}.`,
    unsubscribe: 'Cancelar suscripción',
    unsubscribeText: 'Cancela tu suscripción con un clic:'
  }
} as const;

export function postalAddressLine(): string {
  return `${LEGAL_POLICY.operator} · ${LEGAL_POLICY.mailingAddress.join(', ')}`;
}

export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${LEGAL_POLICY.supportEmail}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}

export function renderFirst30OpensEmail(input: First30EmailInput): RenderedEmail {
  const copy = COPY[input.locale];
  const address = postalAddressLine();

  const text = [
    copy.greeting,
    '',
    copy.opening,
    '',
    copy.price,
    ...copy.includes.map(item => `- ${item}`),
    '',
    copy.refund,
    '',
    `${copy.button}: ${input.first30Url}`,
    '',
    copy.questions,
    copy.signoff,
    '',
    '---',
    copy.why,
    `${copy.unsubscribeText} ${input.unsubscribeUrl}`,
    address
  ].join('\n');

  const html = `<!doctype html>
<html lang="${input.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(copy.subject)}</title></head>
<body style="margin:0;background:#f6f3ed;font-family:Arial,Helvetica,sans-serif;color:#17201c;">
<span style="display:none;max-height:0;overflow:hidden;">${escape(copy.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ed;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:32px 28px 8px;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px;">${escape(copy.greeting)}</p>
<p style="margin:0 0 16px;">${escape(copy.opening)}</p>
<p style="margin:0 0 8px;">${escape(copy.price)}</p>
<ul style="margin:0 0 16px;padding-left:20px;">${copy.includes.map(item => `<li style="margin:0 0 6px;">${escape(item)}</li>`).join('')}</ul>
<p style="margin:0 0 24px;">${escape(copy.refund)}</p>
<p style="margin:0 0 24px;"><a href="${escape(input.first30Url)}" style="display:inline-block;background:#b5451b;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:6px;">${escape(copy.button)}</a></p>
<p style="margin:0 0 4px;">${escape(copy.questions)}</p>
<p style="margin:0 0 24px;">${escape(copy.signoff)}</p>
</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #e5e0d8;font-size:12px;line-height:1.6;color:#5b625e;">
<p style="margin:0 0 8px;">${escape(copy.why)}</p>
<p style="margin:0 0 8px;"><a href="${escape(input.unsubscribeUrl)}" style="display:inline-block;border:1px solid #5b625e;color:#17201c;text-decoration:none;padding:6px 12px;border-radius:4px;">${escape(copy.unsubscribe)}</a></p>
<p style="margin:0;">${escape(address)}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    text,
    html,
    headers: unsubscribeHeaders(input.unsubscribeUrl)
  };
}
