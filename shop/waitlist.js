import { wallConfig } from '../wall/config.js';

// Shop waitlist: one insert-only table. The public key can add an email,
// and can never read the list back.
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length >= 6 && email.length <= 254 && EMAIL.test(email) ? email : null;
}

export async function joinWaitlist(value, { config = wallConfig, fetcher = fetch } = {}) {
  const email = cleanEmail(value);
  if (!email) return { ok: false, reason: 'invalid' };
  if (!config.supabaseUrl || !config.publishableKey) return { ok: false, reason: 'unavailable' };
  try {
    const response = await fetcher(`${config.supabaseUrl}/rest/v1/shop_waitlist`, {
      method: 'POST',
      headers: { apikey: config.publishableKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email, source: 'shop' }),
      signal: AbortSignal.timeout(12000),
    });
    // 409 means the address is already on the list. Same answer either way.
    if (response.ok || response.status === 409) return { ok: true };
    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

const MESSAGES = {
  ok: 'You’re on the list. One email when the door opens ♡',
  invalid: 'That email doesn’t look right. Check it and try again.',
  unavailable: 'The list can’t take names right now. Nothing was saved. Try again later, or follow @koalawallaland on Instagram.',
};

if (typeof document !== 'undefined') {
  const form = document.querySelector('[data-kwl-waitlist]');
  if (form) {
    const status = form.querySelector('[role="status"]');
    const button = form.querySelector('button');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      // Honeypot: real visitors never fill this.
      if (form.elements.website.value) { status.textContent = MESSAGES.ok; return; }
      button.disabled = true;
      status.textContent = 'Adding you…';
      const result = await joinWaitlist(form.elements.email.value);
      status.textContent = MESSAGES[result.ok ? 'ok' : result.reason];
      if (result.ok) form.reset();
      button.disabled = false;
    });
  }
}
