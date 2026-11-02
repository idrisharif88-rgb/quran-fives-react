import { Capacitor } from '@capacitor/core';
import { createSession, revokeSession } from './cloudSync';

// ─── جلسة الموقع ───
// المتصفح لا يحفظ كلمة السر: تُبدَّل بعد الدخول بمفتاح جلسة (server/sessions.js) يحلّ محلّها في code.
// التطبيق يبقى على حاله: كلمة السر محفوظة في مساحته الخاصة.
const usesSession = () => !Capacitor.isNativePlatform();

// بيانات الحساب كما تُحفظ على هذا الجهاز. فشل التبديل يُفشل الدخول، فلا تُحفظ الكلمة أبداً.
export async function storableCreds(creds) {
  if (!usesSession()) return creds;
  const { token } = await createSession(creds);
  return { ...creds, code: token };
}

// في المتصفح لا كلمة سر محفوظة تُقارن بها الكلمة المكتوبة (useAccountDelete)
export const holdsPassword = () => !usesSession();

// لا يمنع فشله الخروج: المفتاح يُمحى من الجهاز على أي حال، وعلى الخادم ينتهي بعمره
export async function endWebSession() {
  if (!usesSession()) return;
  await revokeSession().catch(() => {});
}
