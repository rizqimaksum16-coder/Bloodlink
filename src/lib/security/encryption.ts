// src/lib/security/encryption.ts
// Data encryption utilities

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async encrypt(text: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await this.deriveKey(secretKey);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv
      },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedText: string, secretKey: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = await this.deriveKey(secretKey);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv
      },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  private async deriveKey(secretKey: string): Promise<CryptoKey> {
    const
  }