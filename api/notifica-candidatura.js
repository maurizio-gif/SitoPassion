// Le email di una nuova candidatura, mandate con SendGrid.
//
// Non e' una pagina del sito: e' una Vercel Function (il sito e' statico e non
// ha altro codice server). La chiama la Edge Function `crm-candidatura` di
// Supabase (repo APP-PASSION) appena la candidatura e' salvata nel CRM, con
// l'intestazione `x-segreto`. Manda due email:
//
//   1. a marco@passionfitness.it: chi si e' candidato, per cosa, come contattarlo,
//      e il link alla sezione Curriculum del CRM (il file non e' allegato: sono
//      dati personali e stanno nell'archivio protetto del CRM);
//   2. al candidato: la conferma di ricezione.
//
// Variabili d'ambiente (Vercel, progetto sito-passion, Production):
//   SENDGRID_API_KEY        chiave SendGrid con il solo permesso «Mail Send»
//   SENDGRID_FROM           mittente verificato in SendGrid (anche "Nome <a@b.it>")
//   CANDIDATURE_SEGRETO     stringa lunga e casuale, uguale al secret con lo
//                           stesso nome nelle Edge Functions di Supabase
//
// Chi ha il segreto puo' far spedire email, quindi il confronto e' a tempo
// costante e ogni campo passa da un controllo prima di finire in una mail.

import { timingSafeEqual } from 'node:crypto';

const DESTINATARIO = 'marco@passionfitness.it';
const RISPOSTE = 'info@passionfitness.it';
const LINK_CRM = 'https://crm.passionfitness.it/dashboard/curriculum';

const POSIZIONI = {
  istruttore_fitness: 'Istruttore fitness',
  istruttore_sala_pesi: 'Istruttore sala pesi',
  receptionist: 'Receptionist',
};

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Nessun ritorno a capo: finirebbero nell'oggetto o nei nomi delle email.
const riga = (v, max = 120) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

function daFormato(mittente) {
  const m = /^\s*(.*?)\s*<([^<>\s]+)>\s*$/.exec(mittente);
  return m ? { email: m[2], name: m[1].replace(/^"|"$/g, '') || 'Passion Fitness' } : { email: mittente.trim(), name: 'Passion Fitness' };
}

function segretoValido(ricevuto, atteso) {
  const a = Buffer.from(String(ricevuto ?? ''));
  const b = Buffer.from(String(atteso ?? ''));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

// ── La conferma al candidato ────────────────────────────────────────────────
// Stessa grafica dell'email di invito del CRM e del sito: testata nera col
// logo, barra rossa, sfondo rosa, titolo in Impact (Anton non e' affidabile
// nei client di posta), pulsante rosso. Tabelle e stili inline, come vuole la
// posta; le immagini stanno sul sito.
const SITO = 'https://www.passionfitness.it';
const PASSI = [
  ['Abbiamo il tuo CV', 'Il tuo curriculum è arrivato e resta nel nostro archivio riservato.'],
  ['Lo valutiamo', 'Chi si occupa della selezione lo legge e lo confronta con le posizioni aperte.'],
  ['Ti contattiamo', 'Se il tuo profilo è in linea ti chiamiamo o ti scriviamo ai recapiti che ci hai lasciato.'],
];
const FONT = 'font-family: Helvetica, Arial, sans-serif;';
const IMPACT = "font-family:Impact,'Arial Black',Helvetica,Arial,sans-serif;";

function testoConferma(nome, posizione) {
  return (
    `Ciao ${nome},\n\ngrazie per esserti candidato/a come ${posizione} in Passion Fitness Tuscolana: ` +
    `abbiamo ricevuto il tuo curriculum.\n\nCosa succede adesso\n` +
    PASSI.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join('\n') +
    `\n\nHai bisogno di scriverci? Rispondi a questa email o scrivi a ${RISPOSTE}.\n\nA presto,\nIl team di Passion Fitness\n\n` +
    `Passion Fitness · Via Flavio Stilicone 238, 00175 Roma · 06 767 4709\n` +
    `I tuoi dati sono trattati da Tuscolana SSD Arl per valutare la tua candidatura: ${SITO}/informativa-privacy/\n`
  );
}

function htmlConferma(nome, posizione) {
  const passi = PASSI.map(
    ([t, d], i) =>
      `<tr>
        <td width="44" valign="top" style="padding:0 0 18px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="34" height="34" style="width:34px;height:34px;border-radius:17px;background-color:#e3032d;${FONT}font-size:15px;font-weight:700;color:#ffffff;line-height:34px;">${i + 1}</td></tr></table></td>
        <td valign="top" style="padding:0 0 18px;${FONT}font-size:15px;line-height:1.5;color:#6b6260;"><strong style="color:#1b1b1b;font-size:16px;">${esc(t)}</strong><br>${esc(d)}</td>
      </tr>`,
  ).join('');

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Abbiamo ricevuto la tua candidatura</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #feeded; }
  a.cta:hover { background-color: #b50224 !important; }
  @media only screen and (max-width: 600px) {
    .contenitore { width: 100% !important; }
    .pad { padding: 32px 24px !important; }
    .titolo { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#feeded;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Grazie ${esc(nome)}, abbiamo ricevuto il tuo curriculum per la posizione di ${esc(posizione)}. Ecco cosa succede adesso.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#feeded;">
<tr><td align="center" style="padding:40px 16px;">

  <table role="presentation" class="contenitore" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #f0d6d6;border-radius:16px;overflow:hidden;">

    <tr><td align="center" style="background-color:#000000;padding:32px 40px 28px;">
      <a href="${SITO}/" target="_blank"><img src="${SITO}/images/logo-passionfitness.png" width="170" alt="Passion Fitness" style="display:block;width:170px;max-width:60%;height:auto;"></a>
      <p style="margin:12px 0 0;${FONT}font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b8b0af;">Lavora con noi &middot; Tuscolana &middot; Roma</p>
    </td></tr>
    <tr><td style="height:6px;line-height:6px;font-size:0;background-color:#e3032d;">&nbsp;</td></tr>

    <tr><td style="padding:0;font-size:0;line-height:0;"><img src="${SITO}/images/nuove/fitness3-scaled.jpg" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;"></td></tr>

    <tr><td class="pad" style="padding:40px 48px 8px;">
      <p style="margin:0 0 8px;${FONT}font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e3032d;text-align:center;">Candidatura ricevuta</p>
      <h1 class="titolo" style="margin:0 0 20px;${IMPACT}font-size:38px;font-weight:normal;line-height:1.05;text-transform:uppercase;color:#1b1b1b;text-align:center;">Grazie, ${esc(nome)}!</h1>
      <p style="margin:0 0 22px;${FONT}font-size:16px;line-height:1.6;color:#6b6260;text-align:center;">Abbiamo ricevuto il tuo curriculum. Ci fa piacere che tu voglia entrare nella squadra di Passion Fitness.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;background-color:#feeded;border-radius:12px;">
        <tr><td align="center" style="padding:18px 20px;">
          <span style="${FONT}font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6b6260;">La posizione per cui ti sei candidato/a</span><br>
          <span style="${IMPACT}font-size:24px;text-transform:uppercase;color:#e3032d;line-height:1.3;">${esc(posizione)}</span>
        </td></tr>
      </table>

      <p style="margin:0 0 18px;${FONT}font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b1b1b;">Cosa succede adesso</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${passi}</table>
    </td></tr>

    <tr><td align="center" style="padding:8px 48px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="border-radius:12px;background-color:#e3032d;">
          <a href="${SITO}/" class="cta" target="_blank" style="display:inline-block;padding:16px 36px;${FONT}font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:12px;background-color:#e3032d;">Scopri Passion Fitness &rarr;</a>
        </td>
      </tr></table>
      <p style="margin:24px 0 0;${FONT}font-size:14px;line-height:1.6;color:#6b6260;">Vuoi aggiungere qualcosa? Rispondi a questa email o scrivi a <a href="mailto:${RISPOSTE}" style="color:#e3032d;">${RISPOSTE}</a>.</p>
    </td></tr>

    <tr><td align="center" style="background-color:#000000;padding:28px 40px;">
      <p style="margin:0 0 6px;${FONT}font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;">Passion Fitness Tuscolana</p>
      <p style="margin:0;${FONT}font-size:12px;line-height:1.7;color:#b8b0af;">Via Flavio Stilicone 238, 00175 Roma<br><a href="tel:+39067674709" style="color:#b8b0af;text-decoration:none;">06 767 4709</a> &middot; <a href="mailto:${RISPOSTE}" style="color:#b8b0af;text-decoration:none;">${RISPOSTE}</a></p>
    </td></tr>
  </table>

  <p style="max-width:520px;margin:20px auto 0;${FONT}font-size:11px;line-height:1.6;color:#6b6260;text-align:center;">Ricevi questa email perché hai inviato la tua candidatura dal nostro sito. I tuoi dati sono trattati da Tuscolana SSD Arl per valutarla: <a href="${SITO}/informativa-privacy/" style="color:#6b6260;text-decoration:underline;">informativa privacy</a>.</p>

</td></tr>
</table>
</body>
</html>`;
}

async function invia(chiave, messaggio) {
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(messaggio),
  });
  if (!r.ok) throw new Error(`SendGrid ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ errore: 'Solo POST' });

  const { SENDGRID_API_KEY, SENDGRID_FROM, CANDIDATURE_SEGRETO } = process.env;
  if (!SENDGRID_API_KEY || !SENDGRID_FROM || !CANDIDATURE_SEGRETO) {
    return res.status(500).json({ errore: 'Configurazione email incompleta' });
  }
  if (!segretoValido(req.headers['x-segreto'], CANDIDATURE_SEGRETO)) {
    return res.status(401).json({ errore: 'Non autorizzato' });
  }

  const c = req.body && typeof req.body === 'object' ? req.body : {};
  const nome = riga(c.nome, 80);
  const cognome = riga(c.cognome, 80);
  const email = riga(c.email, 254);
  const telefono = riga(c.telefono, 20);
  const posizione = POSIZIONI[c.posizione];
  if (!nome || !cognome || !posizione || !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ errore: 'Dati non validi' });
  }

  const da = daFormato(SENDGRID_FROM);
  const esiti = await Promise.allSettled([
    // 1. La notifica interna.
    invia(SENDGRID_API_KEY, {
      from: da,
      reply_to: { email, name: `${nome} ${cognome}` },
      personalizations: [{ to: [{ email: DESTINATARIO }] }],
      subject: `Nuova candidatura: ${nome} ${cognome} — ${posizione}`,
      content: [
        {
          type: 'text/plain',
          value:
            `Nuova candidatura dal sito.\n\nPosizione: ${posizione}\nNome: ${nome} ${cognome}\n` +
            `Email: ${email}\nCellulare: ${telefono}\n\nIl curriculum e le risposte sono nel CRM:\n${LINK_CRM}\n`,
        },
        {
          type: 'text/html',
          value:
            `<p>Nuova candidatura dal sito.</p>` +
            `<p><strong>Posizione:</strong> ${esc(posizione)}<br><strong>Nome:</strong> ${esc(nome)} ${esc(cognome)}<br>` +
            `<strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a><br>` +
            `<strong>Cellulare:</strong> <a href="tel:${esc(telefono)}">${esc(telefono)}</a></p>` +
            `<p><a href="${LINK_CRM}">Apri il curriculum nel CRM →</a></p>`,
        },
      ],
    }),
    // 2. La conferma al candidato.
    invia(SENDGRID_API_KEY, {
      from: da,
      reply_to: { email: RISPOSTE },
      personalizations: [{ to: [{ email, name: `${nome} ${cognome}` }] }],
      subject: 'Abbiamo ricevuto la tua candidatura — Passion Fitness',
      content: [
        { type: 'text/plain', value: testoConferma(nome, posizione) },
        { type: 'text/html', value: htmlConferma(nome, posizione) },
      ],
    }),
  ]);

  const falliti = esiti.filter((e) => e.status === 'rejected');
  for (const f of falliti) console.error('notifica-candidatura:', f.reason?.message ?? f.reason);
  // 502 se manca anche una sola email: il chiamante lo registra, la candidatura resta comunque salvata.
  return falliti.length ? res.status(502).json({ ok: false, falliti: falliti.length }) : res.status(200).json({ ok: true });
}
