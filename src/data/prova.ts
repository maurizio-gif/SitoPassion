/**
 * La Prova Passion: l'offerta, il codice e i passi per attivarla.
 *
 * Vive qui e non dentro `ProvaModal.astro` perche' gli stessi numeri li dicono
 * in tre posti diversi — il modal, le email e i WhatsApp che manda n8n, e
 * domani la pagina /prova-passion-fitness rifatta col design system — e il
 * giorno in cui il prezzo cambia non devono poter divergere.
 *
 * I due indirizzi dei webhook sono l'unica cosa che il browser sa di n8n: il
 * sito non parla mai con PerfectGym ne' con Airtable, quindi nel browser non
 * finisce nessuna chiave.
 */

/** Il portale dove si incolla il codice: la registrazione, non la home. */
export const REGISTRAZIONE = 'https://passion.perfectgym.com/clientportal2/#/Registration';

/** Il codice promozionale della prova. Lo conosce anche n8n, che lo rimanda per email e WhatsApp. */
export const CODICE = 'PROVA7';

/**
 * Gli orari in cui si entra con la Prova Passion e con il Guest Pass: non sono
 * quelli dell'abbonamento (5:00-24:00), sono piu' stretti, e vanno detti
 * prima dell'attivazione. Una sola fonte per i due pass.
 */
export const ORARI_PASS = 'Lun–ven 6:20–20:30 · sab e dom 8:30–17:30';

export const PROVA = {
  codice: CODICE,
  prezzo: 20,
  giorni: 7,
  /* Cosa comprende, nell'ordine in cui conviene leggerlo: prima sala e corsi,
     poi quella contingentata — una lezione, non tutte, e dirlo qui evita la
     delusione al desk. Niente "senza limiti di orario": il pass ha i suoi
     orari (ORARI_PASS). */
  incluso: [
    'Sala pesi',
    'Corsi fitness Energy e Rebalance',
    '1 lezione di Pilates Reformer in Small Group',
    '1 lezione di Formula 8',
  ],
  orari: ORARI_PASS,
} as const;

/** I passi dell'attivazione sul portale: gli stessi dell'email e del WhatsApp. */
export const PASSI_ATTIVAZIONE = [
  'Accedi al portale e, se non hai un account, <strong>registrati</strong>',
  'Clicca su <strong>Abbonamenti</strong>',
  `Clicca su <strong>Ho un codice promozionale</strong> e inserisci <strong>${CODICE}</strong>`,
  'Seleziona la <strong>Prova Passion</strong> che compare dopo il codice',
  'Clicca su <strong>Avanti</strong> e scegli il giorno di inizio',
  `Nel riepilogo trovi il pagamento di <strong>${PROVA.prezzo} €</strong>`,
  'Accetta il regolamento, firma e clicca su <strong>Attiva Abbonamento</strong>',
  'Inserisci il metodo di pagamento: carta o conto corrente',
];

/** I due webhook n8n: la verifica mentre la persona compila, il lead alla fine. */
export const WEBHOOK = {
  verifica: 'https://automazione.n8ndevelop.it/webhook/passion-verifica-iscritto',
  lead: 'https://automazione.n8ndevelop.it/webhook/passion-prova-compilata',
};
