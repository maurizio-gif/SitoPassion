/**
 * «Inviaci il tuo CV»: le posizioni aperte, i formati e l'endpoint.
 *
 * Vive qui e non dentro `CurriculumForm.astro` per lo stesso motivo di
 * `prova.ts`: le posizioni le elenca il form, ma le riconosce anche il CRM
 * (`POSIZIONE` in `lib/formato.ts` di APP-PASSION e il controllo della tabella
 * `candidature`). Se ne aggiungi una, aggiungila in tutti e tre i posti.
 *
 * A differenza degli altri form il sito parla direttamente con il CRM, senza
 * passare da n8n: un file da 10 MB in un webhook n8n e' una scomodita' in piu'
 * e non serve. L'endpoint e' una Edge Function di Supabase pubblica (nessuna
 * chiave nel browser): controlla tutto un'altra volta e limita gli invii.
 */

export const ENDPOINT =
  'https://tihpfycrkjtuppbmcqew.supabase.co/functions/v1/crm-candidatura';

/** Le posizioni aperte. `valore` e' quello che riconosce il CRM. */
export const POSIZIONI = [
  { valore: 'istruttore_fitness', etichetta: 'Istruttore fitness' },
  { valore: 'istruttore_sala_pesi', etichetta: 'Istruttore sala pesi' },
  { valore: 'receptionist', etichetta: 'Receptionist' },
] as const;

/** Il peso massimo del curriculum, in MB (10 anche lato server e su Storage). */
export const MAX_MB = 10;

/** I formati accettati: JPEG, DNG, PDF, Word. */
export const ESTENSIONI = ['jpg', 'jpeg', 'dng', 'pdf', 'doc', 'docx'] as const;
export const ACCEPT = ESTENSIONI.map((e) => `.${e}`).join(',');
