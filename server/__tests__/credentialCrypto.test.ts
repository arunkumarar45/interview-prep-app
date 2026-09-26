// server/__tests__/credentialCrypto.test.ts
// Tests for AES-256-GCM credential encryption/decryption.
// Uses a fake CREDENTIAL_ENCRYPTION_KEY set in beforeAll — no real secrets.

import {
  encryptCredential,
  decryptCredential,
  extractKeyLast4,
  serializeCredential,
  deserializeCredential,
} from "../lib/ai/credentialCrypto";

// ── Test key setup ─────────────────────────────────────────────────────────────
// Generate a deterministic 32-byte test key (base64). 
// This is ONLY used in tests — not a real encryption key.
const TEST_KEY = Buffer.alloc(32, 0x42).toString("base64"); // 32 bytes of 0x42

beforeAll(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;
});

describe("encryptCredential / decryptCredential", () => {
  it("round-trips a plaintext API key", () => {
    const plaintext = "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
    const stored = encryptCredential(plaintext);
    const decrypted = decryptCredential(stored);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same key (unique IV per call)", () => {
    const plaintext = "test-api-key-same-value";
    const stored1 = encryptCredential(plaintext);
    const stored2 = encryptCredential(plaintext);
    // IVs must differ — ciphertext must therefore differ
    expect(stored1.iv).not.toBe(stored2.iv);
    expect(stored1.data).not.toBe(stored2.data);
  });

  it("stored credentials never contain the plaintext", () => {
    const plaintext = "AIzaSy_SUPER_SECRET_KEY_1234";
    const stored = encryptCredential(plaintext);
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain(plaintext);
    expect(serialized).not.toContain("SUPER_SECRET");
  });

  it("throws on tampered auth tag (detects tampering)", () => {
    const plaintext = "AIzaSy_test_key_xyz";
    const stored = encryptCredential(plaintext);
    // Tamper with the auth tag
    const tamperedTag = Buffer.from(stored.tag, "base64");
    tamperedTag[0] ^= 0xff; // flip bits
    const tampered = { ...stored, tag: tamperedTag.toString("base64") };
    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("throws on tampered ciphertext data", () => {
    const plaintext = "AIzaSy_another_test_key";
    const stored = encryptCredential(plaintext);
    const tamperedData = Buffer.from(stored.data, "base64");
    tamperedData[0] ^= 0xff;
    const tampered = { ...stored, data: tamperedData.toString("base64") };
    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("throws on missing fields", () => {
    expect(() => decryptCredential({ iv: "", tag: "", data: "" })).toThrow();
    expect(() => decryptCredential({} as Parameters<typeof decryptCredential>[0])).toThrow();
  });

  it("throws on empty plaintext", () => {
    expect(() => encryptCredential("")).toThrow();
  });

  it("handles short API keys", () => {
    const short = "ABCD";
    const stored = encryptCredential(short);
    expect(decryptCredential(stored)).toBe(short);
  });

  it("handles long API keys (200 chars)", () => {
    const long = "A".repeat(200);
    const stored = encryptCredential(long);
    expect(decryptCredential(stored)).toBe(long);
  });
});

describe("extractKeyLast4", () => {
  it("returns the last 4 characters", () => {
    expect(extractKeyLast4("AIzaSyABCD1234")).toBe("1234");
    expect(extractKeyLast4("sk-proj-XXYZ")).toBe("XXYZ");
  });

  it("works with exactly 4 character key", () => {
    expect(extractKeyLast4("ABCD")).toBe("ABCD");
  });

  it("throws on keys shorter than 4 characters", () => {
    expect(() => extractKeyLast4("AB")).toThrow();
    expect(() => extractKeyLast4("")).toThrow();
  });
});

describe("serialize / deserialize roundtrip", () => {
  it("serializes and deserializes a stored credential", () => {
    const stored = encryptCredential("test-api-key-serialize");
    const serialized = serializeCredential(stored);
    expect(typeof serialized).toBe("string");
    const deserialized = deserializeCredential(serialized);
    expect(deserialized.iv).toBe(stored.iv);
    expect(deserialized.tag).toBe(stored.tag);
    expect(deserialized.data).toBe(stored.data);
  });

  it("full pipeline: encrypt → serialize → deserialize → decrypt", () => {
    const plaintext = "sk-proj-production-key-abc123";
    const stored = encryptCredential(plaintext);
    const serialized = serializeCredential(stored);
    const deserialized = deserializeCredential(serialized);
    const decrypted = decryptCredential(deserialized);
    expect(decrypted).toBe(plaintext);
  });

  it("deserializeCredential throws on invalid JSON", () => {
    expect(() => deserializeCredential("not-json")).toThrow();
  });

  it("deserializeCredential throws on missing required fields", () => {
    expect(() => deserializeCredential('{"iv":"abc"}')).toThrow();
    expect(() => deserializeCredential("{}")).toThrow();
  });
});

describe("key environment validation", () => {
  it("throws when CREDENTIAL_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(() => encryptCredential("test-key")).toThrow(/CREDENTIAL_ENCRYPTION_KEY/);
    process.env.CREDENTIAL_ENCRYPTION_KEY = saved;
  });

  it("throws when key is wrong length", () => {
    const saved = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64"); // 16 bytes, not 32
    expect(() => encryptCredential("test-key")).toThrow(/32 bytes/);
    process.env.CREDENTIAL_ENCRYPTION_KEY = saved;
  });
});
