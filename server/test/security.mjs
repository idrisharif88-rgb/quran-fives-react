// تصنيف أحداث سجلّ الأمان: المرفوض والحسّاس يُسجَّل، والعادي لا
import assert from 'node:assert/strict';
import { classify } from '../securityLog.js';

const c = (o) => classify({ method: 'GET', path: '/api/state', status: 200, matched: true, ...o });
assert.equal(c({}), null);                                                   // قراءة عادية
assert.equal(c({ status: 304 }), null);                                       // نسخة محفوظة
assert.equal(c({ status: 409 }), null);                                       // تعارض مزامنة
assert.equal(c({ status: 500 }), null);                                       // عطل: سجلّ الأخطاء
assert.equal(c({ status: 401 }).type, 'auth_failed');
assert.equal(c({ status: 429 }).level, 'alert');
assert.equal(c({ status: 404, matched: false, path: '/api/.env' }).type, 'probe');
assert.equal(c({ status: 400, matched: false, method: 'PUT' }).type, 'bad_request');
assert.equal(c({ status: 403, path: '/api/admin/users', isAdmin: false }).type, 'admin_denied');
assert.equal(c({ status: 403, approved: false }), null);                      // بانتظار الموافقة
assert.equal(c({ method: 'POST', path: '/api/auth/verify', status: 201 }).type, 'account_created');
assert.equal(c({ method: 'POST', path: '/api/account/delete', status: 200 }).level, 'warn');
assert.equal(c({ path: '/api/errors', method: 'POST', status: 400 }), null);  // سجلّ الأخطاء نفسه
console.log('security ok');
