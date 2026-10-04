import { normalizeUser } from './store.js';

// لوحة المشرف: عرض الحسابات والموافقة عليها. للمشرف وحده (adminUser).
export function registerAdminRoutes(app, { accounts, signedIn, adminName }) {
  const requireAdmin = [...signedIn, (req, res, next) => {
    if (!req.isAdmin) return res.status(403).json({ error: 'للمشرف فقط' });
    next();
  }];

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const users = (await accounts.list()).map(u => {
      const admin = u.user === adminName;
      return { ...u, admin, approved: u.approved || admin };
    });
    res.json({ users });
  });

  // approved: true يسمح بالمزامنة، false يوقفها (بيانات الحساب تبقى)
  app.post('/api/admin/users/approval', requireAdmin, async (req, res) => {
    const { user, approved } = req.body || {};
    if (typeof user !== 'string' || typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'حمولة غير صالحة' });
    }
    if (normalizeUser(user) === adminName) return res.status(400).json({ error: 'لا يُعدَّل حساب المشرف' });
    if (!await accounts.setApproved(user, approved)) return res.status(404).json({ error: 'لا حساب بهذا الاسم' });
    res.json({ ok: true });
  });
}
