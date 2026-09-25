// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica di «Presenta un Amico». Due schermate e una regola sola:
//
//   email di chi invita → verifica ─┬─ e' socio → dati di 1-3 amici → invio
//                                   └─ non lo e' → «non attivabile»
//
// La verifica riusa lo stesso webhook della Prova Passion
// (`passion-verifica-iscritto`): risponde `stato: 'iscritto'` per chi e' socio,
// che per la Prova blocca l'accesso e qui invece lo apre. Il controllo "l'amico
// e' gia' socio?" non lo fa il sito: lo fa n8n in silenzio all'invio, scartando
// l'amico senza avvisare — esattamente come il vecchio form quando l'invito
// era uno solo, solo senza il passo bloccante di mezzo (che con tre amici in
// un invio solo non si potrebbe fare senza tre round-trip).

import { WEBHOOK } from '../data/referral';
import { validaTelefono } from '../data/prefissi';

export function initReferralForm(root) {
  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nome: 'Serve il nome.',
    cognome: 'Serve il cognome.',
    privacy: 'Serve il consenso al trattamento dei dati per inviare il pass.',
  };

  function utm() {
    var q = new URLSearchParams(location.search);
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(
      function (k) {
        var v = q.get(k);
        if (v) out[k] = v;
      }
    );
    return out;
  }

  function q(sel) {
    return root.querySelector(sel);
  }
  function qa(sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  var steps = {
    email: q('#rf-step-email'),
    blocco: q('#rf-step-blocco'),
    amici: q('#rf-step-amici'),
    esito: q('#rf-step-esito'),
  };
  var campoEmail = q('#rf-email');
  var btnVerifica = q('[data-rf-verifica]');
  var btnInvia = q('[data-rf-invia]');
  var campoPrivacy = q('#rf-privacy');
  var blocchiAmici = qa('[data-rf-amico]');
  var btnAggiungi = qa('[data-rf-aggiungi]');

  var invitanteEmail = '';
  var invitanteNome = '';
  var invitanteCognome = '';

  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }

  function mostraErrore(step, testo) {
    var box = step.querySelector('[data-rf-errore]');
    if (!box) return;
    box.textContent = testo;
    box.hidden = false;
  }
  function pulisciErrore(step) {
    var box = step.querySelector('[data-rf-errore]');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }
  function segnala(campo) {
    campo.classList.add('rf__input--errore');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
  function togliSegno(campo) {
    campo.classList.remove('rf__input--errore');
    campo.removeAttribute('aria-invalid');
  }

  var attuale = 'email';
  function mostraStep(nome) {
    attuale = nome;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    var titolo = steps[nome] && steps[nome].querySelector('[data-rf-fuoco]');
    if (titolo) {
      void titolo.offsetWidth;
      titolo.focus();
    }
  }

  function attendi(btn, acceso) {
    btn.disabled = acceso;
    btn.classList.toggle('rf__btn--attesa', acceso);
  }

  // ── Passo 1: l'email di chi invita, verificata su PerfectGym ─────────────
  async function verifica() {
    pulisciErrore(steps.email);
    togliSegno(campoEmail);

    if (!emailValida(campoEmail.value)) {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }
    invitanteEmail = campoEmail.value.trim().toLowerCase();
    attendi(btnVerifica, true);

    var stato = 'errore';
    try {
      var r = await fetch(WEBHOOK.verifica, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invitanteEmail, pagina: location.pathname, origine: 'Referral', cta: 'Continua' }),
      });
      var body = await r.json();
      if (body && body.stato) stato = String(body.stato);
      invitanteNome = (body && body.nome) || '';
      invitanteCognome = (body && body.cognome) || '';
    } catch (e) {
      // PerfectGym irraggiungibile: si prosegue come se fosse socio. Meglio
      // un invito in piu' da scartare a mano (n8n ricontrolla comunque prima
      // di scrivere qualsiasi cosa) che perdere un invito legittimo per un
      // timeout — stesso principio della Prova Passion.
      stato = 'iscritto';
    }

    attendi(btnVerifica, false);

    if (stato === 'iscritto') mostraStep('amici');
    else mostraStep('blocco');
  }

  // ── Passo 2: fino a tre amici, aggiunti uno alla volta ───────────────────
  var visibili = 1;
  function mostraProssimoAmico() {
    if (visibili >= blocchiAmici.length) return;
    blocchiAmici[visibili].hidden = false;
    visibili += 1;
    if (btnAggiungi[0]) btnAggiungi[0].hidden = visibili >= blocchiAmici.length;
  }
  btnAggiungi.forEach(function (btn) {
    btn.addEventListener('click', mostraProssimoAmico);
  });

  function datiAmico(blocco) {
    var nome = blocco.querySelector('[data-rf-nome]');
    var cognome = blocco.querySelector('[data-rf-cognome]');
    var email = blocco.querySelector('[data-rf-email]');
    var cellulare = blocco.querySelector('[data-rf-cellulare]');
    // Il prefisso non ha un data-attributo suo: `CampoTelefono` mette gli
    // attributi extra solo sul campo del numero, non sulla tendina. La
    // tendina pero' ha un id prevedibile — quello del numero piu' `-prefisso`
    // — che e' esattamente come la legge anche `provaForm.client.js`.
    var prefisso = cellulare ? root.querySelector('#' + cellulare.id + '-prefisso') : null;
    return { nome: nome, cognome: cognome, email: email, cellulare: cellulare, prefisso: prefisso };
  }

  async function invia() {
    pulisciErrore(steps.amici);

    var amici = [];
    var i = 0;
    while (i < visibili) {
      var blocco = blocchiAmici[i];
      var campi = datiAmico(blocco);
      [campi.nome, campi.cognome, campi.email, campi.cellulare].forEach(togliSegno);

      if (!campi.nome.value.trim()) {
        mostraErrore(steps.amici, ERR.nome);
        segnala(campi.nome);
        return;
      }
      if (!campi.cognome.value.trim()) {
        mostraErrore(steps.amici, ERR.cognome);
        segnala(campi.cognome);
        return;
      }
      if (!emailValida(campi.email.value)) {
        mostraErrore(steps.amici, ERR.email);
        segnala(campi.email);
        return;
      }
      var tel = validaTelefono(campi.prefisso ? campi.prefisso.value : '+39', campi.cellulare.value);
      if (!tel.ok) {
        mostraErrore(steps.amici, tel.motivo);
        segnala(campi.cellulare);
        return;
      }

      amici.push({
        nome: campi.nome.value.trim(),
        cognome: campi.cognome.value.trim(),
        email: campi.email.value.trim().toLowerCase(),
        cellulare: tel.e164,
      });
      i += 1;
    }

    if (campoPrivacy && !campoPrivacy.checked) {
      mostraErrore(steps.amici, ERR.privacy);
      campoPrivacy.focus();
      return;
    }

    attendi(btnInvia, true);

    try {
      await fetch(WEBHOOK.invio, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitante: { email: invitanteEmail, nome: invitanteNome, cognome: invitanteCognome },
          amici: amici,
          pagina: location.pathname,
          origine: 'Referral',
          cta: 'Invia gli inviti',
          utm: utm(),
        }),
      });
    } catch (e) {
      // Il codice del gesto e' della persona comunque: l'invito perso resta
      // un problema nostro, non suo — stesso principio della Prova Passion.
    }

    attendi(btnInvia, false);
    mostraStep('esito');
  }

  if (btnVerifica) btnVerifica.addEventListener('click', verifica);
  if (btnInvia) btnInvia.addEventListener('click', invia);

  root.querySelectorAll('input').forEach(function (input) {
    if (input.type === 'checkbox') return;
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (attuale === 'email') verifica();
    });
  });
}
