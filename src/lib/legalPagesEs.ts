import { ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE } from './assessmentPack';
import { LEGAL_POLICY } from './businessPolicy';
import { LEGAL_FIGURES, list, p, table, usd, type LegalPageContent, type LegalPageKind } from './legalShared';

// Spanish versions of the policy pages. Section ids match legalPages.ts so links
// and anchors work in both languages; amounts come from the same figures.

const { first30, year, yearPrepayAfterCredit, yearFirstPaymentAfterCredit, yearPlanAfterCredit, yearHalfPrepay, yearHalfPlan, yearPlanTopUp } = LEGAL_FIGURES;
const support = `[${LEGAL_POLICY.supportEmail}](mailto:${LEGAL_POLICY.supportEmail})`;
const jurisdiction = LEGAL_POLICY.jurisdictionEs.replace(', EE. UU.', '');
const operator = `${LEGAL_POLICY.operator}, una compañía organizada en el ${jurisdiction}`;

const terms: LegalPageContent = {
  eyebrow: 'Términos de servicio',
  title: 'Términos de servicio',
  summary: `Estos términos son el acuerdo entre tú y ${operator}, que opera GhostTown ("GhostTown", "nosotros"). Cubren ${LEGAL_POLICY.website} (antes ${LEGAL_POLICY.formerWebsite}) y todo lo que ofrecemos allí. Al usar GhostTown o comprarnos algo, los aceptas. Si no los aceptas, por favor no uses GhostTown.`,
  sections: [
    {
      id: 'what-we-offer',
      title: 'Lo que ofrece GhostTown',
      blocks: [
        p('**Veredicto gratis.** Cuéntanos una idea de negocio y contesta unas preguntas cortas. GhostTown busca señales públicas sobre tu mercado y te da un veredicto: lo que se ve prometedor, la mayor incógnita y la prueba más rápida para hacer después. Es gratis y no pide tarjeta.'),
        p(`**Veredictos adicionales.** Después de tu veredicto gratis puedes comprar ${ASSESSMENT_PACK_CREDITS} veredictos más por ${ASSESSMENT_PACK_DISPLAY_PRICE} USD, en un solo pago.`),
        p(`**${first30.name}: ${first30.displayPrice} USD, un solo pago.** ${first30.name} todavía no está a la venta. Cuando abra, serán ${first30.durationDays} días de ayuda guiada, paso a paso, para probar tu idea con clientes reales. Incluye:`),
        list(...first30.includesEs),
        p('No incluye un dominio propio (como tunegocio.com). Puedes comprar uno cuando estés listo y conectarlo a tu sitio web.'),
        p(`**${year.name}.** El día ${year.offeredOnDay} de ${first30.name} te ofrecemos un año con GhostTown. El precio de lista del año es ${usd(year.listPriceUsd)} USD. Puedes pagar ${usd(year.prepayUsd)} de una vez, o hacer ${year.installments.count} pagos mensuales de ${usd(year.installments.eachUsd)}. Los ${usd(year.first30CreditUsd)} que pagaste por ${first30.name} se acreditan a cualquiera de las dos opciones, así que pagas ${usd(yearPrepayAfterCredit)} más de una vez, o ${usd(yearFirstPaymentAfterCredit)}, ${usd(year.installments.eachUsd)} y ${usd(year.installments.eachUsd)} en el plan de pagos. La oferta termina cuando termina tu mes de ${first30.name}. El año incluye:`),
        list(...year.includesEs),
        p('Los precios están en dólares estadounidenses. Si aplica el impuesto sobre ventas, se añade al pagar.')
      ]
    },
    {
      id: 'what-we-are-not',
      title: 'Lo que GhostTown es, y lo que no es',
      blocks: [
        p('GhostTown es un programa que usa inteligencia artificial (IA) para ayudarte a decidir qué probar y a hacer el trabajo de probarlo. Es guía y herramientas, no una oportunidad de negocio, una franquicia ni una promesa de ingresos.'),
        p('No prometemos clientes, ventas, ingresos, financiamiento ni que tu negocio tenga éxito. Los ejemplos de este sitio muestran cómo funciona GhostTown. No son resultados típicos ni predicciones de los tuyos. Lee el [aviso legal](/disclaimer) para más detalles.')
      ]
    },
    {
      id: 'account',
      title: 'Tu cuenta',
      blocks: [
        list(
          'Debes tener al menos 18 años y capacidad para firmar un contrato.',
          'Da información correcta y mantenla al día.',
          'Mantén tu acceso en privado. Eres responsable de lo que pase en tu cuenta.',
          'Una cuenta es para una persona. No la compartas ni revendas el acceso.'
        )
      ]
    },
    {
      id: 'payments',
      title: 'Cómo pagas',
      blocks: [
        p('Stripe procesa todos los pagos en su página de pago segura. GhostTown nunca ve ni guarda el número completo de tu tarjeta.'),
        p(`Se te cobra al comprar. En el plan de pagos de ${year.name}, los pagos restantes se cobran a la misma tarjeta uno y dos meses después del primero. Si un pago falla, te enviaremos un email. Podemos pausar el año hasta que el pago se complete.`),
        p(`${year.name} es un compromiso de 12 meses. No hay plan mensual.`),
        p('**Si un balance queda sin pagar.** Si nos debes dinero y sigue sin pagarse después de que te escribamos por email, podemos enviar el balance a una agencia de cobro y reportarlo a agencias de crédito de consumidores o de negocios. Las cuentas en cobro y los reportes de crédito negativos pueden bajar tu puntuación de crédito y hacer más difícil o más caro obtener préstamos, tarjetas de crédito, arrendamientos y seguros. Te escribiremos por email antes de dar cualquiera de esos pasos.')
      ]
    },
    {
      id: 'refunds',
      title: 'Reembolsos',
      blocks: [
        p(`${first30.name}: reembolso completo hasta que empiece la construcción de tu sitio web; ninguno después de que empiece. ${year.name}: reembolso completo dentro de ${year.refund.fullRefundDays} días de tu primer pago del año; hasta el día ${year.refund.halfRefundThroughDay} pagas la mitad del precio de tu plan; después, no hay reembolso y los pagos restantes siguen vigentes. La [política de reembolsos](/refunds) tiene los detalles y cómo pedirlo.`)
      ]
    },
    {
      id: 'website-and-domain',
      title: 'Tu sitio web y tu dominio',
      blocks: [
        p(`${first30.name} publica tu sitio web en una cuenta de Cloudflare que es tuya. Puedes crear una gratis durante la configuración. Como la cuenta es tuya, tu sitio web se queda contigo cuando termina ${first30.name}.`),
        p('GhostTown nunca compra un dominio por ti. Si quieres uno, lo compras en tu propia cuenta, le pagas directamente al registrador y es tuyo. Te ayudamos a conectarlo.'),
        p('Puedes quitarle a GhostTown el acceso a tu cuenta de Cloudflare en cualquier momento.'),
        p('Si tu sitio web recoge datos de tus propios clientes, como nombres y emails de un formulario de contacto, tú decides cómo usarlos y eres responsable de decirles a tus visitantes cómo los manejas. GhostTown guarda esos datos para ti y no los usa para nada más.')
      ]
    },
    {
      id: 'ownership',
      title: 'De quién es cada cosa',
      blocks: [
        list(
          '**Lo que nos das es tuyo.** Tus ideas, respuestas, notas, nombre de negocio, logos y fotos siguen siendo tuyos. Nos permites usarlos solo para darte el servicio de GhostTown, excepto el contenido público del veredicto que se explica abajo.',
          '**Lo que hacemos para ti es tuyo para usar.** Los textos del sitio web, los mensajes de contacto, los planes y los demás materiales que GhostTown crea para ti son tuyos para usar en tu negocio, durante y después de tu programa, sin costo adicional.',
          '**GhostTown es nuestro.** Nuestro programa, diseño, plantillas y métodos siguen siendo nuestros. Si nuestras plantillas o código forman parte de tu sitio web, puedes seguir usándolos como parte de ese sitio.'
        )
      ]
    },
    {
      id: 'public-content',
      title: 'Contenido público del veredicto',
      blocks: [
        p('Antes de que corra un veredicto, confirmas que la idea que envías, tu informe de GhostTown y el video corto que se hace con ellos son contenido público. Nuestro servicio Shorts Factory puede publicarlos y volver a usarlos. Quitamos los emails y teléfonos de la copia pública, pero no incluyas datos privados, confidenciales o que te identifiquen en lo que envías.')
      ]
    },
    {
      id: 'ai',
      title: 'Trabajo hecho con IA',
      blocks: [
        p('GhostTown usa IA para escribir veredictos, planes, textos de sitios web y otros materiales. La IA puede equivocarse, estar desactualizada o parecerse a lo que escribe para otros. Revisa todo lo importante antes de confiar en ello o publicarlo.'),
        p('Eres responsable de lo que publicas y envías, incluidas las afirmaciones de tu sitio web, y de cumplir las leyes y reglas de licencias que apliquen a tu negocio.')
      ]
    },
    {
      id: 'acceptable-use',
      title: 'Uso justo de GhostTown',
      blocks: [
        p('Por favor no:'),
        list(
          'violes la ley ni uses GhostTown para engañar o hacer daño a otros;',
          'subas contenido que no tienes derecho a usar;',
          'intentes entrar en la cuenta o los datos de otra persona;',
          'saltes los límites de uso, envíes solicitudes automáticas ni copies a gran escala el contenido o los resultados de GhostTown;',
          'revendas o compartas el acceso a GhostTown.'
        ),
        p('Limitamos cuántos veredictos gratis pueden correr por hora desde una misma conexión y una misma cuenta, para que el veredicto gratis siga disponible para todos.')
      ]
    },
    {
      id: 'ending',
      title: 'Si dejas de usar GhostTown',
      blocks: [
        p(`Puedes dejar de usar GhostTown en cualquier momento. Para cerrar tu cuenta y borrar tus datos, escribe a ${support}.`),
        p('Podemos suspender o cerrar una cuenta que viole estos términos o ponga en riesgo a otros clientes.')
      ]
    },
    {
      id: 'warranty',
      title: 'Exclusión de garantías',
      blocks: [
        p('GhostTown se ofrece "tal cual" y "según disponibilidad". Hasta donde la ley lo permita, no hacemos más promesas que las escritas en estos términos, incluida la de que GhostTown siempre esté disponible, no tenga errores o sea adecuado para tu propósito.')
      ]
    },
    {
      id: 'liability',
      title: 'Límites de nuestra responsabilidad',
      blocks: [
        p('Hasta donde la ley lo permita, no somos responsables por ganancias perdidas, ingresos perdidos, datos perdidos ni pérdidas indirectas o consecuentes. Nuestra responsabilidad total por cualquier reclamo se limita a lo que le pagaste a GhostTown en los 12 meses antes del reclamo. Algunos lugares no permiten estos límites, así que puede que no te apliquen, y nada aquí limita derechos que la ley dice que no se pueden limitar.')
      ]
    },
    {
      id: 'disputes',
      title: 'Si no estamos de acuerdo',
      blocks: [
        p(`Por favor escribe primero a ${support}. La mayoría de los problemas se resuelven rápido, y trataremos de resolver el tuyo en 30 días.`),
        p(`Estos términos se rigen por las leyes del ${jurisdiction} y las leyes federales de Estados Unidos que apliquen. Cualquier caso judicial va a los tribunales ubicados en Puerto Rico, a menos que la ley del consumidor donde vives te dé el derecho de presentarlo allí.`)
      ]
    },
    {
      id: 'changes',
      title: 'Cambios a estos términos',
      blocks: [
        p('Cuando cambiamos estos términos, actualizamos la fecha de arriba. Si el cambio es importante, avisamos por email a quienes tienen cuenta antes de que entre en vigor. Cada compra sigue los términos vigentes cuando la hiciste.')
      ]
    },
    {
      id: 'contact',
      title: 'Contacto',
      blocks: [p(`Preguntas sobre estos términos: ${support}.`)]
    }
  ]
};

const refund: LegalPageContent = {
  eyebrow: 'Reembolsos y cancelación',
  title: 'Reembolsos y cancelación',
  summary: 'Esto es lo que puedes recuperar, y hasta cuándo. El calendario de reembolsos es nuestra promesa. No prometemos resultados de negocio.',
  sections: [
    {
      id: 'at-a-glance',
      title: 'Resumen',
      blocks: [
        table(['Lo que compraste', 'Cuándo puedes pedirlo', 'Lo que recibes'], [
          ['Veredicto gratis', '—', 'No hay nada que reembolsar'],
          [`${ASSESSMENT_PACK_CREDITS} veredictos adicionales (${ASSESSMENT_PACK_DISPLAY_PRICE})`, 'En cualquier momento, si algo salió mal', 'Los créditos que falten, o el reembolso de un cobro duplicado'],
          [`${first30.name} (${first30.displayPrice})`, 'Hasta que empiece la construcción de tu sitio web', 'Un reembolso completo'],
          [year.name, `Días 1–${year.refund.fullRefundDays} después de tu primer pago del año`, 'Reembolso completo de tus pagos del año; se cancelan los pagos restantes'],
          [year.name, `Días ${year.refund.fullRefundDays + 1}–${year.refund.halfRefundThroughDay}`, 'Pagas la mitad del precio de tu plan; reembolsamos o cobramos la diferencia'],
          [year.name, `Después del día ${year.refund.halfRefundThroughDay}`, 'No hay reembolso; los pagos restantes siguen vigentes']
        ])
      ]
    },
    {
      id: 'first-30',
      title: first30.name,
      blocks: [
        p(`Pide un reembolso por cualquier razón antes de que empiece la construcción de tu sitio web y recibes de vuelta los ${first30.displayPrice} completos.`),
        p(`La construcción de tu sitio web empieza cuando confirmas el paso del sitio web en ${first30.name}. GhostTown te pide confirmar primero y te avisa que confirmar cierra tu periodo de reembolso. Después de que empieza la construcción, ${first30.name} no se puede reembolsar, porque construir tu sitio web es el costo principal de entregarlo.`)
      ]
    },
    {
      id: 'year',
      title: year.name,
      blocks: [
        p(`Igual que la matrícula de una escuela, lo que debes al irte depende de cuándo te vas y del precio del plan que escogiste, después de tu crédito de ${usd(year.first30CreditUsd)} de ${first30.name}: ${usd(yearPrepayAfterCredit)} si pagaste de una vez, o ${usd(yearPlanAfterCredit)} en el plan de pagos. Los días se cuentan desde tu primer pago del año.`),
        list(
          `**Días 1–${year.refund.fullRefundDays}:** no debes nada por el año. Reembolsamos todos los pagos del año que hiciste y cancelamos los demás.`,
          `**Días ${year.refund.fullRefundDays + 1}–${year.refund.halfRefundThroughDay}:** debes la mitad del precio de tu plan. Si pagaste de una vez, nos quedamos con ${usd(yearHalfPrepay)} y te reembolsamos ${usd(yearPrepayAfterCredit - yearHalfPrepay)}. En el plan de pagos debes ${usd(yearHalfPlan)}: ya pagaste ${usd(yearFirstPaymentAfterCredit)}, así que cobramos ${usd(yearPlanTopUp)} más y cancelamos los pagos restantes.`,
          `**Después del día ${year.refund.halfRefundThroughDay}:** debes el precio completo. No hay reembolso y, en el plan de pagos, los pagos restantes siguen vigentes.`
        ),
        p(`El crédito de ${usd(year.first30CreditUsd)} de ${first30.name} es parte de tu compra de ${first30.name}. No se paga en efectivo.`)
      ]
    },
    {
      id: 'how-to-ask',
      title: 'Cómo pedir un reembolso',
      blocks: [
        p(`Escribe a ${support} desde el email de tu cuenta. Dinos qué compraste. Dentro de un periodo de reembolso no tienes que dar una razón.`),
        p('Te confirmamos por email. El reembolso vuelve a la tarjeta con la que pagaste, a través de Stripe. Los bancos suelen tardar de 5 a 10 días laborables en mostrarlo.')
      ]
    },
    {
      id: 'charge-problems',
      title: 'Si algo salió mal con un cobro',
      blocks: [
        p('Si te cobramos dos veces, te cobramos por algo que no recibiste o te cobramos la cantidad equivocada, lo arreglamos o lo reembolsamos, digan lo que digan los periodos de arriba.'),
        p('Por favor contáctanos antes de disputar un cobro con tu banco. Normalmente es más rápido para ti.')
      ]
    }
  ]
};

const privacy: LegalPageContent = {
  eyebrow: 'Política de privacidad',
  title: 'Política de privacidad',
  summary: `Esta política explica qué recoge ${LEGAL_POLICY.operator} ("GhostTown", "nosotros") cuando usas ${LEGAL_POLICY.website} (antes ${LEGAL_POLICY.formerWebsite}), para qué, quién nos ayuda a procesarlo, cuánto tiempo lo guardamos y qué opciones tienes. No vendemos tu información personal ni la compartimos para publicidad.`,
  sections: [
    {
      id: 'what-we-collect',
      title: 'Qué recogemos y para qué',
      blocks: [
        p('Recogemos solo lo que necesitamos para darte el servicio de GhostTown.'),
        list(
          '**Cuenta.** Tu email y tu contraseña, para darte acceso y guardar tu trabajo. Las contraseñas se guardan solo como un código cifrado de una sola vía (hash).',
          '**Tu idea y tus respuestas.** Lo que escribes en las preguntas del veredicto, para hacer tu veredicto. Una parte se vuelve contenido público (ver abajo).',
          '**Tu trabajo en el programa.** Notas, la evidencia que registras, el nombre de tu negocio y el contenido de tu sitio web, para guiarte día a día y construir tu sitio.',
          '**Conexión del sitio web.** Cuando conectas tu cuenta de Cloudflare, guardamos el acceso que Cloudflare nos da para publicar tu sitio. Nunca vemos tu contraseña de Cloudflare.',
          '**Mensajes de tus clientes.** Si tu sitio web tiene un formulario de contacto, guardamos lo que envían tus visitantes para que puedas verlo y contestarlo. No lo usamos para nada más.',
          '**Pagos.** Stripe toma los datos de tu tarjeta en su propia página de pago. Nosotros guardamos el registro de la orden: qué compraste, la cantidad, la fecha y su estado.',
          '**Lista de email de First 30.** Tu email, el idioma que usaste, dónde te inscribiste y el consentimiento que diste, para avisarte sobre First 30.',
          '**Emails de soporte.** Lo que nos envías, para ayudarte.',
          '**Datos técnicos.** Tu dirección IP, usada por poco tiempo y guardada en forma cifrada (hash) para aplicar límites de uso justo, más datos del navegador y de errores en los registros del servidor, para que GhostTown funcione y esté seguro.',
          '**Eventos del producto.** Pasos como "veredicto iniciado" o "pago iniciado", y el enlace o campaña que te trajo (por ejemplo, etiquetas UTM o un código de referido), para saber si GhostTown funciona y de dónde vienen los visitantes.',
          '**Almacenamiento del navegador.** El almacenamiento local de tu navegador mantiene tu sesión abierta y guarda borradores y tu idioma. No usamos cookies de publicidad ni rastreadores de terceros.'
        )
      ]
    },
    {
      id: 'providers',
      title: 'Quién nos ayuda a procesarlo',
      blocks: [
        p('Estos proveedores de servicios procesan información por nosotros, solo para dar el servicio de GhostTown:'),
        table(['Proveedor', 'Qué hacen'], [
          ['Cloudflare', 'Opera nuestro sitio web, base de datos y almacenamiento de archivos, y dirige las solicitudes de IA'],
          ['Google Cloud (Vertex AI)', 'Escribe veredictos, planes, textos de sitios web y materiales a partir de lo que envías'],
          ['DataForSEO, YouTube Data API (Google), Podcast Index', 'Buscan en fuentes públicas con frases cortas de tu idea, para encontrar señales del mercado'],
          ['Stripe', 'Procesa los pagos'],
          ['Shorts Factory (nuestro servicio de video)', 'Convierte los veredictos públicos en videos cortos']
        ]),
        p('Cuando empecemos a enviar emails a la lista de First 30, usaremos un servicio de envío de email y lo nombraremos aquí.')
      ]
    },
    {
      id: 'public-content',
      title: 'Contenido público del veredicto',
      blocks: [
        p('Antes de que corra un veredicto, confirmas que la idea que envías, tu informe y el video que se hace con ellos son públicos y pueden publicarse y volver a usarse. Quitamos los emails y teléfonos de la copia pública. Por favor deja fuera de lo que envías los datos privados o que te identifiquen.')
      ]
    },
    {
      id: 'sharing',
      title: 'Cuándo compartimos información',
      blocks: [
        list(
          'Con los proveedores de servicios de arriba, para operar GhostTown.',
          'Cuando nos lo pides, por ejemplo al publicar tu sitio web en tu propia cuenta de Cloudflare.',
          'Cuando la ley lo exige, o para proteger a GhostTown, a nuestros clientes o al público de fraude o daño.',
          'Si GhostTown se vende o se fusiona. Te avisaríamos antes de que tu información pasara a otra política de privacidad.'
        ),
        p('No vendemos información personal ni la compartimos para publicidad basada en tu actividad en otros sitios.')
      ]
    },
    {
      id: 'retention',
      title: 'Cuánto tiempo la guardamos',
      blocks: [
        table(['Información', 'Cuánto tiempo'], [
          ['Tu cuenta, los veredictos guardados y tu trabajo en el programa', 'Hasta que nos pidas borrar tu cuenta'],
          ['Veredictos no guardados en una cuenta', 'Hasta 90 días'],
          ['Copia pública en video de un veredicto', 'Hasta 1 año'],
          ['Inscripción en la lista de email de First 30', 'Hasta que canceles la suscripción o nos pidas quitarla'],
          ['Registros de pagos y órdenes', 'El tiempo que exijan las leyes de impuestos y contabilidad'],
          ['Registros del servidor', 'Poco tiempo'],
          ['Contadores de uso justo', 'Solo guardan una forma cifrada (hash) de tu dirección IP, nunca la dirección misma']
        ])
      ]
    },
    {
      id: 'rights',
      title: 'Tus opciones y derechos',
      blocks: [
        p('Puedes pedirnos que:'),
        list(
          'te digamos qué información personal tenemos sobre ti y te demos una copia;',
          'corrijamos información que esté mal;',
          'borremos tu información;',
          'dejemos de enviarte emails de First 30.'
        ),
        p(`Escribe a ${support} con "Solicitud de privacidad" en el asunto. Puede que confirmemos la solicitud desde el email de tu cuenta antes de actuar. También puedes pedirle a otra persona que haga la solicitud por ti con tu permiso por escrito. Contestamos en 45 días y no te trataremos de forma distinta por usar estos derechos.`),
        p('**Si vives en California**, tienes estos derechos bajo la Ley de Privacidad del Consumidor de California (CCPA), incluido el derecho a saber las categorías de información que recogemos (arriba), de dónde viene (de ti, de tu navegador y de tu uso de GhostTown), para qué la usamos (arriba) y a quién se la damos (los proveedores de arriba). No vendemos ni compartimos información personal, y no usamos información personal sensible para sacar conclusiones sobre ti. Las personas que viven en otros estados con leyes de privacidad, y en la Unión Europea y el Reino Unido, pueden hacer las mismas solicitudes de la misma forma.')
      ]
    },
    {
      id: 'email',
      title: 'Emails',
      blocks: [
        p('Solo escribimos a la lista de First 30 sobre First 30, incluido cuándo abre. Cada uno de esos emails tiene un enlace para cancelar la suscripción y nuestra dirección postal, y dejamos de escribirte dentro de 10 días laborables después de que lo pidas.'),
        p('Los emails del servicio, como cambios de contraseña y recibos de pago, no son publicidad. Te los enviamos mientras tengas una cuenta.')
      ]
    },
    {
      id: 'tracking',
      title: 'No rastrear (Do Not Track) y Control Global de Privacidad',
      blocks: [
        p('No te rastreamos en otros sitios web, así que una señal de No rastrear (Do Not Track) no cambia nada de lo que hacemos. Tratamos una señal de Control Global de Privacidad (Global Privacy Control) como una petición de no vender ni compartir tu información, cosa que ya no hacemos.')
      ]
    },
    {
      id: 'children',
      title: 'Menores de edad',
      blocks: [
        p('GhostTown es para adultos de 18 años o más. No está pensado para menores, y no recogemos a sabiendas información de niños menores de 13 años. Si nos enteramos de que lo hicimos, la borramos.')
      ]
    },
    {
      id: 'security',
      title: 'Seguridad y almacenamiento',
      blocks: [
        p('Las conexiones a GhostTown usan cifrado (HTTPS), las contraseñas se guardan cifradas (hash) y el acceso a los datos de clientes es limitado. Ningún sistema es perfectamente seguro. Si una filtración afecta tu información, te avisaremos como exige la ley.'),
        p('Nuestros datos se guardan en Estados Unidos y en la red global de Cloudflare.')
      ]
    },
    {
      id: 'changes',
      title: 'Cambios a esta política',
      blocks: [
        p('Cuando cambiamos esta política, actualizamos la fecha de arriba. Si el cambio es importante, avisamos por email a quienes tienen cuenta antes de que entre en vigor.')
      ]
    },
    {
      id: 'contact',
      title: 'Contacto',
      blocks: [p(`Preguntas o solicitudes de privacidad: ${support}.`)]
    }
  ]
};

const disclaimer: LegalPageContent = {
  eyebrow: 'Aviso legal',
  title: 'Aviso legal',
  summary: 'GhostTown te ayuda a decidir qué probar y a hacer las pruebas. No puede prometer cómo saldrán.',
  sections: [
    {
      id: 'results',
      title: 'No prometemos ingresos ni resultados',
      blocks: [
        p('GhostTown no promete ingresos, clientes, ventas ni éxito en los negocios. Los ejemplos de este sitio muestran cómo funciona GhostTown. No son resultados típicos ni predicciones de los tuyos. Lo que pase depende de tu idea, tu mercado, tu esfuerzo y muchas cosas que nadie controla.')
      ]
    },
    {
      id: 'advice',
      title: 'No es asesoría profesional',
      blocks: [
        p('GhostTown no es asesoría legal, financiera, contributiva, de contabilidad, de inversiones, médica ni de ningún otro tipo profesional. Si tu idea está regulada (por ejemplo salud, finanzas, alimentos, cuido de niños u oficios con licencia), habla con un profesional cualificado antes de actuar.')
      ]
    },
    {
      id: 'ai-and-evidence',
      title: 'La IA y la evidencia tienen límites',
      blocks: [
        p('Los veredictos y planes combinan tus respuestas, la IA y señales públicas de una búsqueda automática corta en la web, videos y podcasts. Esas señales muestran que existe un mercado o una conversación. No son entrevistas con clientes ni prueba de que tu oferta se venderá, y pueden estar incompletas o desactualizadas. Cuando la búsqueda o la IA no están disponibles, GhostTown usa una evaluación con puntuación de tus respuestas.'),
        p('La IA puede equivocarse. Revisa todo lo importante antes de confiar en ello o publicarlo.')
      ]
    },
    {
      id: 'responsibility',
      title: 'Lo que publicas',
      blocks: [
        p('Eres responsable de lo que publicas y envías, incluidos tu sitio web, lo que afirmas sobre tu negocio y cómo manejas la información de tus propios clientes. La idea que envías, tu informe y el video de tu veredicto son contenido público.')
      ]
    },
    {
      id: 'links',
      title: 'Otros sitios web',
      blocks: [
        p('GhostTown enlaza a otros sitios web y servicios, como Cloudflare y Stripe. Allí aplican sus propios términos y políticas de privacidad.')
      ]
    }
  ]
};

export const LEGAL_PAGES_ES: Record<LegalPageKind, LegalPageContent> = { terms, refund, privacy, disclaimer };
