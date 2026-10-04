import { createHash, randomInt } from 'node:crypto';

const TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const digest = (otp) => createHash('sha256').update(String(otp)).digest('hex');

// رموز تأكيد بالبريد: 6 أرقام، صالحة 15 دقيقة، وتسقط بعد 5 محاولات خاطئة.
// يُحفظ من الرمز بصمته فقط، ومعه حمولة العملية المعلّقة (kind: verify | reset).
export function createOtps(pending, { ttlMs = TTL_MS, now = Date.now } = {}) {
  const fileOf = (kind) => `${kind}.json`;

  // رمز جديد يُبطل ما قبله للعملية نفسها
  async function issue(kind, key, payload = {}) {
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await pending.write(key, fileOf(kind), { otp: digest(otp), expiresAt: now() + ttlMs, attempts: 0, payload });
    return otp;
  }

  // يعيد الحمولة إن صحّ الرمز (ويُتلفه)، وإلا null
  async function consume(kind, key, otp) {
    const record = await pending.read(key, fileOf(kind), null);
    if (!record) return null;
    if (record.expiresAt <= now()) {
      await pending.remove(key, fileOf(kind));
      return null;
    }
    if (digest(otp) !== record.otp) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) await pending.remove(key, fileOf(kind));
      else await pending.write(key, fileOf(kind), { ...record, attempts });
      return null;
    }
    await pending.remove(key, fileOf(kind));
    return record.payload;
  }

  return { issue, consume };
}
