import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages', 'delete-account.html');
const BAD_OTP = { error: 'رمز التأكيد غير صحيح أو منتهي الصلاحية' };
const ADMIN_REFUSED = { error: 'حساب المشرف لا يُحذف' };

// حذف الحساب وكل بياناته وملفاته من الخادم — يشترطه جوجل بلاي داخل التطبيق وبرابط ويب.
// التطبيق: كلمة السر + مفتاح الجهاز (signedIn) تكفيان، ولو لم يوافق المشرف على الحساب بعد.
// صفحة الويب: لا مفتاح جهاز فيها، فتثبت الملكية بكلمة السر ثم رمز بالبريد.
// حساب المشرف لا يُحذف من هنا، فلا تضيع لوحة الإدارة بضغطة.
export function registerAccountDeleteRoutes(app, { accounts, otps, signedIn, checkPassword, mailOtp, fail, deleteAccount }) {
  app.get('/delete-account', (req, res) => res.sendFile(PAGE));

  app.post('/api/account/delete', signedIn, async (req, res) => {
    if (req.isAdmin) return res.status(400).json(ADMIN_REFUSED);
    await deleteAccount(req.userKey);
    res.json({ ok: true });
  });

  // الويب، الخطوة 1: كلمة السر صحيحة ← رمز بالبريد
  app.post('/api/account/delete/request', checkPassword, async (req, res) => {
    if (req.isAdmin) return res.status(400).json(ADMIN_REFUSED);
    const status = await mailOtp(req, 'delete', req.email, await accounts.nameOf(req.email));
    if (status) return fail(res, status);
    res.status(202).json({ ok: true, pending: true });
  });

  // الويب، الخطوة 2: الرمز ← الحذف
  app.post('/api/account/delete/confirm', checkPassword, async (req, res) => {
    if (req.isAdmin) return res.status(400).json(ADMIN_REFUSED);
    const { otp } = req.body || {};
    if (typeof otp !== 'string' || !await otps.consume('delete', req.userKey, otp)) {
      return res.status(400).json(BAD_OTP);
    }
    await deleteAccount(req.userKey);
    res.json({ ok: true });
  });
}
