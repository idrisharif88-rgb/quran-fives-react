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
const KHITMA_FILE = path.join(DATA_DIR, 'khitma.json');

// بيانات دخول مالك سجلّ الختمات الخاص (تُضبط عبر البيئة، وإلا القيم الافتراضية)
const KHITMA_USER = process.env.KHITMA_USER || 'IdrisAhmedSh';
const KHITMA_CODE = process.env.KHITMA_CODE || '27956';

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

// ─── سجلّ الختمات الخاص (محمي ببيانات المالك user + code) ───
function khitmaAuthorized(req) {
  return req.get('X-Khitma-User') === KHITMA_USER && req.get('X-Khitma-Code') === KHITMA_CODE;
}

async function readKhitma() {
  try {
    return JSON.parse(await fs.readFile(KHITMA_FILE, 'utf8'));
  } catch {
    return { updatedAt: 0, list: [] };
  }
}

async function writeKhitma(record) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = KHITMA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(record), 'utf8');
  await fs.rename(tmp, KHITMA_FILE);
}

// تحقّق من بيانات الدخول فقط (لشاشة القفل)
app.post('/api/khitma/auth', (req, res) => {
  if (!khitmaAuthorized(req)) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  res.json({ ok: true });
});

app.get('/api/khitma', async (req, res) => {
  if (!khitmaAuthorized(req)) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  res.json(await readKhitma());
});

app.put('/api/khitma', async (req, res) => {
  if (!khitmaAuthorized(req)) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  const { updatedAt, list } = req.body || {};
  if (typeof updatedAt !== 'number' || !Array.isArray(list)) {
    return res.status(400).json({ error: 'حمولة غير صالحة' });
  }
  const current = await readKhitma();
  // آخر تعديل يفوز
  if (updatedAt < current.updatedAt) {
    return res.json({ ok: true, updatedAt: current.updatedAt, stale: true });
  }
  await writeKhitma({ updatedAt, list });
  res.json({ ok: true, updatedAt });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/state', async (req, res) => {
  const record = await readState();
  res.json(record);
});

app.put('/api/state', async (req, res) => {
  const { state, baseUpdatedAt } = req.body || {};
  if (typeof state !== 'object' || state === null || typeof baseUpdatedAt !== 'number') {
    return res.status(400).json({ error: 'حمولة غير صالحة' });
  }
  const current = await readState();
  // تزامن متفائل: الجهاز يرفع مستنداً إلى النسخة التي رآها آخر مرّة.
  // إن تغيّرت الحالة على الخادم منذ ذلك الحين فهذا تعارض حقيقي — نرفض الرفع
  // ونطلب من الجهاز السحب أوّلاً، بدل أن يكتب حالته القديمة فوق الأحدث.
  if (baseUpdatedAt !== current.updatedAt) {
    return res.status(409).json({ error: 'تعارض: الحالة تغيّرت على الخادم', updatedAt: current.updatedAt });
  }
  // ساعة الخادم وحدها هي المرجع — لا نثق بساعات الأجهزة (اختلافها يكسر «آخر تعديل يفوز»)
  const updatedAt = Date.now();
  await writeState({ updatedAt, state });
  res.json({ ok: true, updatedAt });
});

app.listen(PORT, () => {
  console.log(`خادم المزامنة يعمل على المنفذ ${PORT}`);
});
