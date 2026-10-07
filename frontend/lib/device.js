import { useSyncExternalStore } from 'react';

const subscribeReferral = (notify) => {
  window.addEventListener('pla-referral-updated', notify);
  return () => window.removeEventListener('pla-referral-updated', notify);
};

const readReferralCode = () => sessionStorage.getItem('pla_referral_code') || referralCodeFromUrl() || '';

export async function createDeviceHash() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return undefined;
  const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function referralCodeFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.get('ref') || params.get('refid') || params.get('referral_code') || params.get('affiliate_code');
}

export function useReferralCode() {
  return useSyncExternalStore(subscribeReferral, readReferralCode, () => '');
}

export function notifyReferralCodeChange() {
  window.dispatchEvent(new Event('pla-referral-updated'));
}
