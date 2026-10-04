import { normalizeUser, userKey } from './store.js';
import { validateEmail, validateCode, validateName } from './accounts.js';
import { otpMail } from './mailTemplates.js';

const TOO_MANY = { error: 'محاولات كثيرة — حاول لاحقاً' };
const BAD_OTP = { error: 'رمز التأكيد غير صحيح أو منتهي الصلاحية' };

// التسجيل بالبريد على خطوتين (طلب ثم تأكيد برمز)، واسترجاع كلمة السر بالطريقة نفسها.
// الحساب لا يُنشأ ولا يُحتسب من السقف قبل تأكيد البريد.
// والدخول من جهاز جديد بخطوتين: كلمة السر ثم رمز بالبريد، وبعده يأخذ الجهاز مفتاحاً
// (device) يُغنيه عن الرمز لاحقاً. كل مسار يثبت ملكية البريد يمنح المفتاح.
export function registerAuthRoutes(app, { accounts, otps, devices, sendMail, ipMail, emailMail, clientIp, checkPassword }) {
  // يرسل رمزاً بالبريد. الحدّان (لكل عنوان ولكل بريد) يحميان رصيد خدمة الإرسال.
  // يعيد حالة HTTP للفشل، أو 0 عند النجاح.
  async function mailOtp(req, kind, email, name, payload) {
    const ip = clientIp(req);
    const key = userKey(email);
    if (ipMail.blocked(ip) || emailMail.blocked(key)) return 429;
    ipMail.hit(ip);
    emailMail.hit(key);
    const otp = await otps.issue(kind, key, payload);
    try {
      await sendMail({ to: email, ...otpMail(kind, otp, name) });
      return 0;
    } catch (e) {
      console.error('فشل إرسال البريد:', e.message);
      return 503;
    }
  }

  const fail = (res, status) => res.status(status)
    .json(status === 429 ? TOO_MANY : { error: 'تعذّر إرسال البريد — حاول لاحقاً' });

  // الخطوة 1: طلب حساب جديد ← يُرسل رمز التأكيد
  app.post('/api/auth/register', async (req, res) => {
    const { user, code, name } = req.body || {};
    const invalid = validateName(name) || validateEmail(user) || validateCode(code);
    if (invalid) return res.status(400).json({ error: invalid });
    const email = normalizeUser(user);
    const displayName = name.trim();
    if (await accounts.exists(email)) return res.status(409).json({ error: 'هذا البريد مسجّل' });
    if (await accounts.isFull()) return res.status(403).json({ error: 'اكتمل عدد المستخدمين' });
    const status = await mailOtp(req, 'verify', email, displayName, { ...await accounts.hashNew(code), name: displayName });
    if (status) return fail(res, status);
    res.status(202).json({ ok: true, pending: true });
  });

  // الخطوة 2: تأكيد البريد ← يُنشأ الحساب
  app.post('/api/auth/verify', async (req, res) => {
    const { user, otp } = req.body || {};
    if (validateEmail(user) || typeof otp !== 'string') return res.status(400).json(BAD_OTP);
    const email = normalizeUser(user);
    const hashed = await otps.consume('verify', userKey(email), otp);
    if (!hashed) return res.status(400).json(BAD_OTP);
    const result = await accounts.createFromHash(email, hashed);
    if (result === 'full') return res.status(403).json({ error: 'اكتمل عدد المستخدمين' });
    if (result === 'taken') return res.status(409).json({ error: 'هذا البريد مسجّل' });
    res.status(201).json({ ok: true, device: await devices.issue(userKey(email)), name: hashed.name });
  });

  // الدخول، الخطوة 1: كلمة السر صحيحة (checkPassword). جهاز موثوق أو حساب بلا بريد
  // يدخل مباشرة؛ غيرهما يُرسل إليه رمز.
  const login = async (req, res) => {
    if (!req.needsDevice || await devices.has(req.userKey, req.get('X-Device'))) {
      return res.json({ ok: true, name: await accounts.nameOf(req.email) });
    }
    const status = await mailOtp(req, 'login', req.email, await accounts.nameOf(req.email));
    if (status) return fail(res, status);
    res.status(202).json({ ok: true, pending: true });
  };
  app.post('/api/auth/login', checkPassword, login);
  app.post('/api/khitma/auth', checkPassword, login);   // مسار الإصدارات القديمة

  // الدخول، الخطوة 2: الرمز ← مفتاح الجهاز
  app.post('/api/auth/login/confirm', checkPassword, async (req, res) => {
    const { otp } = req.body || {};
    if (typeof otp !== 'string' || !await otps.consume('login', req.userKey, otp)) {
      return res.status(400).json(BAD_OTP);
    }
    res.json({ ok: true, device: await devices.issue(req.userKey), name: await accounts.nameOf(req.email) });
  });

  // استرجاع كلمة السر، الخطوة 1. الردّ واحد سواء وُجد الحساب أم لا، فلا يكشف
  // المسار أيّ البُرُد مسجّل.
  app.post('/api/auth/reset/request', async (req, res) => {
    const { user } = req.body || {};
    if (validateEmail(user)) return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
    const email = normalizeUser(user);
    if (await accounts.exists(email)) {
      const status = await mailOtp(req, 'reset', email, await accounts.nameOf(email));
      if (status) return fail(res, status);
    }
    res.json({ ok: true });
  });

  // استرجاع كلمة السر، الخطوة 2: الرمز + كلمة السر الجديدة
  app.post('/api/auth/reset/confirm', async (req, res) => {
    const { user, otp, code } = req.body || {};
    const invalid = validateCode(code);
    if (invalid) return res.status(400).json({ error: invalid });
    if (validateEmail(user) || typeof otp !== 'string') return res.status(400).json(BAD_OTP);
    const email = normalizeUser(user);
    if (!await otps.consume('reset', userKey(email), otp)) return res.status(400).json(BAD_OTP);
    if (!await accounts.setCode(email, code)) return res.status(400).json(BAD_OTP);
    // كلمة سر جديدة تُخرج كل الأجهزة السابقة؛ هذا الجهاز أثبت ملكية البريد للتو
    const key = userKey(email);
    await devices.clear(key);
    res.json({ ok: true, device: await devices.issue(key), name: await accounts.nameOf(email) });
  });
}
