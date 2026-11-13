import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// تفسير القمي بالآية لصفحة «تفسير» في قسم الحفظ.
// النصّ مقطّع على الآيات (tafsir/qummi.json: "س:آ" → نصّ). المقطع يشرح أحياناً آيات بعده،
// فالآية التي لا مقطع لها تأخذ أقرب مقطع قبلها في السورة نفسها، ويُعاد مفتاحه في from.
const here = path.dirname(fileURLToPath(import.meta.url));

export function loadQummi(file = path.join(here, 'tafsir', 'qummi.json')) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bySurah = new Map();
  for (const key of Object.keys(map)) {
    const [s, a] = key.split(':').map(Number);
    if (!bySurah.has(s)) bySurah.set(s, []);
    bySurah.get(s).push(a);
  }
  for (const list of bySurah.values()) list.sort((x, y) => x - y);
  return { map, bySurah };
}

export function qummiFor({ map, bySurah }, s, a) {
  const list = bySurah.get(s);
  if (!list) return null;
  let found = null;
  for (const n of list) { if (n <= a) found = n; else break; }
  if (found === null) return null;
  const from = `${s}:${found}`;
  return { text: map[from], from };
}

export function registerTafsirRoutes(app, { requireAccount, file }) {
  let data = null;
  app.get('/api/tafsir/qummi/:s/:a', requireAccount, (req, res) => {
    const s = Number.parseInt(req.params.s, 10);
    const a = Number.parseInt(req.params.a, 10);
    if (!(s >= 1 && s <= 114 && a >= 1 && a <= 286)) return res.status(400).json({ error: 'آية غير صحيحة' });
    try { data ??= loadQummi(file); } catch (e) {
      console.error('tafsir: لا يمكن قراءة القمي —', e.message);
      return res.status(503).json({ error: 'التفسير غير متوفر' });
    }
    const hit = qummiFor(data, s, a);
    if (!hit) return res.status(404).json({ error: 'لا تفسير لهذه الآية' });
    res.json(hit);
  });
}
