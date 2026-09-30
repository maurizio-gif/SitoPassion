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
        {
          type: 'text/plain',
          value:
            `Ciao ${nome},\n\ngrazie per la tua candidatura come ${posizione} in Passion Fitness Tuscolana: ` +
            `abbiamo ricevuto il tuo curriculum.\n\nSe il tuo profilo è in linea con la posizione ti contatteremo ai recapiti ` +
            `che ci hai lasciato.\n\nA presto,\nPassion Fitness\n\n` +
            `I tuoi dati sono trattati da Tuscolana SSD Arl per valutare la tua candidatura: https://www.passionfitness.it/informativa-privacy/\n`,
        },
        {
          type: 'text/html',
          value:
            `<p>Ciao ${esc(nome)},</p>` +
            `<p>grazie per la tua candidatura come <strong>${esc(posizione)}</strong> in Passion Fitness Tuscolana: abbiamo ricevuto il tuo curriculum.</p>` +
            `<p>Se il tuo profilo è in linea con la posizione ti contatteremo ai recapiti che ci hai lasciato.</p>` +
            `<p>A presto,<br>Passion Fitness</p>` +
            `<p style="color:#666;font-size:12px">I tuoi dati sono trattati da Tuscolana SSD Arl per valutare la tua candidatura. ` +
            `<a href="https://www.passionfitness.it/informativa-privacy/">Informativa privacy</a></p>`,
        },
      ],
    }),
  ]);

  const falliti = esiti.filter((e) => e.status === 'rejected');
  for (const f of falliti) console.error('notifica-candidatura:', f.reason?.message ?? f.reason);
  // 502 se manca anche una sola email: il chiamante lo registra, la candidatura resta comunque salvata.
  return falliti.length ? res.status(502).json({ ok: false, falliti: falliti.length }) : res.status(200).json({ ok: true });
}
