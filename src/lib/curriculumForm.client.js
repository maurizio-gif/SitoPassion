// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica di «Inviaci il tuo CV». Un modulo solo, tutti i campi obbligatori:
// nome, cognome, email, cellulare, data di nascita, posizione, curriculum.
//
// Il server ricontrolla tutto (e riconosce il file dai primi byte): qui si
// controlla prima dell'invio per non far aspettare una persona che ha dimenticato
// un campo o allegato un file troppo grande.

import { ENDPOINT, MAX_MB, ESTENSIONI } from '../data/curriculum';
import { validaTelefono } from '../data/prefissi';

export function initCurriculumForm(root) {
  var MAX_BYTE = MAX_MB * 1024 * 1024;

  var ERR = {
    nome: 'Serve il nome.',
    cognome: 'Serve il cognome.',
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nascita: 'Inserisci la tua data di nascita.',
    nascitaNonValida: 'La data di nascita non è valida.',
    nascitaGiovane: 'Per candidarti serve avere almeno 16 anni.',
    posizione: 'Scegli la posizione per cui ti candidi.',
    file: 'Allega il tuo curriculum.',
    formato: 'Formato non valido: allega un file JPEG, DNG, PDF o Word.',
    peso: 'Il file è troppo grande: il massimo è ' + MAX_MB + ' MB.',
    privacy: 'Serve aver letto l’informativa privacy per inviare la candidatura.',
    rete: 'Non siamo riusciti a inviare la candidatura. Controlla la connessione e riprova.',
  };

  function q(sel) {
    return root.querySelector(sel);
  }

  var form = q('[data-cv-form]');
  var esito = q('[data-cv-esito]');
  var errore = q('[data-cv-errore]');
  var btn = q('[data-cv-invia]');
  var campoFile = q('#cv-file');
  var nomeFile = q('[data-cv-nomefile]');

  var campi = {
    nome: q('#cv-nome'),
    cognome: q('#cv-cognome'),
    email: q('#cv-email'),
    cellulare: q('#cv-cellulare'),
    prefisso: q('#cv-cellulare-prefisso'),
    nascita: q('#cv-nascita'),
    posizione: q('#cv-posizione'),
    privacy: q('#cv-privacy'),
    trappola: q('#cv-sito-web'),
  };

  // L'ultima data di nascita ammessa: chi compie 16 anni oggi. Serve al
  // selettore data; il controllo vero e' in `verifica()` e sul server.
  var oggi = new Date();
  var limite = new Date(oggi.getFullYear() - 16, oggi.getMonth(), oggi.getDate());
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  campi.nascita.max = iso(limite);
  campi.nascita.min = iso(new Date(oggi.getFullYear() - 100, oggi.getMonth(), oggi.getDate()));

  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }
  function estensione(nome) {
    var p = String(nome).split('.');
    return p.length > 1 ? p.pop().toLowerCase() : '';
  }

  function mostraErrore(testo) {
    errore.textContent = testo;
    errore.hidden = false;
  }
  function pulisci() {
    errore.textContent = '';
    errore.hidden = true;
    root.querySelectorAll('.cv__input--errore').forEach(function (c) {
      c.classList.remove('cv__input--errore');
      c.removeAttribute('aria-invalid');
    });
  }
  function segnala(campo, testo) {
    mostraErrore(testo);
    campo.classList.add('cv__input--errore');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
    return false;
  }

  function attendi(acceso) {
    btn.disabled = acceso;
    btn.classList.toggle('cv__btn--attesa', acceso);
  }

  // Il nome del file scelto, sotto il pulsante.
  campoFile.addEventListener('change', function () {
    var f = campoFile.files && campoFile.files[0];
    nomeFile.textContent = f ? f.name : 'Nessun file selezionato';
  });

  // Ritorna il telefono E.164 se tutto e' a posto, altrimenti false.
  function verifica() {
    pulisci();
    if (!campi.nome.value.trim()) return segnala(campi.nome, ERR.nome);
    if (!campi.cognome.value.trim()) return segnala(campi.cognome, ERR.cognome);
    if (!emailValida(campi.email.value)) return segnala(campi.email, ERR.email);

    var tel = validaTelefono(campi.prefisso ? campi.prefisso.value : '+39', campi.cellulare.value);
    if (!tel.ok) return segnala(campi.cellulare, tel.motivo);

    var n = campi.nascita.value;
    if (!n) return segnala(campi.nascita, ERR.nascita);
    var d = new Date(n + 'T12:00:00');
    if (isNaN(d.getTime())) return segnala(campi.nascita, ERR.nascitaNonValida);
    if (n > campi.nascita.max) return segnala(campi.nascita, ERR.nascitaGiovane);
    if (n < campi.nascita.min) return segnala(campi.nascita, ERR.nascitaNonValida);

    if (!campi.posizione.value) return segnala(campi.posizione, ERR.posizione);

    var f = campoFile.files && campoFile.files[0];
    if (!f) return segnala(campoFile, ERR.file);
    if (ESTENSIONI.indexOf(estensione(f.name)) === -1) return segnala(campoFile, ERR.formato);
    if (f.size > MAX_BYTE) return segnala(campoFile, ERR.peso);
    if (f.size === 0) return segnala(campoFile, ERR.file);

    if (!campi.privacy.checked) return segnala(campi.privacy, ERR.privacy);
    return tel.e164;
  }

  async function invia(e) {
    e.preventDefault();
    var telefono = verifica();
    if (!telefono) return;

    var dati = new FormData();
    dati.append('nome', campi.nome.value.trim());
    dati.append('cognome', campi.cognome.value.trim());
    dati.append('email', campi.email.value.trim().toLowerCase());
    dati.append('telefono', telefono);
    dati.append('data_nascita', campi.nascita.value);
    dati.append('posizione', campi.posizione.value);
    dati.append('privacy', '1');
    dati.append('sito_web', campi.trappola.value);
    dati.append('file', campoFile.files[0]);

    attendi(true);
    try {
      var r = await fetch(ENDPOINT, { method: 'POST', body: dati });
      var corpo = await r.json().catch(function () {
        return null;
      });
      if (r.ok && corpo && corpo.ok) {
        form.hidden = true;
        esito.hidden = false;
        var titolo = esito.querySelector('[data-cv-fuoco]');
        if (titolo) titolo.focus();
        return;
      }
      mostraErrore((corpo && corpo.errore) || ERR.rete);
    } catch (err) {
      mostraErrore(ERR.rete);
    }
    attendi(false);
  }

  form.addEventListener('submit', invia);
}
