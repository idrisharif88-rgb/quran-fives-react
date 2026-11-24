// عرض سجلّ الأمان (server/securityLog.js): أسماء الأحداث، والجهاز من User-Agent، والإحصاء.

export const EVENT_LABEL = {
  probe: 'مسار غير موجود (تجسّس)',
  rate_limited: 'حظر مؤقّت: محاولات كثيرة',
  admin_denied: 'محاولة دخول صفحات المالك',
  auth_failed: 'دخول مرفوض',
  permission_denied: 'ميزة غير مسموحة',
  upload_refused: 'رفع ملف مرفوض',
  bad_request: 'طلب تالف',
  account_created: 'حساب جديد',
  login: 'تسجيل دخول',
  new_device: 'جهاز جديد للحساب',
  reset_requested: 'طلب استرجاع كلمة السر',
  password_reset: 'تغيير كلمة السر',
  web_session: 'دخول من الموقع',
  account_deleted: 'حذف حساب',
  admin_change: 'تغيير من المالك',
};

export const LEVELS = ['alert', 'warn', 'info'];
export const LEVEL_LABEL = { alert: 'تنبيهات', warn: 'مرفوض', info: 'أفعال' };

/** الجهاز من User-Agent: طراز الهاتف من WebView التطبيق، أو المتصفح والنظام */
export function uaDevice(ua = '') {
  if (!ua) return '';
  const android = ua.match(/Android ([\d.]+);\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/);
  if (android && android[2] && android[2] !== 'K') return `${android[2]} · Android ${android[1]}`;
  if (/^node|curl|python|wget|go-http|okhttp/i.test(ua)) return `أداة برمجية: ${ua.split(/[\s/]/)[0]}`;
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ua.slice(0, 30);
  const os = (ua.match(/Android [\d.]+/) || ua.match(/iPhone OS [\d_]+/) || ua.match(/Windows NT [\d.]+/) || ua.match(/Mac OS X [\d_]+/) || ua.match(/Linux/) || [''])[0].replace(/_/g, '.');
  return [browser, os].filter(Boolean).join(' · ');
}

/** عدد كل درجة، وقائمة الحسابات بعدد أحداثها (الأكثر تنبيهات أولاً) */
export function summarize(entries) {
  const levels = { alert: 0, warn: 0, info: 0 };
  const users = new Map();
  for (const e of entries) {
    levels[e.level] = (levels[e.level] || 0) + 1;
    const key = e.user || '';
    const u = users.get(key) || { user: key, total: 0, alert: 0 };
    u.total += 1;
    if (e.level === 'alert') u.alert += 1;
    users.set(key, u);
  }
  return {
    levels,
    users: [...users.values()].sort((a, b) => b.alert - a.alert || b.total - a.total),
  };
}
