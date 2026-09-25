import { createId, normalizeEmail, normalizePhone } from './ids.ts';
import type { Metadata, Person } from './types.ts';
import { DEFAULT_CONSENT } from './types.ts';

/**
 * Guest lists from wherever the event already lives.
 *
 * Partiful exports CSV; Luma and Eventbrite have APIs and webhooks. All of
 * them answer "who said they were coming", which MyWrap can't know — and none
 * of them answer "what happened once they arrived", which is the only thing
 * MyWrap can. Importing the list gives every percentage a real denominator.
 */

export interface Guest {
  name?: string;
  email?: string;
  phone?: string;
  /** Whatever the source calls it: going, maybe, registered, checked_in. */
  status?: string;
  traits: Metadata;
}

/** Minimal RFC 4180 parser — quoted fields, escaped quotes, embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''));
}

const HEADER_ALIASES: Record<keyof Omit<Guest, 'traits'>, string[]> = {
  name: ['name', 'full name', 'guest name', 'attendee name', 'first name'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'cell'],
  status: ['status', 'rsvp', 'rsvp status', 'attendance', 'checked in', 'ticket status'],
};

function headerKey(header: string): keyof Omit<Guest, 'traits'> | undefined {
  const value = header.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(value)) return key as keyof Omit<Guest, 'traits'>;
  }
  return undefined;
}

/** Column names vary per platform, so match on aliases and keep the rest as traits. */
export function parseGuestList(csv: string, source = 'csv'): Guest[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const mapped = header.map(headerKey);

  return rows.map((row) => {
    const guest: Guest = { traits: { source } };
    row.forEach((cell, index) => {
      const value = cell.trim();
      if (!value) return;
      const key = mapped[index];
      if (key) {
        guest[key] = value;
      } else {
        guest.traits[header[index]!.trim()] = value;
      }
    });
    const email = normalizeEmail(guest.email);
    const phone = normalizePhone(guest.phone);
    if (email) guest.email = email;
    if (phone) guest.phone = phone;
    if (guest.status) guest.traits.rsvp_status = guest.status;
    return guest;
  });
}

/**
 * Turn guests into attendee records so that the first time someone types their
 * email into MyWrap, they land on the record the organiser already had.
 *
 * Consent starts at the default — being on a guest list is not consent to be
 * marketed to, and it is not consent to attach their browsing history either.
 */
export function guestsToPeople(guests: Guest[], newId: (prefix: string) => string = createId): Person[] {
  const now = new Date().toISOString();
  return guests.map((guest) => ({
    person_id: newId('person'),
    anonymous_ids: [],
    ...(guest.email ? { email: guest.email } : {}),
    ...(guest.phone ? { phone: guest.phone } : {}),
    ...(guest.name ? { name: guest.name } : {}),
    identified_at: now,
    consent: { ...DEFAULT_CONSENT },
    traits: guest.traits,
  }));
}

/** Counts for the denominator line: "41 of 50 opened the Wrap". */
export function guestListSize(guests: Guest[], statuses?: string[]): number {
  if (!statuses) return guests.length;
  const wanted = statuses.map((status) => status.toLowerCase());
  return guests.filter((guest) => wanted.includes((guest.status ?? '').toLowerCase())).length;
}
