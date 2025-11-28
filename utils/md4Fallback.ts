import crypto from 'crypto';
import type { BinaryLike, BinaryToTextEncoding, HashOptions } from 'crypto';

const ROTATE_LEFT = (value: number, bits: number) =>
  ((value << bits) | (value >>> (32 - bits))) >>> 0;
const F = (x: number, y: number, z: number) => ((x & y) | (~x & z)) >>> 0;
const G = (x: number, y: number, z: number) => ((x & y) | (x & z) | (y & z)) >>> 0;
const H = (x: number, y: number, z: number) => (x ^ y ^ z) >>> 0;

const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
const concatUint8 = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const merged = new Uint8Array(a.length + b.length);
  merged.set(a, 0);
  merged.set(b, a.length);
  return merged;
};

class Md4Hash {
  private state: Uint32Array = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private pending: Uint8Array = new Uint8Array(0);
  private length = 0;
  private finished = false;

  update(data: BinaryLike, inputEncoding?: BufferEncoding): this {
    if (this.finished) {
      throw new Error('Hash already finalized');
    }
    const chunk = this.toUint8Array(data, inputEncoding);
    if (!chunk.length) return this;
    this.length += chunk.length;
    this.pending = this.pending.length ? concatUint8(this.pending, chunk) : chunk;
    this.consumeBlocks();
    return this;
  }

  digest(encoding?: BinaryToTextEncoding): Buffer | string {
    if (this.finished) {
      throw new Error('Hash already finalized');
    }
    this.finished = true;
    this.applyPadding();
    const out = Buffer.allocUnsafe(16);
    for (let i = 0; i < 4; i++) {
      out.writeUInt32LE(this.state[i], i * 4);
    }
    return encoding ? out.toString(encoding) : out;
  }

  copy(): Md4Hash {
    const clone = new Md4Hash();
    clone.state = new Uint32Array(this.state);
    clone.pending = this.pending.slice();
    clone.length = this.length;
    clone.finished = this.finished;
    return clone;
  }

  private toUint8Array(data: BinaryLike, inputEncoding?: BufferEncoding): Uint8Array {
    if (typeof data === 'string') {
      const buf = Buffer.from(data, inputEncoding);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    if (Buffer.isBuffer(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (isArrayBuffer(data)) return new Uint8Array(data);
    throw new TypeError('Unsupported data type for MD4 hash input');
  }

  private consumeBlocks() {
    while (this.pending.length >= 64) {
      this.processBlock(this.pending.subarray(0, 64));
      this.pending = this.pending.subarray(64);
    }
  }

  private applyPadding() {
    const mod = this.length % 64;
    const paddingLen = mod < 56 ? 56 - mod : 120 - mod;
    const padding = new Uint8Array(paddingLen + 8);
    padding[0] = 0x80;
    const bitLength = BigInt(this.length) * 8n;
    const view = new DataView(padding.buffer);
    view.setUint32(paddingLen, Number(bitLength & 0xffffffffn), true);
    view.setUint32(paddingLen + 4, Number((bitLength >> 32n) & 0xffffffffn), true);
    this.pending = this.pending.length ? concatUint8(this.pending, padding) : padding;
    this.consumeBlocks();
    this.pending = new Uint8Array(0);
  }

  private processBlock(chunk: Uint8Array) {
    const x = new Uint32Array(16);
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let i = 0; i < 16; i++) {
      x[i] = view.getUint32(i * 4, true);
    }
    let [a, b, c, d] = this.state;

    const round1 = (k: number, s: number, fnA: number, fnB: number, fnC: number, fnD: number) => {
      const val = (fnA + F(fnB, fnC, fnD) + x[k]) >>> 0;
      return ROTATE_LEFT(val, s);
    };
    const round2 = (k: number, s: number, fnA: number, fnB: number, fnC: number, fnD: number) => {
      const val = (fnA + G(fnB, fnC, fnD) + x[k] + 0x5a827999) >>> 0;
      return ROTATE_LEFT(val, s);
    };
    const round3 = (k: number, s: number, fnA: number, fnB: number, fnC: number, fnD: number) => {
      const val = (fnA + H(fnB, fnC, fnD) + x[k] + 0x6ed9eba1) >>> 0;
      return ROTATE_LEFT(val, s);
    };

    // Round 1
    a = round1(0, 3, a, b, c, d);
    d = round1(1, 7, d, a, b, c);
    c = round1(2, 11, c, d, a, b);
    b = round1(3, 19, b, c, d, a);
    a = round1(4, 3, a, b, c, d);
    d = round1(5, 7, d, a, b, c);
    c = round1(6, 11, c, d, a, b);
    b = round1(7, 19, b, c, d, a);
    a = round1(8, 3, a, b, c, d);
    d = round1(9, 7, d, a, b, c);
    c = round1(10, 11, c, d, a, b);
    b = round1(11, 19, b, c, d, a);
    a = round1(12, 3, a, b, c, d);
    d = round1(13, 7, d, a, b, c);
    c = round1(14, 11, c, d, a, b);
    b = round1(15, 19, b, c, d, a);

    // Round 2
    a = round2(0, 3, a, b, c, d);
    d = round2(4, 5, d, a, b, c);
    c = round2(8, 9, c, d, a, b);
    b = round2(12, 13, b, c, d, a);
    a = round2(1, 3, a, b, c, d);
    d = round2(5, 5, d, a, b, c);
    c = round2(9, 9, c, d, a, b);
    b = round2(13, 13, b, c, d, a);
    a = round2(2, 3, a, b, c, d);
    d = round2(6, 5, d, a, b, c);
    c = round2(10, 9, c, d, a, b);
    b = round2(14, 13, b, c, d, a);
    a = round2(3, 3, a, b, c, d);
    d = round2(7, 5, d, a, b, c);
    c = round2(11, 9, c, d, a, b);
    b = round2(15, 13, b, c, d, a);

    // Round 3
    a = round3(0, 3, a, b, c, d);
    d = round3(8, 9, d, a, b, c);
    c = round3(4, 11, c, d, a, b);
    b = round3(12, 15, b, c, d, a);
    a = round3(2, 3, a, b, c, d);
    d = round3(10, 9, d, a, b, c);
    c = round3(6, 11, c, d, a, b);
    b = round3(14, 15, b, c, d, a);
    a = round3(1, 3, a, b, c, d);
    d = round3(9, 9, d, a, b, c);
    c = round3(5, 11, c, d, a, b);
    b = round3(13, 15, b, c, d, a);
    a = round3(3, 3, a, b, c, d);
    d = round3(11, 9, d, a, b, c);
    c = round3(7, 11, c, d, a, b);
    b = round3(15, 15, b, c, d, a);

    this.state[0] = (this.state[0] + a) >>> 0;
    this.state[1] = (this.state[1] + b) >>> 0;
    this.state[2] = (this.state[2] + c) >>> 0;
    this.state[3] = (this.state[3] + d) >>> 0;
  }
}

function needsMd4Shim() {
  try {
    const test = crypto.createHash('md4');
    test.update('test');
    test.digest();
    return false;
  } catch {
    return true;
  }
}

function applyMd4Shim() {
  if (!needsMd4Shim()) return false;
  const originalCreateHash = crypto.createHash.bind(crypto);
  const shim: typeof crypto.createHash = (algorithm: string, options?: HashOptions) => {
    if (typeof algorithm === 'string' && algorithm.toLowerCase() === 'md4') {
      return new Md4Hash() as unknown as crypto.Hash;
    }
    return originalCreateHash(algorithm, options);
  };
  (shim as unknown as { __md4Shim?: true }).__md4Shim = true;
  crypto.createHash = shim;
  if (process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.warn(
      '[crypto] Applied JavaScript MD4 shim because OpenSSL legacy provider is unavailable'
    );
  }
  return true;
}

export const md4ShimActive = applyMd4Shim();
