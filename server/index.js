import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const SYNC_CODE = process.env.SYNC_CODE || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

// رفض التشغيل بدون رمز مزامنة حتى لا يبقى الخادم مفتوحاً للعلن
if (!SYNC_CODE) {
  console.error('SYNC_CODE غير مضبوط. عيّن متغيّر البيئة SYNC_CODE قبل التشغيل.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

// التحقق من رمز المزامنة في كل طلب على /api
app.use('/api', (req, res, next) => {
  const code = req.get('X-Sync-Code');
  if (code !== SYNC_CODE) {
    return res.status(401).json({ error: 'رمز مزامنة غير صحيح' });
  }
  next();
});

async function readState() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { updatedAt: 0, state: null };
  }
}

// كتابة ذرّية: نكتب لملف مؤقت ثم نعيد تسميته لتفادي تلف الملف عند انقطاع
async function writeState(record) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(record), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/state', async (req, res) => {
  const record = await readState();
  res.json(record);
});

app.put('/api/state', async (req, res) => {
  const { updatedAt, state } = req.body || {};
  if (typeof updatedAt !== 'number' || typeof state !== 'object' || state === null) {
    return res.status(400).json({ error: 'حمولة غير صالحة' });
  }
  const current = await readState();
  // آخر تعديل يفوز: نتجاهل الرفع الأقدم من المخزّن لمنع جهاز قديم من الكتابة فوق الأحدث
  if (updatedAt < current.updatedAt) {
    return res.json({ ok: true, updatedAt: current.updatedAt, stale: true });
  }
  await writeState({ updatedAt, state });
  res.json({ ok: true, updatedAt });
});

app.listen(PORT, () => {
  console.log(`خادم المزامنة يعمل على المنفذ ${PORT}`);
});
