import express from 'express';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';

// ملفات الإجازات (PDF) لكل حساب: data/users/<key>/files/ijaza/<id>.pdf
// وفهرسها { [id]: { name, size, addedAt } } في ijaza-files.json بجانب حالة الحساب.
const INDEX = 'ijaza-files.json';
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function registerFileRoutes(app, { store, dataDir, requireAccount, maxFileBytes }) {
  const dirOf = (key) => path.join(dataDir, 'users', key, 'files', 'ijaza');
  const fileOf = (key, id) => path.join(dirOf(key), `${id}.pdf`);
  const readIndex = (key) => store.read(key, INDEX, {});

  function checkId(req, res, next) {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'معرّف غير صالح' });
    next();
  }

  app.get('/api/files/ijaza', requireAccount, async (req, res) => {
    res.json(await readIndex(req.userKey));
  });

  app.put('/api/files/ijaza/:id', requireAccount, checkId,
    express.raw({ type: 'application/pdf', limit: maxFileBytes }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        return res.status(400).json({ error: 'ملف PDF فقط' });
      }
      let name = 'ijaza.pdf';
      try { name = decodeURIComponent(req.get('X-File-Name') || name).slice(0, 200); } catch { /* الاسم الافتراضي */ }
      const file = fileOf(req.userKey, req.params.id);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file + '.tmp', req.body);
      await fs.rename(file + '.tmp', file);
      const meta = { name, size: req.body.length, addedAt: Date.now() };
      await store.write(req.userKey, INDEX, { ...await readIndex(req.userKey), [req.params.id]: meta });
      res.json(meta);
    });

  app.get('/api/files/ijaza/:id', requireAccount, checkId, async (req, res) => {
    const file = fileOf(req.userKey, req.params.id);
    try {
      const { size } = await fs.stat(file);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': size });
      createReadStream(file).pipe(res);
    } catch {
      res.status(404).json({ error: 'لا ملف' });
    }
  });

  app.delete('/api/files/ijaza/:id', requireAccount, checkId, async (req, res) => {
    await fs.rm(fileOf(req.userKey, req.params.id), { force: true });
    const index = await readIndex(req.userKey);
    delete index[req.params.id];
    await store.write(req.userKey, INDEX, index);
    res.json({ ok: true });
  });

  // ملف أكبر من الحدّ: ردّ مفهوم بدل صفحة خطأ express
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'الملف أكبر من المسموح' });
    next(err);
  });
}
