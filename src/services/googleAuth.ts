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

const STORAGE_KEY = 'rpg_google_session';

type Listener = (user: GoogleUser | null) => void;
const listeners: Set<Listener> = new Set();

export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredGoogleUser(user: GoogleUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners(user);
  } catch (e) {
    console.error('Failed to store Google user:', e);
  }
}

export function clearStoredGoogleUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
