import type { Locale } from "../lib/locale";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import { recordCommercialEvent } from "../lib/commercialAttribution";
import { cloudflareRegistrarUrl, domainIdeas, preferredPublicUrl } from "../lib/getMeLiveOffer";
import type { GetMeLiveAsset, GetMeLiveConfiguration, GetMeLiveOrder, GetMeLiveReleaseReceiptV2, GetMeLiveShareDraft } from "../types/getMeLive";

interface Props { orderId: string; onBack: () => void; locale?: Locale; }
interface Lead { leadId: string; name: string; email: string; message?: string; createdAt: string; }
interface Activity { visits: number; shares: number; sales: number; revenueCents: number; }
interface OrderPayload { order: GetMeLiveOrder; configuration: GetMeLiveConfiguration; assets?: GetMeLiveAsset[]; leads?: Lead[]; activity?: Activity; nameSuggestions?: string[]; error?: string; }
interface SiteHealth { checkedAt: string; healthy: boolean; servingLatestRelease: boolean; preferredUrl: string; }
interface PublishResult { status?: string; verified?: boolean; pending?: boolean; duplicate?: boolean; releaseId?: string; attemptBuildId?: string; currentBuildId?: string; failure?: string; }
interface DomainZone { zoneId: string; name: string; eligible: boolean; reason?: string; }
interface CustomDomainResult { customDomain: GetMeLiveOrder["customDomainState"] | null; error?: string; }
interface PublishStatus { status: string; pendingAttempt?: { releaseId: string; kind: string; phase: string }; }


type WorkspaceCopyKey = "emailReady" | "alreadyPublishing" | "addressCopied" | "yesHttp" | "Clean" | "Simple and clear." | "Bold" | "Strong and direct." | "Warm" | "Friendly and calm." | "Professional" | "Polished and steady." | "Local" | "Familiar and trusted." | "Premium" | "Quiet and high value." | "Your starting page" | "Where your page lives" | "Business name" | "Look and logo" | "Photos" | "Offer and button" | "Free PDF" | "Where leads go" | "Payments" | "Review and go live" | "Saved" | "That did not work. Please try again." | "Your page could not be checked." | "Your page preview is still being prepared." | "This Get Me Live order is missing." | "Your page could not be opened." | "Please try again." | "Saving…" | "Not saved" | "Your change was not saved." | "Show me how to connect it" | "In Cloudflare, add your domain to the same account your website uses (Add a domain)." | "If you bought it somewhere else, change its nameservers at that company to the two Cloudflare shows you." | "Wait until Cloudflare shows the domain as Active. This can take up to a day." | "If the domain already points somewhere (an old website or email), remove those records for the main address and www first, or ask us for help." | "Come back here and choose “I bought it — connect it.”" | "Cloudflare could not connect." | "File added." | "The file could not be added." | "Logo chosen." | "The logo could not be made." | "The file could not be removed." | "Photo order could not be changed." | "Open the email Cloudflare sent to your inbox and confirm it, then choose Check again." | "Business email could not be set up. Try again in a few minutes." | "Payments could not be opened." | "Payments are ready." | "Stripe still needs information. You can go live with a signup button now." | "Payment status could not be checked." | "Your website is ready." | " Your newest edits will go out when you publish again after this finishes." | "Your website is going online. This can take a minute." | "Your page could not go live." | "Your Cloudflare domains could not be loaded." | "The address could not be connected." | "The address could not be removed." | "Your share pack could not be opened." | "Post shared." | "Copy did not work. Select the post text and copy it instead." | "Post copied." | "Opening your starting page…" | "← Dashboard" | "Get Me Live is unavailable." | "Approve a few choices. GhostTown handles the website work." | "Launch checklist" | "Your checklist" | "Your starting point" | "Your page is already mostly done." | "We used your Sprint to fill in the offer, headline, price, and first page. Check the preview. Then make only the choices that matter." | "About 75% ready" | "Your changes save by themselves and update the preview." | "Start with where my page lives" | "First" | "Put the page in an account you own." | "Cloudflare will hold your website. You stay in control and can remove GhostTown access later." | "Cloudflare is connected." | "Choose your account" | "Choose my name" | "I have Cloudflare" | "I need a free account" | "Create it, then come back and choose “I have Cloudflare.”" | "Choose your business name." | "This is the name people see on your website. You can add your own web address after your website is live." | "Ideas from your Sprint" | "Use" | "Continue with this name" | "Choose the look." | "Choose a simple logo" | "Use my name only" | "forest" | "sunset" | "night" | "Your selected logo" | "Current logo" | "Or upload your logo" | "PNG, JPG, WebP, GIF, or SVG under 5 MB" | "Add photos" | "Add photos." | "Your first photo is the main image. You can change the order." | "Upload a photo" | "Main image" | "Make main" | "Remove" | "Set my offer" | "What are you offering?" | "We filled this from your Sprint. Change only what you want." | "Headline" | "Offer" | "Price" | "Button text" | "What should visitors do?" | "Tell me they're interested" | "Best way to start." | "Buy now" | "Add Stripe when ready." | "Decide later" | "Start with interest." | "Add a free PDF" | "Give visitors a free PDF." | "This is optional. It can be a guide, checklist, or menu." | "Upload a PDF" | "Up to 10 MB" | "Continue" | "Skip for now" | "Where should new leads go?" | "Lead email" | "Public contact email" | "Check payments" | "Let people pay." | "Connect Stripe so customers can buy from your page. If Stripe still needs details, you can go live now with an interest form." | "Open Stripe" | "Check if payments are ready" | "You chose an interest form. Stripe is not needed." | "Review my page" | "You are live" | "We built your website and put it online. You can open it, share it, and start receiving leads." | "Your latest changes are still going online." | "Open My Website" | "Website link copied." | "Copy did not work. Select the link below instead." | "Copy Website Link" | "Page visits" | "People interested" | "Shares" | "Sales" | "Sales value" | "Customer activity" | "These people asked to hear from you." | "Open Launch Share Pack" | "Launch Share Pack drafts" | "Three posts, ready to share" | "Post" | "Copy" | "Share" | "A small win worth sharing" | "Optional" | "Want your own website address?" | "Your website is already live. If you want an address like" | ", you can buy one directly from Cloudflare. You own it." | "You already own" | "— connect it." | "Ideas to try — Cloudflare will confirm what is available and show the current price." | "Copy did not work. Select the address instead." | "Find My Website Address" | "Checking…" | "I bought it — connect it" | "We did not find a domain in your Cloudflare account yet. If you just bought it, give Cloudflare a few minutes, then try again." | "Connect" | "Connecting" | "Cloudflare is setting up your address. This can take a few minutes; you can close this page." | "Your website stays open at" | " the whole time." | "the whole time." | "Your website is now at" | "Open" | "is not connected yet" | "Cloudflare could not finish connecting this address." | "Your website is still open at" | "Try again" | "Remove this address" | "Want a matching business email?" | "Example:" | ". Messages to it arrive in your lead email inbox." | "Choose the first part" | "Your business email is ready." | "I confirmed it — check again" | "Set up this email" | "What to do next" | "Keep working from real customer response." | "1. Follow up" | "Reply to people who raised their hand." | "2. Share the page" | "Use the Launch Share Pack to bring in more visitors." | "3. Watch what happens" | "Come back here for visits, interest and sales." | "Release receipt" | "Proof your page was published and checked." | "Checked" | "Needs attention" | "Live page" | "Published" | "Page opened at launch" | "Lead form" | "Connected" | "Activity tracking" | "Customer action" | "Payments ready" | "Interest form until Stripe is ready" | "Interest form" | "This page went live before GhostTown kept launch records, so this receipt was rebuilt from your live site on" | "Right now" | "Your page is open and its lead form and activity tracking are connected." | "Your page needs attention." | "Technical details" | "Cloudflare project:" | "Release:" | "Deployment:" | "Build:" | "Verified:" | "Check again" | "Download receipt" | "Check release receipt" | "Review before you go live." | "Ready" | "Check this" | "Stripe charges its normal fees only when a customer pays." | "Stripe is not finished. Your page will use the interest form until payments are ready." | "Going live…" | "Go Live" | "Finish the items marked “Check this” first." | "Your exact preview" | "It updates after each saved change." | "View preview" | "Your page preview" | "Preparing your preview…";
const COPY: Record<Locale, Record<WorkspaceCopyKey, string>> = {
  en: {
  "emailReady": "{email} is ready. Messages to it go to your lead email.",
  "alreadyPublishing": "Your website is already going online.",
  "addressCopied": "{address} copied.",
  "yesHttp": "Yes · HTTP {status}",

  "Clean": "Clean",
  "Simple and clear.": "Simple and clear.",
  "Bold": "Bold",
  "Strong and direct.": "Strong and direct.",
  "Warm": "Warm",
  "Friendly and calm.": "Friendly and calm.",
  "Professional": "Professional",
  "Polished and steady.": "Polished and steady.",
  "Local": "Local",
  "Familiar and trusted.": "Familiar and trusted.",
  "Premium": "Premium",
  "Quiet and high value.": "Quiet and high value.",
  "Your starting page": "Your starting page",
  "Where your page lives": "Where your page lives",
  "Business name": "Business name",
  "Look and logo": "Look and logo",
  "Photos": "Photos",
  "Offer and button": "Offer and button",
  "Free PDF": "Free PDF",
  "Where leads go": "Where leads go",
  "Payments": "Payments",
  "Review and go live": "Review and go live",
  "Saved": "Saved",
  "That did not work. Please try again.": "That did not work. Please try again.",
  "Your page could not be checked.": "Your page could not be checked.",
  "Your page preview is still being prepared.": "Your page preview is still being prepared.",
  "This Get Me Live order is missing.": "This Get Me Live order is missing.",
  "Your page could not be opened.": "Your page could not be opened.",
  "Please try again.": "Please try again.",
  "Saving…": "Saving…",
  "Not saved": "Not saved",
  "Your change was not saved.": "Your change was not saved.",
  "Show me how to connect it": "Show me how to connect it",
  "In Cloudflare, add your domain to the same account your website uses (Add a domain).": "In Cloudflare, add your domain to the same account your website uses (Add a domain).",
  "If you bought it somewhere else, change its nameservers at that company to the two Cloudflare shows you.": "If you bought it somewhere else, change its nameservers at that company to the two Cloudflare shows you.",
  "Wait until Cloudflare shows the domain as Active. This can take up to a day.": "Wait until Cloudflare shows the domain as Active. This can take up to a day.",
  "If the domain already points somewhere (an old website or email), remove those records for the main address and www first, or ask us for help.": "If the domain already points somewhere (an old website or email), remove those records for the main address and www first, or ask us for help.",
  "Come back here and choose “I bought it — connect it.”": "Come back here and choose “I bought it — connect it.”",
  "Cloudflare could not connect.": "Cloudflare could not connect.",
  "File added.": "File added.",
  "The file could not be added.": "The file could not be added.",
  "Logo chosen.": "Logo chosen.",
  "The logo could not be made.": "The logo could not be made.",
  "The file could not be removed.": "The file could not be removed.",
  "Photo order could not be changed.": "Photo order could not be changed.",
  "Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.": "Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.",
  "Business email could not be set up. Try again in a few minutes.": "Business email could not be set up. Try again in a few minutes.",
  "Payments could not be opened.": "Payments could not be opened.",
  "Payments are ready.": "Payments are ready.",
  "Stripe still needs information. You can go live with a signup button now.": "Stripe still needs information. You can go live with a signup button now.",
  "Payment status could not be checked.": "Payment status could not be checked.",
  "Your website is ready.": "Your website is ready.",
  " Your newest edits will go out when you publish again after this finishes.": " Your newest edits will go out when you publish again after this finishes.",
  "Your website is going online. This can take a minute.": "Your website is going online. This can take a minute.",
  "Your page could not go live.": "Your page could not go live.",
  "Your Cloudflare domains could not be loaded.": "Your Cloudflare domains could not be loaded.",
  "The address could not be connected.": "The address could not be connected.",
  "The address could not be removed.": "The address could not be removed.",
  "Your share pack could not be opened.": "Your share pack could not be opened.",
  "Post shared.": "Post shared.",
  "Copy did not work. Select the post text and copy it instead.": "Copy did not work. Select the post text and copy it instead.",
  "Post copied.": "Post copied.",
  "Opening your starting page…": "Opening your starting page…",
  "← Dashboard": "← Dashboard",
  "Get Me Live is unavailable.": "Get Me Live is unavailable.",
  "Approve a few choices. GhostTown handles the website work.": "Approve a few choices. GhostTown handles the website work.",
  "Launch checklist": "Launch checklist",
  "Your checklist": "Your checklist",
  "Your starting point": "Your starting point",
  "Your page is already mostly done.": "Your page is already mostly done.",
  "We used your Sprint to fill in the offer, headline, price, and first page. Check the preview. Then make only the choices that matter.": "We used your Sprint to fill in the offer, headline, price, and first page. Check the preview. Then make only the choices that matter.",
  "About 75% ready": "About 75% ready",
  "Your changes save by themselves and update the preview.": "Your changes save by themselves and update the preview.",
  "Start with where my page lives": "Start with where my page lives",
  "First": "First",
  "Put the page in an account you own.": "Put the page in an account you own.",
  "Cloudflare will hold your website. You stay in control and can remove GhostTown access later.": "Cloudflare will hold your website. You stay in control and can remove GhostTown access later.",
  "Cloudflare is connected.": "Cloudflare is connected.",
  "Choose your account": "Choose your account",
  "Choose my name": "Choose my name",
  "I have Cloudflare": "I have Cloudflare",
  "I need a free account": "I need a free account",
  "Create it, then come back and choose “I have Cloudflare.”": "Create it, then come back and choose “I have Cloudflare.”",
  "Choose your business name.": "Choose your business name.",
  "This is the name people see on your website. You can add your own web address after your website is live.": "This is the name people see on your website. You can add your own web address after your website is live.",
  "Ideas from your Sprint": "Ideas from your Sprint",
  "Use": "Use",
  "Continue with this name": "Continue with this name",
  "Choose the look.": "Choose the look.",
  "Choose a simple logo": "Choose a simple logo",
  "Use my name only": "Use my name only",
  "forest": "forest",
  "sunset": "sunset",
  "night": "night",
  "Your selected logo": "Your selected logo",
  "Current logo": "Current logo",
  "Or upload your logo": "Or upload your logo",
  "PNG, JPG, WebP, GIF, or SVG under 5 MB": "PNG, JPG, WebP, GIF, or SVG under 5 MB",
  "Add photos": "Add photos",
  "Add photos.": "Add photos.",
  "Your first photo is the main image. You can change the order.": "Your first photo is the main image. You can change the order.",
  "Upload a photo": "Upload a photo",
  "Main image": "Main image",
  "Make main": "Make main",
  "Remove": "Remove",
  "Set my offer": "Set my offer",
  "What are you offering?": "What are you offering?",
  "We filled this from your Sprint. Change only what you want.": "We filled this from your Sprint. Change only what you want.",
  "Headline": "Headline",
  "Offer": "Offer",
  "Price": "Price",
  "Button text": "Button text",
  "What should visitors do?": "What should visitors do?",
  "Tell me they're interested": "Tell me they're interested",
  "Best way to start.": "Best way to start.",
  "Buy now": "Buy now",
  "Add Stripe when ready.": "Add Stripe when ready.",
  "Decide later": "Decide later",
  "Start with interest.": "Start with interest.",
  "Add a free PDF": "Add a free PDF",
  "Give visitors a free PDF.": "Give visitors a free PDF.",
  "This is optional. It can be a guide, checklist, or menu.": "This is optional. It can be a guide, checklist, or menu.",
  "Upload a PDF": "Upload a PDF",
  "Up to 10 MB": "Up to 10 MB",
  "Continue": "Continue",
  "Skip for now": "Skip for now",
  "Where should new leads go?": "Where should new leads go?",
  "Lead email": "Lead email",
  "Public contact email": "Public contact email",
  "Check payments": "Check payments",
  "Let people pay.": "Let people pay.",
  "Connect Stripe so customers can buy from your page. If Stripe still needs details, you can go live now with an interest form.": "Connect Stripe so customers can buy from your page. If Stripe still needs details, you can go live now with an interest form.",
  "Open Stripe": "Open Stripe",
  "Check if payments are ready": "Check if payments are ready",
  "You chose an interest form. Stripe is not needed.": "You chose an interest form. Stripe is not needed.",
  "Review my page": "Review my page",
  "You are live": "You are live",
  "We built your website and put it online. You can open it, share it, and start receiving leads.": "We built your website and put it online. You can open it, share it, and start receiving leads.",
  "Your latest changes are still going online.": "Your latest changes are still going online.",
  "Open My Website": "Open My Website",
  "Website link copied.": "Website link copied.",
  "Copy did not work. Select the link below instead.": "Copy did not work. Select the link below instead.",
  "Copy Website Link": "Copy Website Link",
  "Page visits": "Page visits",
  "People interested": "People interested",
  "Shares": "Shares",
  "Sales": "Sales",
  "Sales value": "Sales value",
  "Customer activity": "Customer activity",
  "These people asked to hear from you.": "These people asked to hear from you.",
  "Open Launch Share Pack": "Open Launch Share Pack",
  "Launch Share Pack drafts": "Launch Share Pack drafts",
  "Three posts, ready to share": "Three posts, ready to share",
  "Post": "Post",
  "Copy": "Copy",
  "Share": "Share",
  "A small win worth sharing": "A small win worth sharing",
  "Optional": "Optional",
  "Want your own website address?": "Want your own website address?",
  "Your website is already live. If you want an address like": "Your website is already live. If you want an address like",
  ", you can buy one directly from Cloudflare. You own it.": ", you can buy one directly from Cloudflare. You own it.",
  "You already own": "You already own",
  "— connect it.": "— connect it.",
  "Ideas to try — Cloudflare will confirm what is available and show the current price.": "Ideas to try — Cloudflare will confirm what is available and show the current price.",
  "Copy did not work. Select the address instead.": "Copy did not work. Select the address instead.",
  "Find My Website Address": "Find My Website Address",
  "Checking…": "Checking…",
  "I bought it — connect it": "I bought it — connect it",
  "We did not find a domain in your Cloudflare account yet. If you just bought it, give Cloudflare a few minutes, then try again.": "We did not find a domain in your Cloudflare account yet. If you just bought it, give Cloudflare a few minutes, then try again.",
  "Connect": "Connect",
  "Connecting": "Connecting",
  "Cloudflare is setting up your address. This can take a few minutes; you can close this page.": "Cloudflare is setting up your address. This can take a few minutes; you can close this page.",
  "Your website stays open at": "Your website stays open at",
  " the whole time.": " the whole time.",
  "the whole time.": "the whole time.",
  "Your website is now at": "Your website is now at",
  "Open": "Open",
  "is not connected yet": "is not connected yet",
  "Cloudflare could not finish connecting this address.": "Cloudflare could not finish connecting this address.",
  "Your website is still open at": "Your website is still open at",
  "Try again": "Try again",
  "Remove this address": "Remove this address",
  "Want a matching business email?": "Want a matching business email?",
  "Example:": "Example:",
  ". Messages to it arrive in your lead email inbox.": ". Messages to it arrive in your lead email inbox.",
  "Choose the first part": "Choose the first part",
  "Your business email is ready.": "Your business email is ready.",
  "I confirmed it — check again": "I confirmed it — check again",
  "Set up this email": "Set up this email",
  "What to do next": "What to do next",
  "Keep working from real customer response.": "Keep working from real customer response.",
  "1. Follow up": "1. Follow up",
  "Reply to people who raised their hand.": "Reply to people who raised their hand.",
  "2. Share the page": "2. Share the page",
  "Use the Launch Share Pack to bring in more visitors.": "Use the Launch Share Pack to bring in more visitors.",
  "3. Watch what happens": "3. Watch what happens",
  "Come back here for visits, interest and sales.": "Come back here for visits, interest and sales.",
  "Release receipt": "Release receipt",
  "Proof your page was published and checked.": "Proof your page was published and checked.",
  "Checked": "Checked",
  "Needs attention": "Needs attention",
  "Live page": "Live page",
  "Published": "Published",
  "Page opened at launch": "Page opened at launch",
  "Lead form": "Lead form",
  "Connected": "Connected",
  "Activity tracking": "Activity tracking",
  "Customer action": "Customer action",
  "Payments ready": "Payments ready",
  "Interest form until Stripe is ready": "Interest form until Stripe is ready",
  "Interest form": "Interest form",
  "This page went live before GhostTown kept launch records, so this receipt was rebuilt from your live site on": "This page went live before GhostTown kept launch records, so this receipt was rebuilt from your live site on",
  "Right now": "Right now",
  "Your page is open and its lead form and activity tracking are connected.": "Your page is open and its lead form and activity tracking are connected.",
  "Your page needs attention.": "Your page needs attention.",
  "Technical details": "Technical details",
  "Cloudflare project:": "Cloudflare project:",
  "Release:": "Release:",
  "Deployment:": "Deployment:",
  "Build:": "Build:",
  "Verified:": "Verified:",
  "Check again": "Check again",
  "Download receipt": "Download receipt",
  "Check release receipt": "Check release receipt",
  "Review before you go live.": "Review before you go live.",
  "Ready": "Ready",
  "Check this": "Check this",
  "Stripe charges its normal fees only when a customer pays.": "Stripe charges its normal fees only when a customer pays.",
  "Stripe is not finished. Your page will use the interest form until payments are ready.": "Stripe is not finished. Your page will use the interest form until payments are ready.",
  "Going live…": "Going live…",
  "Go Live": "Go Live",
  "Finish the items marked “Check this” first.": "Finish the items marked “Check this” first.",
  "Your exact preview": "Your exact preview",
  "It updates after each saved change.": "It updates after each saved change.",
  "View preview": "View preview",
  "Your page preview": "Your page preview",
  "Preparing your preview…": "Preparing your preview…"
},
  es: {
  "emailReady": "{email} está listo. Los mensajes llegan a tu correo para recibir contactos.",
  "alreadyPublishing": "Tu sitio web ya se está publicando.",
  "addressCopied": "{address} copiado.",
  "yesHttp": "Sí · HTTP {status}",

  "Clean": "Claro",
  "Simple and clear.": "Simple y claro.",
  "Bold": "Atrevido",
  "Strong and direct.": "Fuerte y directo.",
  "Warm": "Cálido",
  "Friendly and calm.": "Amigable y tranquilo.",
  "Professional": "Profesional",
  "Polished and steady.": "Cuidado y confiable.",
  "Local": "Local",
  "Familiar and trusted.": "Cercano y de confianza.",
  "Premium": "Premium",
  "Quiet and high value.": "Discreto y de gran valor.",
  "Your starting page": "Tu página inicial",
  "Where your page lives": "Dónde vive tu página",
  "Business name": "Nombre del negocio",
  "Look and logo": "Estilo y logo",
  "Photos": "Fotos",
  "Offer and button": "Oferta y botón",
  "Free PDF": "PDF gratis",
  "Where leads go": "Dónde llegan los contactos",
  "Payments": "Pagos",
  "Review and go live": "Revisar y publicar",
  "Saved": "Guardado",
  "That did not work. Please try again.": "No funcionó. Inténtalo otra vez.",
  "Your page could not be checked.": "No pudimos revisar tu página.",
  "Your page preview is still being prepared.": "La vista previa de tu página todavía se está preparando.",
  "This Get Me Live order is missing.": "Falta este pedido de Get Me Live.",
  "Your page could not be opened.": "No pudimos abrir tu página.",
  "Please try again.": "Inténtalo otra vez.",
  "Saving…": "Guardando…",
  "Not saved": "Sin guardar",
  "Your change was not saved.": "Tu cambio no se guardó.",
  "Show me how to connect it": "Muéstrame cómo conectarlo",
  "In Cloudflare, add your domain to the same account your website uses (Add a domain).": "En Cloudflare, añade tu dominio a la misma cuenta de tu sitio web (Add a domain).",
  "If you bought it somewhere else, change its nameservers at that company to the two Cloudflare shows you.": "Si lo compraste en otro lugar, cambia allí sus servidores de nombres por los dos que te muestra Cloudflare.",
  "Wait until Cloudflare shows the domain as Active. This can take up to a day.": "Espera hasta que Cloudflare muestre el dominio como activo (Active). Puede tardar hasta un día.",
  "If the domain already points somewhere (an old website or email), remove those records for the main address and www first, or ask us for help.": "Si el dominio ya tiene un sitio web o correo, elimina primero esos registros de la dirección principal y www, o pídenos ayuda.",
  "Come back here and choose “I bought it — connect it.”": "Vuelve aquí y elige «Ya lo compré: conectarlo».",
  "Cloudflare could not connect.": "No pudimos conectar Cloudflare.",
  "File added.": "Archivo añadido.",
  "The file could not be added.": "No pudimos añadir el archivo.",
  "Logo chosen.": "Logo elegido.",
  "The logo could not be made.": "No pudimos crear el logo.",
  "The file could not be removed.": "No pudimos eliminar el archivo.",
  "Photo order could not be changed.": "No pudimos cambiar el orden de las fotos.",
  "Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.": "Abre el correo que te envió Cloudflare y confirma tu dirección. Luego elige Revisar otra vez.",
  "Business email could not be set up. Try again in a few minutes.": "No pudimos configurar el correo del negocio. Inténtalo en unos minutos.",
  "Payments could not be opened.": "No pudimos abrir los pagos.",
  "Payments are ready.": "Los pagos están listos.",
  "Stripe still needs information. You can go live with a signup button now.": "Stripe todavía necesita información. Puedes publicar ahora con un formulario de interés.",
  "Payment status could not be checked.": "No pudimos revisar el estado de los pagos.",
  "Your website is ready.": "Tu sitio web está listo.",
  " Your newest edits will go out when you publish again after this finishes.": " Tus cambios más recientes se publicarán cuando vuelvas a publicar después de que termine.",
  "Your website is going online. This can take a minute.": "Tu sitio web se está publicando. Puede tardar un minuto.",
  "Your page could not go live.": "No pudimos publicar tu página.",
  "Your Cloudflare domains could not be loaded.": "No pudimos cargar tus dominios de Cloudflare.",
  "The address could not be connected.": "No pudimos conectar la dirección.",
  "The address could not be removed.": "No pudimos eliminar la dirección.",
  "Your share pack could not be opened.": "No pudimos abrir tus publicaciones para compartir.",
  "Post shared.": "Publicación compartida.",
  "Copy did not work. Select the post text and copy it instead.": "No se pudo copiar. Selecciona el texto de la publicación y cópialo.",
  "Post copied.": "Publicación copiada.",
  "Opening your starting page…": "Abriendo tu página inicial…",
  "← Dashboard": "← Panel",
  "Get Me Live is unavailable.": "Get Me Live no está disponible.",
  "Approve a few choices. GhostTown handles the website work.": "Aprueba unas decisiones. GhostTown se encarga del sitio web.",
  "Launch checklist": "Lista para publicar",
  "Your checklist": "Tu lista de pasos",
  "Your starting point": "Tu punto de partida",
  "Your page is already mostly done.": "Tu página ya está casi lista.",
  "We used your Sprint to fill in the offer, headline, price, and first page. Check the preview. Then make only the choices that matter.": "Usamos tu Sprint para preparar la oferta, el título, el precio y la primera página. Revisa la vista previa y decide solo lo que hace falta.",
  "About 75% ready": "Aproximadamente un 75% listo",
  "Your changes save by themselves and update the preview.": "Tus cambios se guardan solos y actualizan la vista previa.",
  "Start with where my page lives": "Empezar por dónde vive mi página",
  "First": "Primero",
  "Put the page in an account you own.": "Pon la página en una cuenta tuya.",
  "Cloudflare will hold your website. You stay in control and can remove GhostTown access later.": "Cloudflare alojará tu sitio web. Tú mantienes el control y puedes quitarle el acceso a GhostTown después.",
  "Cloudflare is connected.": "Cloudflare está conectado.",
  "Choose your account": "Elige tu cuenta",
  "Choose my name": "Elegir mi nombre",
  "I have Cloudflare": "Tengo Cloudflare",
  "I need a free account": "Necesito una cuenta gratis",
  "Create it, then come back and choose “I have Cloudflare.”": "Créala, vuelve aquí y elige «Tengo Cloudflare».",
  "Choose your business name.": "Elige el nombre de tu negocio.",
  "This is the name people see on your website. You can add your own web address after your website is live.": "Este es el nombre que la gente verá en tu sitio web. Puedes añadir tu propia dirección después de publicarlo.",
  "Ideas from your Sprint": "Ideas de tu Sprint",
  "Use": "Usar",
  "Continue with this name": "Continuar con este nombre",
  "Choose the look.": "Elige el estilo.",
  "Choose a simple logo": "Elige un logo sencillo",
  "Use my name only": "Usar solo mi nombre",
  "forest": "bosque",
  "sunset": "atardecer",
  "night": "noche",
  "Your selected logo": "El logo que elegiste",
  "Current logo": "Logo actual",
  "Or upload your logo": "O sube tu logo",
  "PNG, JPG, WebP, GIF, or SVG under 5 MB": "PNG, JPG, WebP, GIF o SVG de menos de 5 MB",
  "Add photos": "Añadir fotos",
  "Add photos.": "Añade fotos.",
  "Your first photo is the main image. You can change the order.": "Tu primera foto es la imagen principal. Puedes cambiar el orden.",
  "Upload a photo": "Subir una foto",
  "Main image": "Imagen principal",
  "Make main": "Usar como principal",
  "Remove": "Eliminar",
  "Set my offer": "Preparar mi oferta",
  "What are you offering?": "¿Qué ofreces?",
  "We filled this from your Sprint. Change only what you want.": "Lo completamos con tu Sprint. Cambia solo lo que quieras.",
  "Headline": "Título",
  "Offer": "Oferta",
  "Price": "Precio",
  "Button text": "Texto del botón",
  "What should visitors do?": "¿Qué quieres que hagan los visitantes?",
  "Tell me they're interested": "Decirme que les interesa",
  "Best way to start.": "La mejor forma de empezar.",
  "Buy now": "Comprar ahora",
  "Add Stripe when ready.": "Añade Stripe cuando estés listo.",
  "Decide later": "Decidir después",
  "Start with interest.": "Empieza midiendo el interés.",
  "Add a free PDF": "Añadir un PDF gratis",
  "Give visitors a free PDF.": "Dales un PDF gratis a tus visitantes.",
  "This is optional. It can be a guide, checklist, or menu.": "Es opcional. Puede ser una guía, una lista de pasos o un menú.",
  "Upload a PDF": "Subir un PDF",
  "Up to 10 MB": "Hasta 10 MB",
  "Continue": "Continuar",
  "Skip for now": "Omitir por ahora",
  "Where should new leads go?": "¿Dónde quieres recibir los nuevos contactos?",
  "Lead email": "Correo para recibir contactos",
  "Public contact email": "Correo de contacto público",
  "Check payments": "Revisar los pagos",
  "Let people pay.": "Permite que la gente pague.",
  "Connect Stripe so customers can buy from your page. If Stripe still needs details, you can go live now with an interest form.": "Conecta Stripe para que los clientes compren desde tu página. Si Stripe necesita más datos, puedes publicar ahora con un formulario de interés.",
  "Open Stripe": "Abrir Stripe",
  "Check if payments are ready": "Revisar si los pagos están listos",
  "You chose an interest form. Stripe is not needed.": "Elegiste un formulario de interés. No necesitas Stripe.",
  "Review my page": "Revisar mi página",
  "You are live": "Ya estás en línea",
  "We built your website and put it online. You can open it, share it, and start receiving leads.": "Creamos tu sitio web y lo publicamos. Puedes abrirlo, compartirlo y empezar a recibir contactos.",
  "Your latest changes are still going online.": "Tus cambios más recientes todavía se están publicando.",
  "Open My Website": "Abrir mi sitio web",
  "Website link copied.": "Enlace del sitio web copiado.",
  "Copy did not work. Select the link below instead.": "No se pudo copiar. Selecciona el enlace de abajo.",
  "Copy Website Link": "Copiar enlace del sitio web",
  "Page visits": "Visitas a la página",
  "People interested": "Personas interesadas",
  "Shares": "Veces compartido",
  "Sales": "Ventas",
  "Sales value": "Valor de las ventas",
  "Customer activity": "Actividad de los clientes",
  "These people asked to hear from you.": "Estas personas pidieron que las contactaras.",
  "Open Launch Share Pack": "Abrir publicaciones para compartir",
  "Launch Share Pack drafts": "Borradores para compartir el lanzamiento",
  "Three posts, ready to share": "Tres publicaciones listas para compartir",
  "Post": "Publicación",
  "Copy": "Copiar",
  "Share": "Compartir",
  "A small win worth sharing": "Un pequeño logro para compartir",
  "Optional": "Opcional",
  "Want your own website address?": "¿Quieres tu propia dirección web?",
  "Your website is already live. If you want an address like": "Tu sitio web ya está publicado. Si quieres una dirección como",
  ", you can buy one directly from Cloudflare. You own it.": ", puedes comprarla directamente en Cloudflare. Será tuya.",
  "You already own": "Ya tienes",
  "— connect it.": ": conéctalo.",
  "Ideas to try — Cloudflare will confirm what is available and show the current price.": "Ideas para probar: Cloudflare confirmará cuáles están disponibles y su precio actual.",
  "Copy did not work. Select the address instead.": "No se pudo copiar. Selecciona la dirección.",
  "Find My Website Address": "Buscar mi dirección web",
  "Checking…": "Revisando…",
  "I bought it — connect it": "Ya lo compré: conectarlo",
  "We did not find a domain in your Cloudflare account yet. If you just bought it, give Cloudflare a few minutes, then try again.": "Todavía no encontramos un dominio en tu cuenta de Cloudflare. Si acabas de comprarlo, espera unos minutos e inténtalo otra vez.",
  "Connect": "Conectar",
  "Connecting": "Conectando",
  "Cloudflare is setting up your address. This can take a few minutes; you can close this page.": "Cloudflare está preparando tu dirección. Puede tardar unos minutos; puedes cerrar esta página.",
  "Your website stays open at": "Tu sitio web sigue disponible en",
  " the whole time.": " todo el tiempo.",
  "the whole time.": "todo el tiempo.",
  "Your website is now at": "Tu sitio web ahora está en",
  "Open": "Abrir",
  "is not connected yet": "todavía no está conectado",
  "Cloudflare could not finish connecting this address.": "Cloudflare no pudo terminar de conectar esta dirección.",
  "Your website is still open at": "Tu sitio web sigue disponible en",
  "Try again": "Intentar otra vez",
  "Remove this address": "Eliminar esta dirección",
  "Want a matching business email?": "¿Quieres un correo con el nombre de tu negocio?",
  "Example:": "Ejemplo:",
  ". Messages to it arrive in your lead email inbox.": ". Los mensajes llegan a tu correo para recibir contactos.",
  "Choose the first part": "Elige la primera parte",
  "Your business email is ready.": "El correo de tu negocio está listo.",
  "I confirmed it — check again": "Ya lo confirmé: revisar otra vez",
  "Set up this email": "Configurar este correo",
  "What to do next": "Qué hacer después",
  "Keep working from real customer response.": "Sigue trabajando con respuestas reales de tus clientes.",
  "1. Follow up": "1. Da seguimiento",
  "Reply to people who raised their hand.": "Responde a quienes mostraron interés.",
  "2. Share the page": "2. Comparte la página",
  "Use the Launch Share Pack to bring in more visitors.": "Usa las publicaciones de lanzamiento para atraer más visitantes.",
  "3. Watch what happens": "3. Observa lo que pasa",
  "Come back here for visits, interest and sales.": "Vuelve aquí para ver las visitas, el interés y las ventas.",
  "Release receipt": "Comprobante de publicación",
  "Proof your page was published and checked.": "Prueba de que tu página se publicó y se revisó.",
  "Checked": "Revisado",
  "Needs attention": "Necesita atención",
  "Live page": "Página publicada",
  "Published": "Publicado",
  "Page opened at launch": "La página abrió al publicarse",
  "Lead form": "Formulario de contacto",
  "Connected": "Conectado",
  "Activity tracking": "Registro de actividad",
  "Customer action": "Acción del cliente",
  "Payments ready": "Pagos listos",
  "Interest form until Stripe is ready": "Formulario de interés hasta que Stripe esté listo",
  "Interest form": "Formulario de interés",
  "This page went live before GhostTown kept launch records, so this receipt was rebuilt from your live site on": "Esta página se publicó antes de que GhostTown guardara comprobantes. Reconstruimos este comprobante desde tu sitio web el",
  "Right now": "Ahora mismo",
  "Your page is open and its lead form and activity tracking are connected.": "Tu página está disponible y el formulario de contacto y el registro de actividad están conectados.",
  "Your page needs attention.": "Tu página necesita atención.",
  "Technical details": "Detalles técnicos",
  "Cloudflare project:": "Proyecto de Cloudflare:",
  "Release:": "Publicación:",
  "Deployment:": "Despliegue:",
  "Build:": "Versión:",
  "Verified:": "Verificado:",
  "Check again": "Revisar otra vez",
  "Download receipt": "Descargar comprobante",
  "Check release receipt": "Revisar comprobante de publicación",
  "Review before you go live.": "Revisa antes de publicar.",
  "Ready": "Listo",
  "Check this": "Revisar esto",
  "Stripe charges its normal fees only when a customer pays.": "Stripe cobra sus tarifas normales solo cuando un cliente paga.",
  "Stripe is not finished. Your page will use the interest form until payments are ready.": "La configuración de Stripe está incompleta. Tu página usará el formulario de interés hasta que los pagos estén listos.",
  "Going live…": "Publicando…",
  "Go Live": "Publicar",
  "Finish the items marked “Check this” first.": "Completa primero los pasos que dicen «Revisar esto».",
  "Your exact preview": "Tu vista previa exacta",
  "It updates after each saved change.": "Se actualiza con cada cambio guardado.",
  "View preview": "Ver vista previa",
  "Your page preview": "Vista previa de tu página",
  "Preparing your preview…": "Preparando tu vista previa…"
}
};

const LOOKS = [
  { label: "Clean", preset: "clean_saas" as const, color: "#12372A", note: "Simple and clear." },
  { label: "Bold", preset: "bold_validation" as const, color: "#B6422E", note: "Strong and direct." },
  { label: "Warm", preset: "warm_editorial" as const, color: "#9A5B3E", note: "Friendly and calm." },
  { label: "Professional", preset: "clean_saas" as const, color: "#243447", note: "Polished and steady." },
  { label: "Local", preset: "local_trust" as const, color: "#315C46", note: "Familiar and trusted." },
  { label: "Premium", preset: "premium_service" as const, color: "#7A5B24", note: "Quiet and high value." }
];
export const STEPS = [
  ["home", "Your starting page"], ["cloudflare", "Where your page lives"], ["name", "Business name"],
  ["look", "Look and logo"], ["photos", "Photos"], ["offer", "Offer and button"], ["magnet", "Free PDF"],
  ["contact", "Where leads go"], ["payments", "Payments"], ["review", "Review and go live"]
] as const;
export type StepId = typeof STEPS[number][0];

/** Maps the `step` URL param to a real step. Links from before the rename use `step=domain`. */
export function resolveSetupStep(param: string | null): StepId {
  if (param === "domain") return "name";
  return STEPS.find(([id]) => id === param)?.[0] ?? "home";
}

/** What must be true before Go Live. A custom domain and business email are never required. */
export function prelaunchReady(order: Pick<GetMeLiveOrder, "providerState">, configuration: GetMeLiveConfiguration, accountId: string, previewUrl: string): boolean {
  return Boolean(order.providerState.cloudflareConnected && accountId && previewUrl && configuration.brand.businessName && configuration.offer.headline && configuration.offer.offer && configuration.contact.leadDestinationEmail.includes("@"));
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the DOM copy path for browsers/webviews that expose the
    // Clipboard API but deny it outside a direct permission context.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function GmlField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block rounded-xl border-2 border-ghost-ink bg-white p-4 text-sm font-black text-ghost-ink shadow-sm">
    <span>{label}</span>{hint && <span className="ml-2 font-normal text-gray-600">{hint}</span>}<span className="mt-2 block [&_input]:w-full [&_input]:rounded-lg [&_input]:border-2 [&_input]:border-gray-500 [&_input]:bg-white [&_input]:p-3 [&_input]:font-normal [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border-2 [&_textarea]:border-gray-500 [&_textarea]:bg-white [&_textarea]:p-3 [&_textarea]:font-normal">{children}</span>
  </label>;
}

export default function GetMeLiveWorkspace({ orderId, onBack, locale = "en" }: Props) {
  const t = useCallback((key: WorkspaceCopyKey) => COPY[locale][key], [locale]);
  const [order, setOrder] = useState<GetMeLiveOrder | null>(null);
  const [configuration, setConfiguration] = useState<GetMeLiveConfiguration | null>(null);
  const [assets, setAssets] = useState<GetMeLiveAsset[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<Activity>({ visits: 0, shares: 0, sales: 0, revenueCents: 0 });
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [emailWaiting, setEmailWaiting] = useState(false);
  const [domainZones, setDomainZones] = useState<DomainZone[] | null>(null);
  const [shareDrafts, setShareDrafts] = useState<GetMeLiveShareDraft[]>([]);
  const [milestone, setMilestone] = useState<{ text: string } | null>(null);
  const [releaseReceipt, setReleaseReceipt] = useState<GetMeLiveReleaseReceiptV2 | null>(null);
  const [siteHealth, setSiteHealth] = useState<SiteHealth | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>(() => resolveSetupStep(new URLSearchParams(window.location.search).get("step")));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [pendingRelease, setPendingRelease] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const lastSaved = useRef("");
  const previewRef = useRef("");

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(apiUrl(path), { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
    const body = await response.json<T & { error?: string }>().catch(() => ({} as T & { error?: string }));
    if (!response.ok) throw new Error(body.error || t("That did not work. Please try again."));
    return body;
  }, [t]);
  const loadReleaseReceipt = useCallback(async () => {
    // The launch receipt is stored and immutable. Orders that went live before
    // launch records existed answer needsBackfill; rebuild it once, then re-read.
    const path = `/api/get-me-live/orders/${encodeURIComponent(orderId)}/release-receipt`;
    try {
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      const body = await response.json<{ receipt?: GetMeLiveReleaseReceiptV2; needsBackfill?: boolean }>().catch(() => ({} as { receipt?: GetMeLiveReleaseReceiptV2; needsBackfill?: boolean }));
      if (response.ok && body.receipt) { setReleaseReceipt(body.receipt); return; }
      if (response.status === 404 && body.needsBackfill) {
        const rebuilt = await request<{ receipt: GetMeLiveReleaseReceiptV2 }>(`${path}/backfill`, { method: "POST" });
        setReleaseReceipt(rebuilt.receipt);
        return;
      }
      setReleaseReceipt(null);
    } catch {
      setReleaseReceipt(null);
    }
  }, [orderId, request, t]);
  const checkSiteHealth = useCallback(async () => {
    try { setSiteHealth(await request<SiteHealth>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/health`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Your page could not be checked.")); }
  }, [orderId, request]);
  const openPreview = useCallback(async (buildIfMissing = false) => {
    let response = await fetch(apiUrl(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`), { headers: authHeaders() });
    if (!response.ok && buildIfMissing) {
      await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`, { method: "POST" });
      response = await fetch(apiUrl(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`), { headers: authHeaders() });
    }
    if (!response.ok) throw new Error(t("Your page preview is still being prepared."));
    const html = await response.text();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const next = URL.createObjectURL(new Blob([html], { type: "text/html" })); previewRef.current = next; setPreviewUrl(next);
  }, [orderId, request]);
  const load = useCallback(async () => {
    if (!orderId) { setError(t("This Get Me Live order is missing.")); setLoading(false); return; }
    try {
      const data = await request<OrderPayload>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}`);
      setOrder(data.order); setConfiguration(data.configuration); setAssets(data.assets || []); setLeads(data.leads || []); setActivity(data.activity || { visits: 0, shares: 0, sales: 0, revenueCents: 0 });
      lastSaved.current = JSON.stringify(data.configuration); setNameSuggestions(data.nameSuggestions || []);
      if (data.order.providerState.cloudflareConnected && data.order.status !== "live") {
        const accountData = await request<{ accounts: Array<{ id: string; name: string }> }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/cloudflare/accounts`).catch(() => ({ accounts: [] }));
        setAccounts(accountData.accounts || []);
        if (!data.configuration.domain.cloudflareAccountId && accountData.accounts[0]) setConfiguration({ ...data.configuration, domain: { ...data.configuration.domain, cloudflareAccountId: accountData.accounts[0].id } });
      }
      await openPreview(true);
      if (data.order.status === "live" || data.order.deploymentReceipt) await loadReleaseReceipt();
      const publishStatus = await request<PublishStatus>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/publish/status`).catch(() => null);
      if (publishStatus?.pendingAttempt) setPendingRelease(publishStatus.pendingAttempt.releaseId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Your page could not be opened.")); }
    finally { setLoading(false); }
  }, [loadReleaseReceipt, openPreview, orderId, request, t]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); if (params.get("message")) setError(params.get("message") || t("Please try again."));
    void load(); void recordCommercialEvent("get_me_live_setup_started", { orderId, dedupeKey: `gml_setup:${orderId}` });
    return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
  }, [load, orderId, t]);
  useEffect(() => {
    let active = true; const created: string[] = [];
    Promise.all(assets.filter(asset => asset.kind === "logo" || asset.kind === "photo").map(async asset => {
      const response = await fetch(apiUrl(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/assets/${encodeURIComponent(asset.assetId)}`), { headers: authHeaders() });
      if (!response.ok) return null;
      const url = URL.createObjectURL(await response.blob()); created.push(url); return [asset.assetId, url] as const;
    })).then(entries => { if (active) setAssetUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)))); });
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [assets, orderId]);
  useEffect(() => {
    if (!configuration || loading) return; const serialized = JSON.stringify(configuration); if (serialized === lastSaved.current) return;
    setSaveState("Saving…"); const timer = window.setTimeout(async () => {
      try {
        const data = await request<{ configuration: GetMeLiveConfiguration }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: serialized });
        lastSaved.current = JSON.stringify(data.configuration); setSaveState("Saved");
        await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`, { method: "POST" }); await openPreview();
      } catch (caught) { setSaveState("Not saved"); setError(caught instanceof Error ? caught.message : t("Your change was not saved.")); }
    }, 700); return () => window.clearTimeout(timer);
  }, [configuration, loading, openPreview, orderId, request, t]);

  const chooseStep = (step: StepId) => { setActiveStep(step); const url = new URL(window.location.href); url.pathname = "/get-me-live/setup"; url.searchParams.set("order_id", orderId); url.searchParams.set("step", step); window.history.replaceState({}, "", `${url.pathname}${url.search}`); };
  const accountId = configuration?.domain.cloudflareAccountId || accounts[0]?.id || "";
  const photos = assets.filter(asset => asset.kind === "photo").sort((a, b) => a.position - b.position);
  const selectedLogo = assets.find(asset => asset.kind === "logo" && asset.assetId === configuration?.brand.logoAssetId);
  const leadMagnet = assets.find(asset => asset.kind === "lead_magnet" && typeof configuration?.offer.leadMagnet === "object" && configuration.offer.leadMagnet.assetId === asset.assetId);
  const selectedLook = LOOKS.find(item => item.preset === configuration?.brand.stylePreset && item.color.toLowerCase() === configuration.brand.primaryColor?.toLowerCase()) || LOOKS[0];
  const liveUrl = order ? preferredPublicUrl(order) || order.publicUrl : undefined;
  const domainGuide = <details id="connect-guide" className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><summary className="cursor-pointer font-black">{t("Show me how to connect it")}</summary><ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-800"><li>{t("In Cloudflare, add your domain to the same account your website uses (Add a domain).")}</li><li>{t("If you bought it somewhere else, change its nameservers at that company to the two Cloudflare shows you.")}</li><li>{t("Wait until Cloudflare shows the domain as Active. This can take up to a day.")}</li><li>{t("If the domain already points somewhere (an old website or email), remove those records for the main address and www first, or ask us for help.")}</li><li>{t("Come back here and choose “I bought it — connect it.”")}</li></ol></details>;
  const activeDomain = order?.customDomainState?.status === "active" ? order.customDomainState.name : undefined;
  // Business email is offered for the main domain only (apex + www were connected), never a sub-address.
  const emailDomain = activeDomain && order?.customDomainState?.hosts.includes(`www.${activeDomain}`) ? activeDomain : undefined;
  const ownedLegacyDomain = !order?.customDomainState ? configuration?.domain.selectedDomain : undefined;
  const addressIdeas = domainIdeas([configuration?.brand.businessName || "", ...nameSuggestions]).filter(idea => idea !== ownedLegacyDomain);
  const receiptChecked = Boolean(releaseReceipt && releaseReceipt.checks.customerPageHttpStatus === 200 && releaseReceipt.checks.leadCaptureConfigured && releaseReceipt.checks.activityTrackingConfigured);
  const completed = useMemo<Record<StepId, boolean>>(() => ({
    home: Boolean(previewUrl), cloudflare: Boolean(order?.providerState.cloudflareConnected), name: Boolean(configuration?.brand.businessName), look: Boolean(configuration?.brand.stylePreset), photos: true,
    offer: Boolean(configuration?.offer.headline && configuration.offer.offer && configuration.offer.ctaLabel), magnet: true, contact: Boolean(configuration?.contact.leadDestinationEmail.includes("@")),
    payments: true, review: order?.status === "live"
  }), [configuration, order, previewUrl]);
  const requiredReady = Boolean(order && configuration && prelaunchReady(order, configuration, accountId, previewUrl));

  const connectCloudflare = async () => { setBusy("cloudflare"); setError(""); try { const data = await request<{ authUrl: string }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/cloudflare/connect`); window.location.assign(data.authUrl); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Cloudflare could not connect.")); setBusy(""); } };
  const upload = async (kind: "logo" | "photo" | "lead_magnet", file?: File) => {
    if (!file) return; setBusy(`upload-${kind}`); setError("");
    try { const form = new FormData(); form.set("kind", kind); form.set("file", file); const data = await request<{ asset: GetMeLiveAsset; configuration?: GetMeLiveConfiguration }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/assets`, { method: "POST", body: form }); setAssets(current => [...current, data.asset]); if (data.configuration) { setConfiguration(data.configuration); lastSaved.current = JSON.stringify(data.configuration); } setNotice(t("File added.")); await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`, { method: "POST" }); await openPreview(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("The file could not be added.")); } finally { setBusy(""); }
  };
  const chooseLogo = async (choice: string) => { setBusy("logo"); try { const data = await request<{ asset: GetMeLiveAsset; configuration: GetMeLiveConfiguration }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/assets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "logo", choice }) }); setAssets(current => [...current, data.asset]); setConfiguration(data.configuration); lastSaved.current = JSON.stringify(data.configuration); setNotice(t("Logo chosen.")); await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`, { method: "POST" }); await openPreview(); } catch (caught) { setError(caught instanceof Error ? caught.message : t("The logo could not be made.")); } finally { setBusy(""); } };
  const removeAsset = async (assetId: string) => { setBusy(assetId); try { const data = await request<{ configuration?: GetMeLiveConfiguration }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" }); setAssets(current => current.filter(asset => asset.assetId !== assetId)); if (data.configuration) { setConfiguration(data.configuration); lastSaved.current = JSON.stringify(data.configuration); } await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/preview`, { method: "POST" }); await openPreview(); } catch (caught) { setError(caught instanceof Error ? caught.message : t("The file could not be removed.")); } finally { setBusy(""); } };
  const orderPhotos = async (ids: string[], mainAssetId: string) => { const data = await request<{ assets: GetMeLiveAsset[]; configuration?: GetMeLiveConfiguration }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/assets/order`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetIds: ids, mainAssetId }) }); setAssets(data.assets); if (data.configuration) setConfiguration(data.configuration); };
  const movePhoto = async (assetId: string, direction: -1 | 1) => { const ids = photos.map(photo => photo.assetId), from = ids.indexOf(assetId), to = from + direction; if (to < 0 || to >= ids.length) return; [ids[from], ids[to]] = [ids[to], ids[from]]; try { await orderPhotos(ids, configuration?.brand.mainImageAssetId || ids[0]); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Photo order could not be changed.")); } };
  const setupEmail = async () => { setBusy("email"); setError(""); try { const data = await request<{ businessEmail: string; verified: boolean; actionRequired?: string }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/email/setup`, { method: "POST" }); setEmailWaiting(!data.verified); setNotice(data.verified ? t("emailReady").replace("{email}", data.businessEmail) : data.actionRequired || t("Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.")); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Business email could not be set up. Try again in a few minutes.")); } finally { setBusy(""); } };
  const connectStripe = async () => { setBusy("stripe"); try { const data = await request<{ onboardingUrl: string }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/stripe/connect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); window.location.assign(data.onboardingUrl); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Payments could not be opened.")); setBusy(""); } };
  const checkStripe = async () => { setBusy("stripe-check"); try { const data = await request<{ connected: boolean }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/stripe/status`); setNotice(data.connected ? t("Payments are ready.") : t("Stripe still needs information. You can go live with a signup button now.")); await load(); } catch { setError(t("Payment status could not be checked.")); } finally { setBusy(""); } };
  // The opening tab must be opened synchronously in the click, before any await,
  // or the browser treats it as a popup. If it is blocked, publish still runs and
  // "Open My Website" on the ready screen is the guaranteed path.
  const goLive = () => {
    window.open(`/get-me-live/opening?order_id=${encodeURIComponent(orderId)}`, "_blank", "noopener");
    void publish();
  };
  const publish = async () => {
    setBusy("publish"); setError(""); void recordCommercialEvent("get_me_live_publish_clicked", { orderId });
    try {
      const result = await request<PublishResult>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/publish`, { method: "POST" });
      if (result.verified) { setPendingRelease(null); await load(); setNotice(t("Your website is ready.")); return; }
      if (result.duplicate) setNotice(`${t("alreadyPublishing")}${result.attemptBuildId && result.currentBuildId && result.attemptBuildId !== result.currentBuildId ? t(" Your newest edits will go out when you publish again after this finishes.") : ""}`);
      else setNotice(t("Your website is going online. This can take a minute."));
      if (result.releaseId) setPendingRelease(result.releaseId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Your page could not go live.")); await load(); }
    finally { setBusy(""); }
  };
  useEffect(() => {
    if (!pendingRelease) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const result = await request<PublishResult>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/publish/verify`, { method: "POST" });
        if (!active || result.pending) return;
        setPendingRelease(null);
        if (result.failure) setError(result.failure);
        else if (result.verified) setNotice(t("Your website is ready."));
        await load();
      } catch { /* keep checking; the attempt settles on the server */ }
    }, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [load, orderId, pendingRelease, request, t]);
  const customDomainPath = `/api/get-me-live/orders/${encodeURIComponent(orderId)}/custom-domain`;
  const applyCustomDomain = useCallback((next: GetMeLiveOrder["customDomainState"] | null) => {
    setOrder(current => current ? { ...current, customDomainState: next ?? undefined } : current);
  }, []);
  const loadDomainZones = async () => { setBusy("zones"); setError(""); try { const data = await request<{ zones: DomainZone[] }>(`${customDomainPath}/zones`); setDomainZones(data.zones); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Your Cloudflare domains could not be loaded.")); } finally { setBusy(""); } };
  const connectDomain = async (zoneId: string, hostname?: string) => { setBusy("domain"); setError(""); try { const data = await request<CustomDomainResult>(customDomainPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zoneId, hostname }) }); applyCustomDomain(data.customDomain); setDomainZones(null); } catch (caught) { setError(caught instanceof Error ? caught.message : t("The address could not be connected.")); } finally { setBusy(""); } };
  const removeDomain = async () => { setBusy("domain"); setError(""); try { const data = await request<CustomDomainResult>(customDomainPath, { method: "DELETE" }); applyCustomDomain(data.customDomain); } catch (caught) { setError(caught instanceof Error ? caught.message : t("The address could not be removed.")); } finally { setBusy(""); } };
  // Reconcile-on-return (plan §8.1): while an address is connecting, ask the
  // server to advance it now and every 15 s. Reads never advance it.
  const domainConnecting = order?.customDomainState?.status === "connecting";
  useEffect(() => {
    if (!domainConnecting) return;
    let active = true;
    const reconcile = async () => {
      try {
        const data = await request<CustomDomainResult>(`${customDomainPath}/reconcile`, { method: "POST" });
        if (!active) return;
        applyCustomDomain(data.customDomain);
        if (data.customDomain?.status === "active") await load();
      } catch { /* keep checking; Cloudflare keeps working while we wait */ }
    };
    void reconcile();
    const timer = window.setInterval(() => void reconcile(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [applyCustomDomain, customDomainPath, domainConnecting, load, request]);
  const loadSharePack = async () => { try { const data = await request<{ drafts: GetMeLiveShareDraft[]; milestone?: { text: string } }>(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/share-pack`); setShareDrafts(data.drafts); setMilestone(data.milestone || null); } catch (caught) { setError(caught instanceof Error ? caught.message : t("Your share pack could not be opened.")); } };
  const saveShare = async (draft: GetMeLiveShareDraft, action: "save" | "shared") => { await request(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/share-pack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.draftId, text: draft.editedText, action }) }); };
  const share = async (draft: GetMeLiveShareDraft) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: draft.editedText, url: liveUrl });
        await saveShare(draft, "shared");
        setNotice(t("Post shared."));
        return;
      } catch {
        // Continue to copy fallback when native sharing is dismissed/unavailable.
      }
    }
    if (!(await copyText(draft.editedText))) {
      setError(t("Copy did not work. Select the post text and copy it instead."));
      return;
    }
    await saveShare(draft, "shared");
    setNotice(t("Post copied."));
  };
  const downloadReleaseReceipt = () => { if (!releaseReceipt) return; const url = URL.createObjectURL(new Blob([JSON.stringify(releaseReceipt, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `ghosttown-release-receipt-${orderId}.json`; link.click(); URL.revokeObjectURL(url); };

  if (loading) return <main className="mx-auto max-w-5xl p-8 text-center"><p className="font-black">{t("Opening your starting page…")}</p></main>;
  if (!configuration || !order) return <main className="mx-auto max-w-3xl p-8"><button onClick={onBack} className="font-black text-ghost-rust">{t("← Dashboard")}</button><p className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{error || t("Get Me Live is unavailable.")}</p></main>;
  const nextStep = () => { const index = STEPS.findIndex(([id]) => id === activeStep); chooseStep(STEPS[Math.min(index + 1, STEPS.length - 1)][0]); };
  const stepCard = (children: ReactNode) => <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-7">{children}</section>;

  return <main className="mx-auto max-w-[1500px] px-3 py-6 sm:px-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><button onClick={onBack} className="text-sm font-black text-ghost-rust">{t("← Dashboard")}</button><h1 className="mt-2 font-display text-3xl font-black text-ghost-ink">Get Me Live</h1><p className="mt-1 text-gray-700">{t("Approve a few choices. GhostTown handles the website work.")}</p></div><div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black" aria-live="polite">{t(saveState as WorkspaceCopyKey)}</div></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{error}</div>}{notice && <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900">{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,520px)_minmax(420px,1fr)]">
      <nav aria-label={t("Launch checklist")} className="h-fit rounded-2xl border border-black/10 bg-white p-3 lg:sticky lg:top-24"><p className="px-2 py-2 text-xs font-black uppercase tracking-[.18em] text-ghost-rust">{t("Your checklist")}</p>{STEPS.map(([id, label], index) => <button key={id} type="button" onClick={() => chooseStep(id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold ${activeStep === id ? "bg-ghost-ink text-white" : "hover:bg-gray-100"}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${completed[id] ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"}`}>{completed[id] ? "✓" : index + 1}</span><span>{t(label)}</span></button>)}</nav>
      <div className="min-w-0 space-y-4">
        {activeStep === "home" && stepCard(<><p className="text-xs font-black uppercase tracking-[.18em] text-ghost-rust">{t("Your starting point")}</p><h2 className="mt-2 text-3xl font-black">{t("Your page is already mostly done.")}</h2><p className="mt-3 text-gray-700">{t("We used your Sprint to fill in the offer, headline, price, and first page. Check the preview. Then make only the choices that matter.")}</p><div className="mt-5 rounded-xl bg-emerald-50 p-4"><strong>{t("About 75% ready")}</strong><p className="mt-1 text-sm text-gray-700">{t("Your changes save by themselves and update the preview.")}</p></div><button onClick={nextStep} className="mt-6 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Start with where my page lives")}</button></>)}
        {activeStep === "cloudflare" && stepCard(<><p className="text-xs font-black uppercase tracking-[.18em] text-ghost-rust">{t("First")}</p><h2 className="mt-2 text-3xl font-black">{t("Put the page in an account you own.")}</h2><p className="mt-3 text-gray-700">{t("Cloudflare will hold your website. You stay in control and can remove GhostTown access later.")}</p>{order.providerState.cloudflareConnected ? <><div className="mt-5 rounded-xl bg-emerald-50 p-4 font-black text-emerald-900">{t("Cloudflare is connected.")}</div>{accounts.length > 1 && <GmlField label={t("Choose your account")}><select value={accountId} onChange={event => setConfiguration({ ...configuration, domain: { ...configuration.domain, cloudflareAccountId: event.target.value } })} className="w-full rounded-lg border-2 border-gray-500 p-3">{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></GmlField>}<button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Choose my name")}</button></> : <div className="mt-5 grid gap-3"><button onClick={() => void connectCloudflare()} disabled={Boolean(busy)} className="rounded-xl bg-ghost-rust p-4 text-left font-black text-white">{t("I have Cloudflare")}</button><a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer" className="rounded-xl border-2 border-ghost-ink p-4 font-black">{t("I need a free account")} <span className="block pt-1 text-sm font-normal text-gray-600">{t("Create it, then come back and choose “I have Cloudflare.”")}</span></a></div>}</>)}
        {activeStep === "name" && stepCard(<><h2 className="text-3xl font-black">{t("Choose your business name.")}</h2><p className="mt-3 text-gray-700">{t("This is the name people see on your website. You can add your own web address after your website is live.")}</p><div className="mt-5"><GmlField label={t("Business name")}><input value={configuration.brand.businessName} maxLength={120} onChange={event => setConfiguration({ ...configuration, brand: { ...configuration.brand, businessName: event.target.value } })} /></GmlField></div>{nameSuggestions.length > 0 && <div className="mt-5"><p className="text-sm font-black">{t("Ideas from your Sprint")}</p><div className="mt-2 flex flex-wrap gap-2">{nameSuggestions.map(name => <button key={name} type="button" onClick={() => setConfiguration({ ...configuration, brand: { ...configuration.brand, businessName: name } })} className={`rounded-full border-2 px-4 py-2 text-sm font-black ${configuration.brand.businessName === name ? "border-ghost-rust bg-ghost-rust text-white" : "border-ghost-ink"}`}>{t("Use")} {name}</button>)}</div></div>}<button onClick={nextStep} className="mt-6 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Continue with this name")}</button></>)}
        {activeStep === "look" && stepCard(<><h2 className="text-3xl font-black">{t("Choose the look.")}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{LOOKS.map(look => <button key={look.label} onClick={() => setConfiguration({ ...configuration, brand: { ...configuration.brand, stylePreset: look.preset, primaryColor: look.color } })} className={`rounded-xl border-2 p-4 text-left ${selectedLook.label === look.label ? "border-ghost-rust bg-orange-50" : "border-gray-200"}`}><span className="mb-3 block h-3 w-20 rounded-full" style={{ backgroundColor: look.color }} /><strong>{t(look.label as WorkspaceCopyKey)}</strong><span className="block text-sm text-gray-600">{t(look.note as WorkspaceCopyKey)}</span></button>)}</div><h3 className="mt-7 text-xl font-black">{t("Choose a simple logo")}</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setConfiguration({ ...configuration, brand: { ...configuration.brand, logoAssetId: undefined } })} className={`rounded-lg border-2 px-4 py-3 font-black ${!configuration.brand.logoAssetId ? "border-ghost-rust bg-orange-50" : "border-ghost-ink"}`}>{t("Use my name only")}</button>{["forest","sunset","night"].map(choice => <button key={choice} onClick={() => void chooseLogo(choice)} className="rounded-lg border-2 border-ghost-ink px-4 py-3 font-black capitalize">{t(choice as WorkspaceCopyKey)}</button>)}</div>{selectedLogo && assetUrls[selectedLogo.assetId] && <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3"><img src={assetUrls[selectedLogo.assetId]} alt={t("Your selected logo")} className="h-16 w-32 rounded-lg bg-white object-contain p-2"/><span className="text-sm font-black">{t("Current logo")}</span></div>}<GmlField label={t("Or upload your logo")} hint={t("PNG, JPG, WebP, GIF, or SVG under 5 MB")}><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={event => void upload("logo", event.target.files?.[0])} /></GmlField><button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Add photos")}</button></>)}
        {activeStep === "photos" && stepCard(<><h2 className="text-3xl font-black">{t("Add photos.")}</h2><p className="mt-2 text-gray-700">{t("Your first photo is the main image. You can change the order.")}</p><GmlField label={t("Upload a photo")} hint={t("PNG, JPG, WebP, GIF, or SVG under 5 MB")}><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={event => void upload("photo", event.target.files?.[0])} /></GmlField><div className="mt-4 grid gap-2">{photos.map((photo, index) => <article key={photo.assetId} className="rounded-xl border p-3">{assetUrls[photo.assetId] && <img src={assetUrls[photo.assetId]} alt={photo.filename} className="mb-3 h-36 w-full rounded-lg object-cover"/>}<div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{photo.filename}</strong>{photo.assetId === configuration.brand.mainImageAssetId && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-black">{t("Main image")}</span>}</div><div className="flex gap-2"><button onClick={() => void movePhoto(photo.assetId, -1)} disabled={index === 0} className="rounded border px-2 py-1">↑</button><button onClick={() => void movePhoto(photo.assetId, 1)} disabled={index === photos.length - 1} className="rounded border px-2 py-1">↓</button><button onClick={() => void orderPhotos(photos.map(item => item.assetId), photo.assetId)} className="rounded border px-2 py-1 text-xs font-black">{t("Make main")}</button><button onClick={() => void removeAsset(photo.assetId)} className="text-xs font-black text-red-700">{t("Remove")}</button></div></div></article>)}</div><button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Set my offer")}</button></>)}
        {activeStep === "offer" && stepCard(<><h2 className="text-3xl font-black">{t("What are you offering?")}</h2><p className="mt-2 text-gray-700">{t("We filled this from your Sprint. Change only what you want.")}</p><div className="mt-5 grid gap-3"><GmlField label={t("Headline")}><input value={configuration.offer.headline || ""} onChange={event => setConfiguration({ ...configuration, offer: { ...configuration.offer, headline: event.target.value } })} /></GmlField><GmlField label={t("Offer")}><input value={configuration.offer.offer || ""} onChange={event => setConfiguration({ ...configuration, offer: { ...configuration.offer, offer: event.target.value } })} /></GmlField><GmlField label={t("Price")}><input value={configuration.offer.price || ""} onChange={event => setConfiguration({ ...configuration, offer: { ...configuration.offer, price: event.target.value } })} /></GmlField><GmlField label={t("Button text")}><input value={configuration.offer.ctaLabel || ""} onChange={event => setConfiguration({ ...configuration, offer: { ...configuration.offer, ctaLabel: event.target.value } })} /></GmlField></div><h3 className="mt-7 text-xl font-black">{t("What should visitors do?")}</h3><div className="mt-3 grid gap-2">{[{ id: "interest", label: t("Tell me they're interested"), note: t("Best way to start.") }, { id: "buy", label: t("Buy now"), note: t("Add Stripe when ready.") }, { id: "decide_later", label: t("Decide later"), note: t("Start with interest.") }].map(item => <button key={item.id} onClick={() => setConfiguration({ ...configuration, offer: { ...configuration.offer, intent: item.id as GetMeLiveConfiguration["offer"]["intent"] }, payments: { ...configuration.payments, enabled: item.id === "buy" } })} className={`rounded-xl border-2 p-4 text-left ${configuration.offer.intent === item.id ? "border-ghost-rust bg-orange-50" : "border-gray-200"}`}><strong>{item.label}</strong><span className="block text-sm text-gray-600">{item.note}</span></button>)}</div><button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Add a free PDF")}</button></>)}
        {activeStep === "magnet" && stepCard(<><h2 className="text-3xl font-black">{t("Give visitors a free PDF.")}</h2><p className="mt-2 text-gray-700">{t("This is optional. It can be a guide, checklist, or menu.")}</p>{leadMagnet ? <div className="mt-5 rounded-xl bg-emerald-50 p-4"><strong>{leadMagnet.filename}</strong><button onClick={() => void removeAsset(leadMagnet.assetId)} className="ml-4 text-sm font-black text-red-700">{t("Remove")}</button></div> : <GmlField label={t("Upload a PDF")} hint={t("Up to 10 MB")}><input type="file" accept="application/pdf" onChange={event => void upload("lead_magnet", event.target.files?.[0])} /></GmlField>}<button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{leadMagnet ? t("Continue") : t("Skip for now")}</button></>)}
        {activeStep === "contact" && stepCard(<><h2 className="text-3xl font-black">{t("Where should new leads go?")}</h2><div className="mt-5 grid gap-3"><GmlField label={t("Lead email")}><input type="email" value={configuration.contact.leadDestinationEmail} onChange={event => setConfiguration({ ...configuration, contact: { ...configuration.contact, leadDestinationEmail: event.target.value } })} /></GmlField><GmlField label={t("Public contact email")}><input type="email" value={configuration.contact.contactEmail} onChange={event => setConfiguration({ ...configuration, contact: { ...configuration.contact, contactEmail: event.target.value } })} /></GmlField></div><button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Check payments")}</button></>)}
        {activeStep === "payments" && stepCard(<><h2 className="text-3xl font-black">{t("Let people pay.")}</h2>{configuration.offer.intent === "buy" ? <><p className="mt-3 text-gray-700">{t("Connect Stripe so customers can buy from your page. If Stripe still needs details, you can go live now with an interest form.")}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void connectStripe()} className="rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Open Stripe")}</button><button onClick={() => void checkStripe()} className="rounded-xl border-2 border-ghost-ink px-5 py-3 font-black">{t("Check if payments are ready")}</button></div>{order.providerState.stripeConnected && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-black text-emerald-900">{t("Payments are ready.")}</p>}</> : <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-gray-700">{t("You chose an interest form. Stripe is not needed.")}</p>}<button onClick={nextStep} className="mt-5 rounded-xl bg-ghost-rust px-5 py-3 font-black text-white">{t("Review my page")}</button></>)}
        {activeStep === "review" && stepCard(<>{order.status === "live" ? <><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">{t("You are live")}</p><h2 className="mt-2 text-3xl font-black">{t("Your website is ready.")}</h2><p className="mt-3 font-bold text-gray-800">{t("We built your website and put it online. You can open it, share it, and start receiving leads.")}</p>{pendingRelease && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">{t("Your latest changes are still going online.")}</p>}{liveUrl && <div className="mt-5 grid gap-2 sm:grid-cols-2"><a href={liveUrl} target="_blank" rel="noreferrer" className="block rounded-xl border-2 border-ghost-rust bg-ghost-rust px-5 py-4 text-center font-black text-white">{t("Open My Website")}</a><button type="button" onClick={() => void copyText(liveUrl).then(copied => copied ? setNotice(t("Website link copied.")) : setError(t("Copy did not work. Select the link below instead.")))} className="rounded-xl border-2 border-ghost-ink px-5 py-4 font-black">{t("Copy Website Link")}</button><span className="break-all text-sm text-gray-700 sm:col-span-2">{liveUrl}</span></div>}<div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-gray-50 p-4"><strong>{activity.visits}</strong><span className="block text-sm">{t("Page visits")}</span></div><div className="rounded-xl bg-gray-50 p-4"><strong>{leads.length}</strong><span className="block text-sm">{t("People interested")}</span></div><div className="rounded-xl bg-gray-50 p-4"><strong>{activity.shares}</strong><span className="block text-sm">{t("Shares")}</span></div><div className="rounded-xl bg-gray-50 p-4"><strong>{activity.sales}</strong><span className="block text-sm">{t("Sales")}</span></div><div className="rounded-xl bg-gray-50 p-4 sm:col-span-2"><strong>{activity.revenueCents ? `$${(activity.revenueCents / 100).toFixed(2)}` : "—"}</strong><span className="block text-sm">{t("Sales value")}</span></div></div>{leads.length > 0 && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><h3 className="text-xl font-black">{t("Customer activity")}</h3><p className="mt-1 text-sm text-gray-700">{t("These people asked to hear from you.")}</p><div className="mt-3 grid gap-3">{[...leads].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5).map(lead => <article key={lead.leadId} className="rounded-lg bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{lead.name}</strong><a href={`mailto:${lead.email}`} className="block break-all text-sm font-bold text-ghost-rust underline">{lead.email}</a></div><time className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}</time></div>{lead.message && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{lead.message}</p>}</article>)}</div></div>}<button onClick={() => void loadSharePack()} className="mt-6 rounded-xl border-2 border-ghost-ink px-5 py-3 font-black">{t("Open Launch Share Pack")}</button>{shareDrafts.length > 0 && <section aria-label={t("Launch Share Pack drafts")} className="mt-5 grid gap-4"><h3 className="text-2xl font-black">{t("Three posts, ready to share")}</h3>{shareDrafts.map((draft, index) => <article key={draft.draftId} className="rounded-xl border p-4"><p className="text-xs font-black uppercase text-ghost-rust">{t("Post")} {index + 1}</p><textarea value={draft.editedText} onChange={event => setShareDrafts(current => current.map(item => item.draftId === draft.draftId ? { ...item, editedText: event.target.value } : item))} onBlur={() => void saveShare(draft, "save")} className="mt-2 min-h-36 w-full rounded-lg border-2 border-gray-500 p-3"/><div className="mt-2 flex gap-2"><button onClick={() => void copyText(draft.editedText).then(copied => copied ? setNotice(t("Post copied.")) : setError(t("Copy did not work. Select the post text and copy it instead.")))} className="rounded-lg border px-3 py-2 font-black">{t("Copy")}</button><button onClick={() => void share(draft)} className="rounded-lg bg-ghost-rust px-3 py-2 font-black text-white">{t("Share")}</button></div></article>)}{milestone && <article className="rounded-xl bg-emerald-50 p-4"><h4 className="font-black">{t("A small win worth sharing")}</h4><p className="mt-2 whitespace-pre-wrap text-sm">{milestone.text}</p></article>}</section>}{!order.customDomainState && <div className="mt-7 rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-gray-600">{t("Optional")}</p><h3 className="mt-1 text-xl font-black">{t("Want your own website address?")}</h3><p className="mt-2 text-sm font-bold text-gray-700">{t("Your website is already live. If you want an address like")} <span className="whitespace-nowrap">yourbusiness.com</span>{t(", you can buy one directly from Cloudflare. You own it.")}</p>{ownedLegacyDomain && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{t("You already own")} {ownedLegacyDomain}  {t("— connect it.")}</p>}{addressIdeas.length > 0 && <div className="mt-4"><p className="text-sm font-black">{t("Ideas to try — Cloudflare will confirm what is available and show the current price.")}</p><ul className="mt-2 grid gap-2">{addressIdeas.map(idea => <li key={idea} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"><span className="break-all font-bold">{idea}</span><button type="button" onClick={() => void copyText(idea).then(copied => copied ? setNotice(t("addressCopied").replace("{address}", idea)) : setError(t("Copy did not work. Select the address instead.")))} className="rounded-lg border px-3 py-1 text-sm font-black">{t("Copy")}</button></li>)}</ul></div>}<a href={cloudflareRegistrarUrl(accountId)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl border-2 border-ghost-ink px-5 py-3 font-black">{t("Find My Website Address")}</a><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void loadDomainZones()} disabled={busy === "zones"} className="rounded-xl bg-ghost-ink px-5 py-3 font-black text-white disabled:opacity-40">{busy === "zones" ? t("Checking…") : t("I bought it — connect it")}</button></div>{domainZones && (domainZones.length === 0 ? <p className="mt-3 text-sm text-gray-700">{t("We did not find a domain in your Cloudflare account yet. If you just bought it, give Cloudflare a few minutes, then try again.")}</p> : <ul className="mt-3 grid gap-2">{domainZones.map(zone => <li key={zone.zoneId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><span><strong className="break-all">{zone.name}</strong>{!zone.eligible && <span className="block text-sm text-gray-700">{zone.reason}</span>}</span>{zone.eligible ? <button type="button" onClick={() => void connectDomain(zone.zoneId)} disabled={Boolean(busy)} className="rounded-lg bg-ghost-rust px-4 py-2 font-black text-white disabled:opacity-40">{t("Connect")} {zone.name}</button> : <a href="#connect-guide" className="text-sm font-black underline">{t("Show me how to connect it")}</a>}</li>)}</ul>)}{domainGuide}</div>}{order.customDomainState?.status === "connecting" && <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-5"><h3 className="text-xl font-black">{t("Connecting")} {order.customDomainState.name}</h3><p className="mt-2 text-sm font-semibold text-blue-900">{t("Cloudflare is setting up your address. This can take a few minutes; you can close this page.")}</p><p className="mt-2 text-sm text-gray-700">{t("Your website stays open at")} {order.hosting?.pagesUrl}  {t("the whole time.")}</p></div>}{order.customDomainState?.status === "active" && <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="text-xl font-black">{t("Your website is now at")} {order.customDomainState.name}</h3><a href={`https://${order.customDomainState.name}`} target="_blank" rel="noreferrer" className="mt-3 inline-block font-black text-ghost-rust underline">{t("Open")} {order.customDomainState.name}</a></div>}{order.customDomainState?.status === "failed" && <div className="mt-7 rounded-xl border border-amber-300 bg-amber-50 p-5"><h3 className="text-xl font-black">{order.customDomainState.name}  {t("is not connected yet")}</h3><p className="mt-2 text-sm text-gray-800">{order.customDomainState.lastError || t("Cloudflare could not finish connecting this address.")}  {t("Your website is still open at")} {order.hosting?.pagesUrl}.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void connectDomain(order.customDomainState!.zoneId, order.customDomainState!.name)} disabled={Boolean(busy)} className="rounded-lg bg-ghost-rust px-4 py-2 font-black text-white disabled:opacity-40">{t("Try again")}</button><button type="button" onClick={() => void removeDomain()} disabled={Boolean(busy)} className="rounded-lg border px-4 py-2 font-black disabled:opacity-40">{t("Remove this address")}</button></div>{domainGuide}</div>}{emailDomain && <div className="mt-7 rounded-xl border p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-gray-600">{t("Optional")}</p><h3 className="mt-1 text-xl font-black">{t("Want a matching business email?")}</h3><p className="mt-1 text-sm text-gray-700">{t("Example:")} <strong>hello@{emailDomain}</strong>{t(". Messages to it arrive in your lead email inbox.")}</p><GmlField label={t("Choose the first part")}><div className="flex items-center gap-2"><input value={configuration.contact.businessEmailLocalPart || "hello"} onChange={event => setConfiguration({ ...configuration, contact: { ...configuration.contact, businessEmailLocalPart: event.target.value } })} /><span className="font-bold">@{emailDomain}</span></div></GmlField>{order.providerState.businessEmailVerified ? <p className="mt-3 font-black text-emerald-800">{t("Your business email is ready.")}</p> : <button onClick={() => void setupEmail()} disabled={Boolean(busy)} className="mt-3 rounded-lg border-2 border-ghost-ink px-4 py-2 font-black disabled:opacity-40">{busy === "email" ? t("Checking…") : emailWaiting ? t("I confirmed it — check again") : t("Set up this email")}</button>}</div>}<div className="mt-7 rounded-xl bg-ghost-ink p-5 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-ghost-gold">{t("What to do next")}</p><h3 className="mt-1 text-xl font-black">{t("Keep working from real customer response.")}</h3><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div className="rounded-lg bg-white/10 p-3"><strong>{t("1. Follow up")}</strong><span className="mt-1 block text-white/75">{t("Reply to people who raised their hand.")}</span></div><div className="rounded-lg bg-white/10 p-3"><strong>{t("2. Share the page")}</strong><span className="mt-1 block text-white/75">{t("Use the Launch Share Pack to bring in more visitors.")}</span></div><div className="rounded-lg bg-white/10 p-3"><strong>{t("3. Watch what happens")}</strong><span className="mt-1 block text-white/75">{t("Come back here for visits, interest and sales.")}</span></div></div></div><div className="mt-7 rounded-xl border-2 border-emerald-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">{t("Release receipt")}</p><h3 className="mt-1 text-xl font-black">{t("Proof your page was published and checked.")}</h3></div>{releaseReceipt && <span className={`rounded-full px-3 py-1 text-xs font-black ${receiptChecked ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{receiptChecked ? t("Checked") : t("Needs attention")}</span>}</div>{releaseReceipt ? <><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Live page")}</strong><span className="block break-all text-gray-700">{releaseReceipt.pagesUrl}</span></div><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Published")}</strong><span className="block text-gray-700">{new Date(releaseReceipt.publishedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}</span></div><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Page opened at launch")}</strong><span className="block text-gray-700">{releaseReceipt.checks.customerPageHttpStatus === 200 ? t("yesHttp").replace("{status}", String(releaseReceipt.checks.customerPageHttpStatus)) : `No · HTTP ${releaseReceipt.checks.customerPageHttpStatus || "—"}`}</span></div><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Lead form")}</strong><span className="block text-gray-700">{releaseReceipt.checks.leadCaptureConfigured ? t("Connected") : t("Needs attention")}</span></div><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Activity tracking")}</strong><span className="block text-gray-700">{releaseReceipt.checks.activityTrackingConfigured ? t("Connected") : t("Needs attention")}</span></div><div className="rounded-lg bg-gray-50 p-3"><strong>{t("Customer action")}</strong><span className="block text-gray-700">{releaseReceipt.checks.paymentMode === "connected_checkout" ? t("Payments ready") : releaseReceipt.checks.paymentMode === "lead_until_stripe_ready" ? t("Interest form until Stripe is ready") : t("Interest form")}</span></div></div>{releaseReceipt.backfilled && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("This page went live before GhostTown kept launch records, so this receipt was rebuilt from your live site on")} {new Date(releaseReceipt.verifiedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}.</p>}{siteHealth && <div className="mt-4 rounded-lg border p-3 text-sm"><strong>{t("Right now")}</strong><span className="block text-gray-700">{siteHealth.healthy ? t("Your page is open and its lead form and activity tracking are connected.") : t("Your page needs attention.")} {t("Checked")} {new Date(siteHealth.checkedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}.</span></div>}<details className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><summary className="cursor-pointer font-black">{t("Technical details")}</summary><div className="mt-2 break-all text-gray-700">{t("Cloudflare project:")} {releaseReceipt.pagesProjectName}<br/>{t("Release:")} {releaseReceipt.releaseId}<br/>{t("Deployment:")} {releaseReceipt.deploymentId}<br/>{t("Build:")} {releaseReceipt.buildId}<br/>{t("Verified:")} {new Date(releaseReceipt.verifiedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}</div></details><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void checkSiteHealth()} className="rounded-lg border-2 border-ghost-ink px-4 py-2 font-black">{t("Check again")}</button><button onClick={downloadReleaseReceipt} className="rounded-lg bg-ghost-ink px-4 py-2 font-black text-white">{t("Download receipt")}</button></div></> : <button onClick={() => void loadReleaseReceipt()} className="mt-4 rounded-lg bg-ghost-ink px-4 py-2 font-black text-white">{t("Check release receipt")}</button>}</div></> : <><h2 className="text-3xl font-black">{t("Review before you go live.")}</h2><div className="mt-5 grid gap-2">{STEPS.slice(1, 9).map(([id, label]) => <button key={id} onClick={() => chooseStep(id)} className="flex items-center justify-between rounded-xl border p-3 text-left"><span className="font-bold">{t(label)}</span><span className={completed[id] ? "text-emerald-700" : "text-amber-700"}>{completed[id] ? t("Ready") : t("Check this")}</span></button>)}</div>{configuration.offer.intent === "buy" && <p className="mt-5 text-sm text-gray-700">{t("Stripe charges its normal fees only when a customer pays.")}</p>}{configuration.offer.intent === "buy" && !order.providerState.stripeConnected && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-semibold">{t("Stripe is not finished. Your page will use the interest form until payments are ready.")}</p>}<button onClick={goLive} disabled={!requiredReady || Boolean(busy) || Boolean(pendingRelease) || saveState !== "Saved"} className="mt-6 w-full rounded-xl bg-ghost-rust px-6 py-4 text-lg font-black text-white disabled:opacity-40">{busy === "publish" || pendingRelease ? t("Going live…") : t("Go Live")}</button>{!requiredReady && <p className="mt-2 text-sm text-gray-600">{t("Finish the items marked “Check this” first.")}</p>}</>}</>)}
      </div>
      <aside id="gml-preview" className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-ghost-rust">{t("Your exact preview")}</p><p className="text-sm text-gray-600">{t("It updates after each saved change.")}</p></div><a href="#gml-preview-frame" className="rounded-lg border px-3 py-2 text-sm font-black lg:hidden">{t("View preview")}</a></div>{previewUrl ? <iframe id="gml-preview-frame" title={t("Your page preview")} src={previewUrl} className="h-[70vh] min-h-[620px] w-full rounded-2xl border-2 border-ghost-ink bg-white shadow-lg lg:h-full"/> : <div className="grid h-80 place-items-center rounded-2xl border bg-white"><p className="font-bold">{t("Preparing your preview…")}</p></div>}</aside>
    </div>
  </main>;
}
