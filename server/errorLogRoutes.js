import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLimiter } from './rateLimit.js';

// ─── سجلّ الأخطاء: تُرسله التطبيقات تلقائياً، ويقرؤه المالك وحده («سجل الأخطاء») ───
// ملف لكل يوم (errors/YYYY-MM-DD.jsonl)، يُحذف ما مضى عليه أكثر من RETENTION_DAYS.
// لا بيانات دخول ولا نصوص المستخدم: التطبيق ينظّف قبل الإرسال، والخادم يقصّ ويحذف ما يشبه بريداً أو مفتاحاً.

export const RETENTION_DAYS = 90;
const MAX_PER_REQUEST = 20;
const MAX_FIELD = { kind: 40, message: 500, stack: 2000, where: 120, version: 20, platform: 20, installId: 64, user: 120 };
const DAY_MS = 24 * 60 * 60 * 1000;

const dayName = (ms) => new Date(ms).toISOString().slice(0, 10);

export function scrub(text) {
  return String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\bses\.[\w-]+/g, '<token>')
    .replace(/\bBasic\s+[A-Za-z0-9+/=]+/g, 'Basic <hidden>')
    .replace(/\bBearer\s+[\w.-]+/g, 'Bearer <hidden>');
}

const clip = (v, n) => (typeof v === 'string' ? scrub(v).slice(0, n) : undefined);

export function cleanEntry(raw, now, ip) {
  if (!raw || typeof raw !== 'object' || typeof raw.message !== 'string') return null;
  const at = Number(raw.at);
  return {
    at: Number.isFinite(at) && Math.abs(now - at) < 30 * DAY_MS ? at : now,
    received: now,
    kind: clip(raw.kind, MAX_FIELD.kind) || 'error',
    message: clip(raw.message, MAX_FIELD.message),
    stack: clip(raw.stack, MAX_FIELD.stack),
    where: clip(raw.where, MAX_FIELD.where),
    version: clip(raw.version, MAX_FIELD.version),
    platform: clip(raw.platform, MAX_FIELD.platform),
    count: Math.max(1, Math.min(1000, Number(raw.count) || 1)),
    installId: typeof raw.installId === 'string' ? raw.installId.slice(0, MAX_FIELD.installId) : undefined,
    // البريد نفسه لا يُنظَّف هنا: هو حساب صاحب الخطأ، يراه المالك وحده
    user: typeof raw.user === 'string' ? raw.user.slice(0, MAX_FIELD.user) : undefined,
    ip: ip ? ip.replace(/\.\d+$/, '.x').replace(/:[\da-f]*$/i, ':x') : undefined,   // عنوان مقطوع: يكفي لتمييز الشبكة
  };
}

export function registerErrorLogRoutes(app, { dataDir, signedIn, clientIp, limit = { windowMs: 60 * 60 * 1000, max: 200 } }) {
  const dir = path.join(dataDir, 'errors');
  const configFile = path.join(dir, 'config.json');
  const ipLimit = createLimiter(limit);
  let lastPrune = 0;

  const requireAdmin = [...signedIn, (req, res, next) => {
    if (!req.isAdmin) return res.status(403).json({ error: 'للمشرف فقط' });
    next();
  }];

  async function readConfig() {
    try { return { enabled: true, ...JSON.parse(await fs.readFile(configFile, 'utf8')) }; } catch { return { enabled: true }; }
  }

  async function prune(now) {
    if (now - lastPrune < 60 * 60 * 1000) return;
    lastPrune = now;
    const oldest = dayName(now - RETENTION_DAYS * DAY_MS);
    for (const name of await fs.readdir(dir).catch(() => [])) {
      if (name.endsWith('.jsonl') && name.slice(0, 10) < oldest) await fs.rm(path.join(dir, name), { force: true });
    }
  }

  // من أيّ تطبيق، بحساب أو بلا حساب. الإيقاف من الشاشة يجعل الخادم يتجاهلها بصمت.
  app.post('/api/errors', async (req, res) => {
    const ip = clientIp(req);
    const list = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, MAX_PER_REQUEST) : [];
    if (!list.length) return res.status(400).json({ error: 'لا أخطاء في الطلب' });
    if (ipLimit.blocked(ip)) return res.status(429).json({ error: 'أخطاء كثيرة — لاحقاً' });
    if (!(await readConfig()).enabled) return res.json({ ok: true, stored: 0 });
    const now = Date.now();
    const common = { installId: req.body.installId, user: req.body.user, version: req.body.version, platform: req.body.platform };
    const rows = list.map((e) => cleanEntry({ ...common, ...e }, now, ip)).filter(Boolean);
    rows.forEach(() => ipLimit.hit(ip));
    await fs.mkdir(dir, { recursive: true });
    if (rows.length) await fs.appendFile(path.join(dir, `${dayName(now)}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    await prune(now);
    res.json({ ok: true, stored: rows.length });
  });

  // للمالك: آخر الأخطاء (days أيام، الأحدث أولاً) وحالة الاستقبال
  app.get('/api/admin/errors', requireAdmin, async (req, res) => {
    const days = Math.max(1, Math.min(RETENTION_DAYS, Number(req.query.days) || 7));
    const now = Date.now();
    const entries = [];
    for (let d = 0; d < days; d++) {
      const text = await fs.readFile(path.join(dir, `${dayName(now - d * DAY_MS)}.jsonl`), 'utf8').catch(() => '');
      for (const line of text.split('\n')) {
        if (!line) continue;
        try { entries.push(JSON.parse(line)); } catch { /* سطر تالف */ }
      }
    }
    entries.sort((a, b) => b.at - a.at);
    res.json({ entries: entries.slice(0, 2000), ...(await readConfig()) });
  });

  app.post('/api/admin/errors/config', requireAdmin, async (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'حمولة غير صالحة' });
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(configFile, JSON.stringify({ enabled: req.body.enabled }));
    res.json({ ok: true, enabled: req.body.enabled });
  });

  app.delete('/api/admin/errors', requireAdmin, async (req, res) => {
    for (const name of await fs.readdir(dir).catch(() => [])) {
      if (name.endsWith('.jsonl')) await fs.rm(path.join(dir, name), { force: true });
    }
    res.json({ ok: true });
  });
}
