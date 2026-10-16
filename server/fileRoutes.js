import express from 'express';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';

// ملفات كل حساب على السيرفر، بأنواع: ملفات الإجازات (PDF) وتسجيلات الحفظ (صوت).
// الملف: data/users/<key>/files/<kind>/<id>.bin، وفهرس النوع <kind>-files.json بجانب حالة الحساب:
// { [id]: { name, size, mime, addedAt, meta } } — meta ما يرسله التطبيق مع الملف (آيات التسجيل…).
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_META = 4096;

export const FILE_KINDS = {
  ijaza: { types: ['application/pdf'] },
  hifz: { types: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/mpeg'] },
};

const decodeHeader = (value, fallback) => {
  try { return value ? decodeURIComponent(value) : fallback; } catch { return fallback; }
};

export function registerFileRoutes(app, { store, dataDir, requireAccount, maxFileBytes, maxUserBytes }) {
  const indexName = (kind) => `${kind}-files.json`;
  const readIndex = (key, kind) => store.read(key, indexName(kind), {});
  const dirOf = (key, kind) => path.join(dataDir, 'users', key, 'files', kind);
  // ملفات الإجازة الأولى حُفظت <id>.pdf — تُقرأ من اسمها القديم إن وُجدت
  const fileOf = async (key, kind, id) => {
    const bin = path.join(dirOf(key, kind), `${id}.bin`);
    if (kind !== 'ijaza') return bin;
    const legacy = path.join(dirOf(key, kind), `${id}.pdf`);
    return fs.stat(legacy).then(() => legacy, () => bin);
  };

  async function usedBytes(key, exceptKind, exceptId) {
    let total = 0;
    for (const kind of Object.keys(FILE_KINDS)) {
      for (const [id, meta] of Object.entries(await readIndex(key, kind))) {
        if (!(kind === exceptKind && id === exceptId)) total += meta.size || 0;
      }
    }
    return total;
  }

  function checkParams(req, res, next) {
    if (!FILE_KINDS[req.params.kind]) return res.status(404).json({ error: 'نوع غير معروف' });
    if (req.params.id !== undefined && !ID_RE.test(req.params.id)) return res.status(400).json({ error: 'معرّف غير صالح' });
    next();
  }

  app.get('/api/files/:kind', requireAccount, checkParams, async (req, res) => {
    res.json(await readIndex(req.userKey, req.params.kind));
  });

  // مساحة الحساب: المستعمل والحدّ (بايت)
  app.get('/api/files-usage', requireAccount, async (req, res) => {
    res.json({ used: await usedBytes(req.userKey), limit: maxUserBytes });
  });

  app.put('/api/files/:kind/:id', requireAccount, checkParams,
    express.raw({ type: () => true, limit: maxFileBytes }),
    async (req, res) => {
      const { kind, id } = req.params;
      const mime = (req.get('Content-Type') || '').split(';')[0].trim();
      if (!FILE_KINDS[kind].types.includes(mime)) return res.status(415).json({ error: 'نوع الملف غير مقبول' });
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'ملف فارغ' });

      let meta = null;
      const rawMeta = decodeHeader(req.get('X-File-Meta'), '');
      if (rawMeta) {
        if (rawMeta.length > MAX_META) return res.status(400).json({ error: 'بيانات الملف طويلة' });
        try { meta = JSON.parse(rawMeta); } catch { return res.status(400).json({ error: 'بيانات الملف غير صالحة' }); }
      }
      if (await usedBytes(req.userKey, kind, id) + req.body.length > maxUserBytes) {
        return res.status(507).json({ error: 'امتلأت مساحة الحساب' });
      }

      const file = path.join(dirOf(req.userKey, kind), `${id}.bin`);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file + '.tmp', req.body);
      await fs.rename(file + '.tmp', file);
      if (kind === 'ijaza') await fs.rm(path.join(dirOf(req.userKey, kind), `${id}.pdf`), { force: true });

      const entry = {
        name: decodeHeader(req.get('X-File-Name'), `${id}`).slice(0, 200),
        size: req.body.length,
        mime,
        addedAt: Date.now(),
        ...(meta ? { meta } : {}),
      };
      await store.write(req.userKey, indexName(kind), { ...await readIndex(req.userKey, kind), [id]: entry });
      res.json(entry);
    });

  app.get('/api/files/:kind/:id', requireAccount, checkParams, async (req, res) => {
    const { kind, id } = req.params;
    const file = await fileOf(req.userKey, kind, id);
    try {
      const { size } = await fs.stat(file);
      const mime = (await readIndex(req.userKey, kind))[id]?.mime || FILE_KINDS[kind].types[0];
      res.set({ 'Content-Type': mime, 'Content-Length': size });
      createReadStream(file).pipe(res);
    } catch {
      res.status(404).json({ error: 'لا ملف' });
    }
  });

  app.delete('/api/files/:kind/:id', requireAccount, checkParams, async (req, res) => {
    const { kind, id } = req.params;
    await fs.rm(await fileOf(req.userKey, kind, id), { force: true });
    const index = await readIndex(req.userKey, kind);
    delete index[id];
    await store.write(req.userKey, indexName(kind), index);
    res.json({ ok: true });
  });

  // ملف أكبر من الحدّ: ردّ مفهوم بدل صفحة خطأ express
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'الملف أكبر من المسموح' });
    next(err);
  });
}
