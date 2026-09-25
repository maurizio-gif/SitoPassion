/**
 * Presenta un Amico: il Guest Pass, il voucher e i due webhook n8n.
 *
 * Vive qui e non dentro `ReferralForm.astro` per lo stesso motivo di `prova.ts`:
 * gli stessi numeri li dicono il form, l'email e il WhatsApp che manda n8n, e
 * il giorno in cui cambiano non devono poter divergere.
 *
 * Il sito non parla mai con PerfectGym ne' con Airtable: manda due POST a n8n,
 * la verifica mentre la persona compila e l'invito completo alla fine. Nessuna
 * chiave nel browser, nessuna route server, il sito resta statico.
 */

export const GUEST_PASS = {
  giorni: 10,
  /* Non e' un pass gratuito: si paga per intero, 20€. L'unica leva
     promozionale e' il codice, che salta la fila della vendita normale. */
  prezzo: 20,
  codice: 'FREE10',
  voucher: 50,
  incluso: ['Sala Pesi', 'Corsi Fitness (una prenotazione alla volta)', '1 Lezione di Reformer'],
  /* Stessa frase che usa Spoki nel messaggio WhatsApp: le due condizioni
     restano identiche sui due canali apposta. */
  condizioni:
    'Pass utilizzabile una sola volta e solo da chi non ha avuto Pass o Abbonamenti presso Passion Fitness dal 2020 in poi. Promo non valida per abbonamenti Fitprime e Wellhub.',
} as const;

/** Il portale dove si incolla il codice promozionale. */
export const REGISTRAZIONE = 'https://passion.perfectgym.com/clientportal2/#/Registration';

/**
 * I due webhook: la verifica di chi invita e l'invio con gli amici.
 *
 * `verifica` e' lo stesso endpoint della Prova Passion (`passion-verifica-iscritto`):
 * risponde con `stato: 'iscritto'` quando l'email e' di un socio, che per la Prova
 * blocca l'accesso e qui invece lo apre — e' la stessa domanda ("questa persona
 * e' socia?"), letta al contrario.
 */
export const WEBHOOK = {
  verifica: 'https://automazione.n8ndevelop.it/webhook/passion-verifica-iscritto',
  invio: 'https://automazione.n8ndevelop.it/webhook/passion-referral',
};

/** Quanti amici si possono invitare in un solo invio. */
export const MAX_AMICI = 3;
