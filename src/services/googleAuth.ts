// Google Authentication Service for RPG App
export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  google_id: string;
  verified_email: boolean;
  login_at: string;
}

export const ADMIN_EMAIL = 'cedrico124i@gmail.com';

export function isAppAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Produces a stable, deterministic UUID for an email address to ensure
 * persistent user identification across logins and devices in Postgres UUID columns.
 */
export function generateDeterministicUUID(input: string): string {
  const str = input.toLowerCase().trim();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = ((h1 >>> 0).toString(16)).padStart(8, '0');
  const hex2 = ((h2 >>> 0).toString(16)).padStart(8, '0');
  const hex3 = (((h1 ^ h2) >>> 0).toString(16)).padStart(8, '0');
  const hex4 = (((h1 + h2) >>> 0).toString(16)).padStart(8, '0');

  const p1 = hex1;
  const p2 = hex2.slice(0, 4);
  const p3 = '4' + hex2.slice(4, 7);
  const p4 = 'a' + hex3.slice(1, 4);
  const p5 = hex3.slice(4, 8) + hex4.slice(0, 8);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

import { safeStorage } from './safeStorage';

export function getOrCreateUserIdForEmail(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const key = `rpg_user_uid_${cleanEmail}`;
  const stored = safeStorage.getItem(key);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
    return stored;
  }
  const uid = generateDeterministicUUID(cleanEmail);
  safeStorage.setItem(key, uid);
  return uid;
}

const STORAGE_KEY = 'rpg_google_session';

type Listener = (user: GoogleUser | null) => void;
const listeners: Set<Listener> = new Set();

export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredGoogleUser(user: GoogleUser): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners(user);
  } catch (e) {
    console.error('Failed to store Google user:', e);
  }
}

export function clearStoredGoogleUser(): void {
  try {
    safeStorage.removeItem(STORAGE_KEY);
    notifyListeners(null);
  } catch (e) {
    console.error('Failed to clear Google user:', e);
  }
}

export function subscribeToGoogleAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(user: GoogleUser | null) {
  listeners.forEach((l) => {
    try {
      l(user);
    } catch (e) {
      console.error('Error in google auth listener:', e);
    }
  });
}

/**
 * Validates if the email provided is a valid Google Account / Gmail.
 */
export function validateGmailAddress(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'O e-mail não pode estar vazio.' };
  }

  // Basic regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Formato de e-mail inválido.' };
  }

  // Check if it is a Gmail address or Google domain
  const isGmail = trimmed.endsWith('@gmail.com') || trimmed.endsWith('@googlemail.com');
  if (!isGmail) {
    return { 
      isValid: false, 
      error: 'É obrigatório utilizar uma conta Google (exemplo: seunome@gmail.com).' 
    };
  }

  return { isValid: true };
}

/**
 * Helper to derive a clean default username and avatar from a Google account
 */
export function deriveProfileFromGoogle(googleUser: GoogleUser): {
  username: string;
  fullName: string;
  avatarUrl: string;
} {
  const emailPrefix = googleUser.email.split('@')[0] || 'usuario';
  const cleanUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
  
  const defaultAvatar = googleUser.picture || 
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(googleUser.email)}`;

  return {
    username: cleanUsername,
    fullName: googleUser.name || emailPrefix,
    avatarUrl: defaultAvatar
  };
}
