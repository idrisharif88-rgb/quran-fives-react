import { promises as fs } from 'node:fs';
import path from 'node:path';

// ─── سجلّ الأمان: ما يحاوله الناس على الخادم، لا ما يفعلونه في التطبيق ───
// المهاجم الحقيقي يتجاوز التطبيق ويطلب الخادم مباشرة، فالخادم وحده يرى كل محاولة.
// يُسجَّل: كل طلب مرفوض (دخول خاطئ، حظر، مسارات المالك، طلبات تالفة، مسارات لا وجود لها، رفع مرفوض)،
// والأفعال الحسّاسة الناجحة (حساب جديد، جهاز جديد، تغيير كلمة السر، حذف حساب، صلاحيات).
// لا يُسجَّل الاستعمال العادي (قراءة الحالة ورفعها، التفسير، المكتبة) ولا كلمات السر أبداً.

export const SECURITY_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const dayName = (ms) => new Date(ms).toISOString().slice(0, 10);

// الأفعال الحسّاسة الناجحة: «METHOD path» ← النوع
const ACTIONS = {
  'POST /api/auth/verify': 'account_created',
  'POST /api/auth/login': 'login',
  'POST /api/khitma/auth': 'login',
  'POST /api/auth/login/confirm': 'new_device',
  'POST /api/auth/reset/request': 'reset_requested',
  'POST /api/auth/reset/confirm': 'password_reset',
  'POST /api/auth/session': 'web_session',
  'POST /api/account/delete': 'account_deleted',
  'POST /api/account/delete/confirm': 'account_deleted',
  'POST /api/admin/users/approval': 'admin_change',
  'POST /api/admin/users/permission': 'admin_change',
  'POST /api/admin/errors/config': 'admin_change',
};
const WARN_ACTIONS = new Set(['password_reset', 'account_deleted', 'reset_requested']);

/** نوع الحدث ودرجته (info | warn | alert)، أو null لما لا يُسجَّل */
export function classify({ method, path: p, status, matched, approved, isAdmin }) {
  if (!p.startsWith('/api/') || p === '/api/errors' || p === '/api/health') return null;
  if (status < 400 && status >= 300) return null;              // 304 وأمثالها: نسخة محفوظة، لا رفض
  if (status < 300) {
    const type = ACTIONS[`${method} ${p}`];
    if (!type) return null;
    // المالك نفسه يغيّر الصلاحيات: فعل عادي يُحفظ للمراجعة
    return { type, level: WARN_ACTIONS.has(type) ? 'warn' : 'info' };
  }
  if (status === 409 || status >= 500) return null;           // تعارض المزامنة طبيعي، والأعطال في سجلّ الأخطاء
  if (!matched && status === 404) return { type: 'probe', level: 'alert' };   // مسار لا وجود له: تجسّس على الخادم
  if (!matched) return { type: 'bad_request', level: 'warn' };  // حمولة تالفة رفضها قارئ JSON قبل المسار
  if (status === 429) return { type: 'rate_limited', level: 'alert' };
  if (status === 401) return { type: 'auth_failed', level: 'warn' };
  if (status === 403) {
    if (p.startsWith('/api/admin/') && !isAdmin) return { type: 'admin_denied', level: 'alert' };
    if (approved === false) return null;                      // حساب بانتظار الموافقة: متوقَّع
    return { type: 'permission_denied', level: 'warn' };
  }
  if (status === 413 || status === 507) return { type: 'upload_refused', level: 'warn' };
  if (status === 404) return null;                            // ملف غير موجود في مسار صحيح
  return { type: 'bad_request', level: 'warn' };
}

// الاسم المدّعى في الطلب (قبل التحقّق): من ترويسة Basic أو من الحمولة. كلمة السر لا تُقرأ أبداً.
function claimedUser(req) {
  const auth = req.get('Authorization') || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep > 0) return decoded.slice(0, sep).slice(0, 120);
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (typeof body.user === 'string') return body.user.slice(0, 120);
  return req.get('X-Khitma-User')?.slice(0, 120);
}

const maskIp = (ip) => (ip ? ip.replace(/\.\d+$/, '.x').replace(/:[\da-f]*$/i, ':x') : undefined);
// المعرّفات في المسار (ملف، مقطع) لا تفيد المراجعة
const cleanPath = (p) => p.replace(/\/[A-Za-z0-9_-]{16,}(?=\/|$)/g, '/:id').slice(0, 120);

export function createSecurityLog(dataDir) {
  const dir = path.join(dataDir, 'security');
  let lastPrune = 0;

  async function write(entry) {
    const now = entry.at;
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, `${dayName(now)}.jsonl`), JSON.stringify(entry) + '\n');
    if (now - lastPrune > 60 * 60 * 1000) {
      lastPrune = now;
      const oldest = dayName(now - SECURITY_RETENTION_DAYS * DAY_MS);
      for (const name of await fs.readdir(dir).catch(() => [])) {
        if (name.endsWith('.jsonl') && name.slice(0, 10) < oldest) await fs.rm(path.join(dir, name), { force: true });
      }
    }
  }

  async function read(days, now = Date.now()) {
    const out = [];
    for (let d = 0; d < days; d++) {
      const text = await fs.readFile(path.join(dir, `${dayName(now - d * DAY_MS)}.jsonl`), 'utf8').catch(() => '');
      for (const line of text.split('\n')) {
        if (!line) continue;
        try { out.push(JSON.parse(line)); } catch { /* سطر تالف */ }
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }

  /** وسيط express: يراقب كل طلب ويكتب ما يستحقّ بعد انتهاء الردّ */
  function middleware(clientIp) {
    return (req, res, next) => {
      res.on('finish', () => {
        const event = classify({
          method: req.method, path: req.path, status: res.statusCode,
          matched: Boolean(req.route), approved: req.approved, isAdmin: req.isAdmin,
        });
        if (!event) return;
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const detail = event.type === 'admin_change'
          ? [body.user, body.permission, body.approved ?? body.allowed ?? body.enabled].filter((v) => v !== undefined).join(' · ').slice(0, 160)
          : undefined;
        write({
          at: Date.now(),
          ...event,
          method: req.method,
          path: cleanPath(req.path),
          status: res.statusCode,
          user: req.email || claimedUser(req),
          verified: Boolean(req.email),   // الحساب تحقّق منه الخادم، لا مجرّد اسم مكتوب في الطلب
          ip: maskIp(clientIp(req)),
          ua: (req.get('User-Agent') || '').slice(0, 200) || undefined,
          detail,
        }).catch(() => { /* السجلّ لا يُسقط الخادم */ });
      });
      next();
    };
  }

  return { middleware, read };
}

export function registerSecurityRoutes(app, { log, signedIn }) {
  const requireAdmin = [...signedIn, (req, res, next) => {
    if (!req.isAdmin) return res.status(403).json({ error: 'للمشرف فقط' });
    next();
  }];
  app.get('/api/admin/security', requireAdmin, async (req, res) => {
    const days = Math.max(1, Math.min(SECURITY_RETENTION_DAYS, Number(req.query.days) || 7));
    const entries = await log.read(days);
    res.json({ entries: entries.slice(0, 3000), total: entries.length });
  });
}
