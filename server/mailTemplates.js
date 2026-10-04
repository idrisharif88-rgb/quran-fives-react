// رسائل رموز التأكيد. الرمز في العنوان نفسه ليظهر في إشعار الهاتف دون فتح الرسالة،
// وفي المتن بأرقام كبيرة. HTML بجداول وأنماط مضمّنة: برامج البريد تتجاهل ما سواها.

const APP_NAME = 'خماسيات';
const VALID_MINUTES = 15;

const KINDS = {
  verify: {
    subject: (otp) => `${otp} هو رمز تأكيد حسابك في ${APP_NAME}`,
    title: 'تأكيد البريد الإلكتروني',
    lead: `أهلاً بك في ${APP_NAME}. أدخل الرمز التالي في التطبيق لإتمام إنشاء حسابك:`,
  },
  login: {
    subject: (otp) => `${otp} هو رمز الدخول إلى ${APP_NAME}`,
    title: 'تأكيد الدخول من جهاز جديد',
    lead: `طُلب الدخول إلى حسابك في ${APP_NAME} من جهاز جديد. أدخل الرمز التالي لتأكيد أنّه أنت:`,
  },
  reset: {
    subject: (otp) => `${otp} هو رمز استرجاع كلمة السر في ${APP_NAME}`,
    title: 'استرجاع كلمة السر',
    lead: `طُلب تغيير كلمة السر لحسابك في ${APP_NAME}. أدخل الرمز التالي لاختيار كلمة سر جديدة:`,
  },
};

const FONT = "'Segoe UI', Tahoma, Arial, sans-serif";

const escapeHtml = (s) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function html({ title, lead }, otp, name) {
  const greeting = name
    ? `<tr><td style="padding:24px 28px 0;color:#16211b;font-size:16px;font-weight:700;">مرحباً ${escapeHtml(name)}،</td></tr>`
    : '';
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f2f5f3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">رمزك ${otp} — صالح لمدة ${VALID_MINUTES} دقيقة.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f3;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;border:1px solid #e1e7e3;font-family:${FONT};direction:rtl;text-align:right;">
    <tr><td style="background:#0b5d2a;border-radius:14px 14px 0 0;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;">${APP_NAME}</td></tr>
    ${greeting}
    <tr><td style="padding:${name ? 10 : 28}px 28px 8px;color:#16211b;font-size:19px;font-weight:700;">${title}</td></tr>
    <tr><td style="padding:0 28px 20px;color:#3d4a43;font-size:15px;line-height:1.8;">${lead}</td></tr>
    <tr><td align="center" style="padding:4px 28px 22px;">
      <div dir="ltr" style="color:#000000;font-family:${FONT};font-size:40px;font-weight:700;letter-spacing:8px;line-height:1.2;">${otp}</div>
    </td></tr>
    <tr><td style="padding:0 28px 24px;color:#3d4a43;font-size:14px;line-height:1.8;">الرمز صالح لمدة <strong>${VALID_MINUTES} دقيقة</strong> ويُستعمل مرّة واحدة.</td></tr>
    <tr><td style="padding:18px 28px 24px;border-top:1px solid #e1e7e3;color:#6b7770;font-size:13px;line-height:1.8;">
      لا تشارك هذا الرمز مع أحد؛ فريق ${APP_NAME} لن يطلبه منك أبداً.<br>
      إن لم تطلب هذا الرمز فتجاهل هذه الرسالة، وحسابك في أمان.
    </td></tr>
  </table>
  <div style="max-width:480px;padding:14px 8px 0;color:#8a958f;font-family:${FONT};font-size:12px;direction:rtl;text-align:center;">رسالة آلية من ${APP_NAME} — لا تردّ عليها.</div>
</td></tr>
</table>
</body>
</html>`;
}

function text({ title, lead }, otp, name) {
  return [
    ...(name ? [`مرحباً ${name}،`, ''] : []),
    title,
    '',
    lead,
    '',
    otp,
    '',
    `الرمز صالح لمدة ${VALID_MINUTES} دقيقة ويُستعمل مرّة واحدة.`,
    'لا تشارك هذا الرمز مع أحد. إن لم تطلبه فتجاهل هذه الرسالة.',
  ].join('\n');
}

// kind: 'verify' | 'login' | 'reset'. name اختياري: يُحيّا به المستخدم في أوّل الرسالة.
export function otpMail(kind, otp, name = '') {
  const copy = KINDS[kind];
  return { subject: copy.subject(otp), text: text(copy, otp, name), html: html(copy, otp, name) };
}
