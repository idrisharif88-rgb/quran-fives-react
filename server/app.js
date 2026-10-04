import express from 'express';
import cors from 'cors';
import { createStore, normalizeUser, userKey } from './store.js';
import { createAccounts, validateEmail } from './accounts.js';
import { createLimiter } from './rateLimit.js';
import { createOtps } from './otp.js';
import { createDevices } from './devices.js';
import { registerAuthRoutes } from './authRoutes.js';
import { registerAdminRoutes } from './adminRoutes.js';

const DEFAULT_LIMITS = {
  ipMail: { windowMs: 60 * 60 * 1000, max: 10 },     // رسائل تأكيد/استرجاع لكل عنوان
  emailMail: { windowMs: 15 * 60 * 1000, max: 3 },   // رسائل إلى البريد الواحد
  ipFails: { windowMs: 15 * 60 * 1000, max: 20 },    // محاولات دخول فاشلة لكل عنوان
  userFails: { windowMs: 15 * 60 * 1000, max: 30 },  // محاولات فاشلة على الاسم الواحد
};

// الخادم خلف nginx و Cloudflare: عنوان الزائر الحقيقي في ترويسة Cloudflare
function clientIp(req) {
  return req.get('CF-Connecting-IP') || req.ip || 'unknown';
}

// بيانات الدخول من الطلب. التطبيق الجديد يرسل Authorization: Basic (يحتمل الأسماء
// العربية)، والإصدارات القديمة ترسل ترويستَي X-Khitma-* — نقبل الاثنتين.
function readCreds(req) {
  const auth = req.get('Authorization') || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep > 0) return { user: decoded.slice(0, sep), code: decoded.slice(sep + 1) };
  }
  const user = req.get('X-Khitma-User');
  const code = req.get('X-Khitma-Code');
  return user && code ? { user, code } : null;
}

// adminUser: حساب المشرف (المالك) — يوافق على الحسابات الجديدة ولا يحتاج موافقة
export function createApp({ dataDir, maxUsers = 100, limits = {}, sendMail, otpOptions, adminUser = '' }) {
  const adminName = normalizeUser(adminUser);
  const store = createStore(dataDir);
  const accounts = createAccounts(store, { maxUsers });
  const otps = createOtps(createStore(dataDir, 'pending'), otpOptions);
  const devices = createDevices(store);
  const cfg = { ...DEFAULT_LIMITS, ...limits };
  const ipFails = createLimiter(cfg.ipFails);
  const userFails = createLimiter(cfg.userFails);

  const app = express();
  app.set('trust proxy', 'loopback');
  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // كلمة السر. طلب بلا بيانات دخول يُرفض دون احتسابه محاولة فاشلة: الإصدارات
  // القديمة ترسل /api/state بلا مستخدم، ولا يجوز أن تحظر عنوانها.
  async function checkPassword(req, res, next) {
    const creds = readCreds(req);
    if (!creds) return res.status(401).json({ error: 'يتطلّب تسجيل الدخول' });
    const ip = clientIp(req);
    const key = userKey(creds.user);
    if (ipFails.blocked(ip) || userFails.blocked(key)) {
      return res.status(429).json({ error: 'محاولات كثيرة — حاول لاحقاً' });
    }
    const verified = await accounts.verify(creds.user, creds.code);
    if (!verified) {
      ipFails.hit(ip);
      userFails.hit(key);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    req.userKey = verified.key;
    req.email = normalizeUser(creds.user);
    req.isAdmin = Boolean(adminName) && req.email === adminName;
    req.approved = verified.approved || req.isAdmin;
    // التحقّق بخطوتين لكل حساب بريدي. حساب المالك المنقول اسمٌ بلا بريد، فلا رمز
    // يُرسل إليه — يبقى بكلمة السر وحدها.
    req.needsDevice = validateEmail(creds.user) === null;
    next();
  }

  // البيانات تتطلّب كلمة السر ومفتاح جهاز موثوق معاً
  async function checkDevice(req, res, next) {
    if (req.needsDevice && !await devices.has(req.userKey, req.get('X-Device'))) {
      return res.status(401).json({ error: 'جهاز غير موثوق — ادخل من جديد' });
    }
    next();
  }
  const signedIn = [checkPassword, checkDevice];

  // البيانات تتطلّب فوق ذلك موافقة المشرف على الحساب
  function checkApproved(req, res, next) {
    if (!req.approved) return res.status(403).json({ error: 'الحساب بانتظار موافقة المشرف' });
    next();
  }
  const requireAccount = [...signedIn, checkApproved];

  // حالة الحساب للتطبيق: هل وُوفق عليه، وهل هو المشرف
  app.get('/api/auth/me', signedIn, async (req, res) => {
    res.json({ name: await accounts.nameOf(req.email), approved: req.approved, admin: req.isAdmin });
  });

  registerAdminRoutes(app, { accounts, signedIn, adminName });

  // ─── التسجيل بالبريد، الدخول بخطوتين، واسترجاع كلمة السر ───
  registerAuthRoutes(app, {
    accounts,
    otps,
    devices,
    sendMail,
    ipMail: createLimiter(cfg.ipMail),
    emailMail: createLimiter(cfg.emailMail),
    clientIp,
    checkPassword,
  });

  // سجلّ بطابع زمني لكل مستخدم: الحالة (state) وسجلّ الختمات (list) بالعقد نفسه
  function versioned(route, file, field, isValid, empty) {
    app.get(route, requireAccount, async (req, res) => {
      res.json(await store.read(req.userKey, file, empty));
    });

    app.put(route, requireAccount, async (req, res) => {
      const { baseUpdatedAt, writeId } = req.body || {};
      const value = req.body?.[field];
      if (!isValid(value) || typeof baseUpdatedAt !== 'number') {
        return res.status(400).json({ error: 'حمولة غير صالحة' });
      }
      const current = await store.read(req.userKey, file, empty);
      // إعادة إرسال لكتابة قبِلناها سلفاً (ضاع ردّها على شبكة بطيئة): نجاح مكرّر لا تعارض.
      // بدون هذا، إعادة المحاولة كانت تصطدم بـ409 من كتابتها هي نفسها وتُعطّل المزامنة.
      if (writeId && writeId === current.writeId) {
        return res.json({ ok: true, updatedAt: current.updatedAt });
      }
      // تزامن متفائل: الجهاز يرفع مستنداً إلى النسخة التي رآها آخر مرّة.
      // إن تغيّرت على الخادم منذ ذلك الحين فهذا تعارض حقيقي — نرفض الرفع
      // ونطلب من الجهاز السحب أوّلاً، بدل أن يكتب نسخته القديمة فوق الأحدث.
      if (baseUpdatedAt !== current.updatedAt) {
        return res.status(409).json({ error: 'تعارض: النسخة تغيّرت على الخادم', updatedAt: current.updatedAt });
      }
      // ساعة الخادم وحدها هي المرجع — لا نثق بساعات الأجهزة (اختلافها يكسر «آخر تعديل يفوز»)
      const updatedAt = Date.now();
      await store.write(req.userKey, file, { updatedAt, [field]: value, writeId });
      res.json({ ok: true, updatedAt });
    });
  }

  versioned('/api/state', 'state.json', 'state',
    v => typeof v === 'object' && v !== null, { updatedAt: 0, state: null });
  versioned('/api/khitma', 'khitma.json', 'list',
    v => Array.isArray(v), { updatedAt: 0, list: [] });

  return { app, store, accounts };
}
