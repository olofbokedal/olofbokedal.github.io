(() => {
  'use strict';

  const TO = 'olof.bokedal@icloud.com';
  const SUBJECT = 'Tomteanmälan – Maryhill Estate, 23–25 dec';
  const CONSENT = 'Jag godkänner att mina uppgifter skickas till och sparas av Olof Bokedal, att de enbart används för att samordna tomtebesöket och att de raderas efter jul.';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+?[\d\s\-().]+$/;

  // Which inputs get marked invalid for each error message slot.
  const ERROR_INPUTS = {
    name: ['name'],
    contact: ['email', 'phone'],
    email: ['email'],
    phone: ['phone'],
    children: ['children'],
    consent: ['consent'],
  };
  const INPUT_ORDER = ['name', 'email', 'phone', 'children', 'consent'];

  const $ = (id) => document.getElementById(id);
  const form = $('signup');
  const sent = $('sent');
  const copyStatus = $('copy-status');

  let attempted = false;
  let lastMailto = '';
  let lastMessage = '';

  function readForm() {
    return {
      name: $('name').value.trim(),
      email: $('email').value.trim(),
      phone: $('phone').value.trim(),
      children: $('children').value.trim(),
      childrenBadInput: $('children').validity.badInput,
      message: $('message').value.trim(),
      consent: $('consent').checked,
    };
  }

  function findErrors(d) {
    const errors = {};
    if (!d.name) errors.name = 'Skriv ditt namn.';

    if (!d.email && !d.phone) {
      errors.contact = 'Fyll i e-post eller telefon – minst ett av dem.';
    } else {
      if (d.email && !EMAIL_RE.test(d.email)) {
        errors.email = 'Kontrollera e-postadressen – den ser inte riktigt rätt ut.';
      }
      const digits = d.phone.replace(/\D/g, '');
      if (d.phone && (!PHONE_RE.test(d.phone) || digits.length < 6 || digits.length > 15)) {
        errors.phone = 'Kontrollera telefonnumret.';
      }
    }

    if (d.childrenBadInput) {
      errors.children = 'Ange antalet med siffror.';
    } else if (d.children !== '') {
      const n = Number(d.children);
      if (!Number.isInteger(n) || n < 0 || n > 20) errors.children = 'Ange ett antal mellan 0 och 20.';
    }

    if (!d.consent) errors.consent = 'Kryssa i rutan för att godkänna – annars kan jag inte ta emot din anmälan.';
    return errors;
  }

  function showErrors(errors) {
    const invalid = new Set();
    for (const key of Object.keys(ERROR_INPUTS)) {
      const el = $(key + '-error');
      const msg = errors[key] || '';
      el.textContent = msg;
      el.hidden = !msg;
      if (msg) ERROR_INPUTS[key].forEach((id) => invalid.add(id));
    }
    for (const id of INPUT_ORDER) {
      if (invalid.has(id)) $(id).setAttribute('aria-invalid', 'true');
      else $(id).removeAttribute('aria-invalid');
    }
    return INPUT_ORDER.find((id) => invalid.has(id));
  }

  function buildBody(d) {
    const lines = [
      'Hej Olof!',
      '',
      'Jag vill gärna vara med och dela på en tomte på Maryhill Estate i jul (23–25 december 2026).',
      '',
      `Namn: ${d.name}`,
    ];
    if (d.email) lines.push(`E-post: ${d.email}`);
    if (d.phone) lines.push(`Telefon: ${d.phone}`);
    if (d.children !== '') lines.push(`Antal barn: ${Number(d.children)}`);
    if (d.message) lines.push('', 'Meddelande:', d.message);
    lines.push('', 'Samtycke (ikryssat i anmälningsformuläret):', CONSENT, '', 'Hälsningar', d.name);
    return lines.join('\n');
  }

  function openMailApp() {
    if (lastMailto) window.location.href = lastMailto;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) { /* fall back below */ }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    attempted = true;

    const data = readForm();
    const firstInvalid = showErrors(findErrors(data));
    if (firstInvalid) {
      $(firstInvalid).focus();
      return;
    }

    const body = buildBody(data);
    lastMessage = `Till: ${TO}\nÄmne: ${SUBJECT}\n\n${body}`;
    lastMailto = `mailto:${TO}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;

    copyStatus.textContent = '';
    sent.hidden = false;
    sent.focus({ preventScroll: true });
    sent.scrollIntoView({ behavior: 'smooth', block: 'center' });
    openMailApp();
  });

  // After a first attempt, re-check as the guest corrects things.
  form.addEventListener('input', () => {
    if (attempted) showErrors(findErrors(readForm()));
  });

  $('reopen').addEventListener('click', openMailApp);

  sent.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const isAddress = button.dataset.copy === 'address';
    const ok = await copyText(isAddress ? TO : lastMessage);
    if (!ok && isAddress) {
      copyStatus.textContent = 'Det gick inte att kopiera automatiskt – markera adressen och kopiera den manuellt.';
    } else if (!ok) {
      copyStatus.textContent = `Det gick inte att kopiera automatiskt – skriv i stället ett mejl med dina uppgifter till ${TO}.`;
    } else if (isAddress) {
      copyStatus.textContent = 'Adressen är kopierad.';
    } else {
      copyStatus.textContent = `Meddelandet är kopierat – klistra in det i ett nytt mejl till ${TO}.`;
    }
  });
})();
