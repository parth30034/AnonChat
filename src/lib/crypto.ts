const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS  = { name: 'AES-GCM', length: 256 };

const seenIVs = new Set<string>();

export function clearCryptoSession(): void {
  seenIVs.clear();
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    ECDH_PARAMS,
    false,          // private key is not extractable
    ['deriveKey']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    ECDH_PARAMS,
    true,
    []              // public key has no usages — only used in deriveKey
  );
}

export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  return {
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  if (seenIVs.has(iv)) {
    throw new Error('IV reuse detected — message rejected');
  }
  seenIVs.add(iv);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(iv) },
    sharedKey,
    base64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

function bufToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
