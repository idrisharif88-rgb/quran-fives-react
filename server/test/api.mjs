import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { migrateLegacyOwner } from '../accounts.js';

let dataDir, server, base, main;

// device: مفتاح الجهاز الموثوق (التحقّق بخطوتين) — حساب المالك القديم لا يحتاجه
const basic = (user, code, device) => ({
  Authorization: 'Basic ' + Buffer.from(`${user}:${code}`).toString('base64'),
  ...(device ? { 'X-Device': device } : {}),
});
const devices = {}; // مفتاح جهاز كل مستخدم أنشأته الاختبارات

async function call(method, route, { headers = {}, body } = {}, origin = base) {
  const res = await fetch(origin + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

// صندوق صادر وهمي بدل Resend: آخر رمز أُرسل إلى كل بريد
const outbox = new Map();
const sendMail = async ({ to, subject, text, html }) => {
  const otp = text.match(/\d{6}/)[0];
  // الرمز في العنوان (يظهر في الإشعار) وفي نسخة HTML أيضاً
  assert.ok(subject.startsWith(otp), subject);
  assert.ok(html.includes(`>${otp}</div>`));
  outbox.set(to, otp);
};

// تسجيل كامل: طلب ثم تأكيد بالرمز المُرسل
async function signUp(user, code, origin = base) {
  const asked = await call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user, code } }, origin);
  if (asked.status !== 202) return asked;
  const done = await call('POST', '/api/auth/verify', { body: { user, otp: outbox.get(user.trim().toLowerCase()) } }, origin);
  devices[user] = done.json.device;
  if (origin === base) await main.accounts.setApproved(user, true);   // موافقة المشرف
  return done;
}

async function start(options) {
  const { app, store, accounts } = createApp({ sendMail, ...options });
  const srv = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  return { srv, store, accounts, origin: `http://127.0.0.1:${srv.address().port}` };
}

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-sync-'));
  // حالة الخادم القديم: ملفّان مشتركان يملكهما المالك
  await fs.writeFile(path.join(dataDir, 'state.json'), JSON.stringify({ updatedAt: 111, state: { currentIndex: 7 }, writeId: 'w0' }));
  await fs.writeFile(path.join(dataDir, 'khitma.json'), JSON.stringify({ updatedAt: 222, list: [{ id: '1' }] }));
  const s = await start({ dataDir, maxUsers: 3, adminUser: 'Owner' });
  server = s.srv; base = s.origin; main = s;
  assert.equal(await migrateLegacyOwner({ ...s, dataDir, user: 'Owner', code: '12345' }), true);
  // لا يتكرّر النقل
  assert.equal(await migrateLegacyOwner({ ...s, dataDir, user: 'Owner', code: '12345' }), false);
});

after(async () => {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('المالك يحتفظ ببياناته وطوابعها بعد النقل، بالترويسات القديمة والجديدة', async () => {
  const legacy = { 'X-Khitma-User': 'Owner', 'X-Khitma-Code': '12345' };
  const auth = await call('POST', '/api/khitma/auth', { headers: legacy });
  assert.equal(auth.status, 200);
  assert.equal(auth.json.name, 'owner');   // حساب قديم بلا اسم: يُرحَّب باسم دخوله
  const state = await call('GET', '/api/state', { headers: basic('owner', '12345') });
  assert.deepEqual(state.json, { updatedAt: 111, state: { currentIndex: 7 }, writeId: 'w0' });
  const khitma = await call('GET', '/api/khitma', { headers: legacy });
  assert.deepEqual(khitma.json, { updatedAt: 222, list: [{ id: '1' }] });
});

test('طلب بلا حساب مرفوض، والرمز المشترك القديم لا يفتح شيئاً', async () => {
  assert.equal((await call('GET', '/api/state')).status, 401);
  assert.equal((await call('GET', '/api/state', { headers: { 'X-Sync-Code': 'anything' } })).status, 401);
  assert.equal((await call('GET', '/api/state', { headers: basic('owner', 'wrong') })).status, 401);
  assert.equal((await call('GET', '/api/health')).status, 200);
});

test('التسجيل بالبريد: لا حساب قبل تأكيد الرمز', async () => {
  const reg = (user, code) => call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user, code } });
  assert.equal((await reg('ahmad', '123456')).status, 400);          // ليس بريداً
  assert.equal((await reg('a:b@x.com', '123456')).status, 400);
  assert.equal((await reg('ahmad@example.com', '123')).status, 400); // كلمة سر قصيرة

  assert.equal((await reg(' Ahmad@Example.com ', 'secret1')).status, 202);
  const ahmad = basic('ahmad@example.com', 'secret1');
  assert.equal((await call('POST', '/api/auth/login', { headers: ahmad })).status, 401);

  const verify = (otp) => call('POST', '/api/auth/verify', { body: { user: 'ahmad@example.com', otp } });
  const otp = outbox.get('ahmad@example.com');
  assert.equal((await verify(otp === '000000' ? '000001' : '000000')).status, 400);
  const verified = await verify(otp);
  assert.equal(verified.status, 201);
  devices.ahmad = verified.json.device;                              // تأكيد البريد يوثّق الجهاز
  assert.equal(verified.json.name, 'أحمد علي');                       // اسم الترحيب
  // بلا اسم لا تسجيل
  assert.equal((await call('POST', '/api/auth/register', { body: { user: 'noname@example.com', code: '123456' } })).status, 400);
  assert.equal((await verify(otp)).status, 400);                     // الرمز يُستعمل مرّة
});

test('موافقة المشرف: الحساب الجديد لا يزامن قبلها، والمشرف وحده يوافق', async () => {
  const ahmad = basic('ahmad@example.com', 'secret1', devices.ahmad);
  const owner = basic('owner', '12345');
  // داخلٌ لكن بانتظار الموافقة
  assert.deepEqual((await call('GET', '/api/auth/me', { headers: ahmad })).json, { name: 'أحمد علي', approved: false, admin: false, hifzCustomStart: false });
  assert.equal((await call('GET', '/api/state', { headers: ahmad })).status, 403);
  assert.equal((await call('PUT', '/api/khitma', { headers: ahmad, body: { list: [], baseUpdatedAt: 0 } })).status, 403);
  // غير المشرف لا يرى اللوحة ولا يوافق على نفسه
  assert.equal((await call('GET', '/api/admin/users', { headers: ahmad })).status, 403);
  const approve = (headers, user, approved) => call('POST', '/api/admin/users/approval', { headers, body: { user, approved } });
  assert.equal((await approve(ahmad, 'ahmad@example.com', true)).status, 403);

  assert.deepEqual((await call('GET', '/api/auth/me', { headers: owner })).json, { name: 'owner', approved: true, admin: true, hifzCustomStart: true });
  const listed = await call('GET', '/api/admin/users', { headers: owner });
  assert.deepEqual(listed.json.users.map(u => [u.user, u.approved, u.admin]), [['ahmad@example.com', false, false], ['owner', true, true]]);
  assert.equal('hash' in listed.json.users[0], false);

  assert.equal((await approve(owner, 'nobody@example.com', true)).status, 404);
  assert.equal((await approve(owner, 'owner', false)).status, 400);
  assert.equal((await approve(owner, 'ahmad@example.com', true)).status, 200);
  assert.equal((await call('GET', '/api/state', { headers: ahmad })).status, 200);
  // سحب الموافقة يوقف المزامنة ثم تعود
  await approve(owner, 'ahmad@example.com', false);
  assert.equal((await call('GET', '/api/state', { headers: ahmad })).status, 403);
  await approve(owner, 'ahmad@example.com', true);

  // صلاحية بدء الحفظ من آية محدّدة: يمنحها المشرف لحساب بعينه
  const permit = (headers, body) => call('POST', '/api/admin/users/permission', { headers, body });
  const grant = { user: 'ahmad@example.com', permission: 'hifzCustomStart', allowed: true };
  assert.equal((await permit(ahmad, grant)).status, 403);                       // لا يمنح نفسه
  assert.equal((await permit(owner, { ...grant, permission: 'admin' })).status, 400);
  assert.equal((await permit(owner, { ...grant, user: 'nobody@example.com' })).status, 404);
  assert.equal((await permit(owner, grant)).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { headers: ahmad })).json.hifzCustomStart, true);
  const withPermission = (await call('GET', '/api/admin/users', { headers: owner })).json.users.find(u => u.user === 'ahmad@example.com');
  assert.equal(withPermission.hifzCustomStart, true);
  assert.equal(withPermission.approved, true);                                   // الصلاحية لا تمسّ الموافقة
  assert.equal((await permit(owner, { ...grant, allowed: false })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { headers: ahmad })).json.hifzCustomStart, false);
  // البريد المسجّل لا يُسجَّل ثانية
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user: 'AHMAD@example.com', code: 'another1' } })).status, 409);
});

test('كل مستخدم يرى بياناته وحده', async () => {
  const ahmad = basic('ahmad@example.com', 'secret1', devices.ahmad);
  const fresh = await call('GET', '/api/state', { headers: ahmad });
  assert.deepEqual(fresh.json, { updatedAt: 0, state: null });

  const put = await call('PUT', '/api/state', { headers: ahmad, body: { state: { currentIndex: 99 }, baseUpdatedAt: 0, writeId: 'a1' } });
  assert.equal(put.status, 200);
  // إعادة الإرسال نفسها: نجاح مكرّر بالطابع نفسه
  const replay = await call('PUT', '/api/state', { headers: ahmad, body: { state: { currentIndex: 99 }, baseUpdatedAt: 0, writeId: 'a1' } });
  assert.deepEqual(replay.json, put.json);
  // أساس قديم: تعارض
  const stale = await call('PUT', '/api/state', { headers: ahmad, body: { state: {}, baseUpdatedAt: 0, writeId: 'a2' } });
  assert.equal(stale.status, 409);

  const owner = await call('GET', '/api/state', { headers: basic('owner', '12345') });
  assert.equal(owner.json.state.currentIndex, 7);
  assert.equal((await call('GET', '/api/state', { headers: ahmad })).json.state.currentIndex, 99);

  const kh = await call('PUT', '/api/khitma', { headers: ahmad, body: { list: [{ id: 'x' }], baseUpdatedAt: 0, writeId: 'k1' } });
  assert.equal(kh.status, 200);
  assert.equal((await call('GET', '/api/khitma', { headers: basic('owner', '12345') })).json.list[0].id, '1');
  assert.equal((await call('PUT', '/api/khitma', { headers: ahmad, body: { list: 'no', baseUpdatedAt: 0 } })).status, 400);
});

test('الدخول بخطوتين: كلمة السر وحدها لا تفتح البيانات من جهاز جديد', async () => {
  const pass = basic('ahmad@example.com', 'secret1');
  assert.equal((await call('GET', '/api/state', { headers: pass })).status, 401);
  assert.equal((await call('GET', '/api/state', { headers: basic('ahmad@example.com', 'secret1', 'forged') })).status, 401);

  outbox.delete('ahmad@example.com');
  // كلمة سر خاطئة لا تُرسل بريداً
  assert.equal((await call('POST', '/api/auth/login', { headers: basic('ahmad@example.com', 'wrong') })).status, 401);
  assert.equal(outbox.has('ahmad@example.com'), false);

  assert.equal((await call('POST', '/api/auth/login', { headers: pass })).status, 202);
  const otp = outbox.get('ahmad@example.com');
  const confirm = (o) => call('POST', '/api/auth/login/confirm', { headers: pass, body: { otp: o } });
  assert.equal((await confirm(otp === '000000' ? '000001' : '000000')).status, 400);
  const done = await confirm(otp);
  assert.equal(done.status, 200);
  assert.equal(done.json.name, 'أحمد علي');
  assert.equal((await confirm(otp)).status, 400);

  const second = basic('ahmad@example.com', 'secret1', done.json.device);
  assert.equal((await call('GET', '/api/state', { headers: second })).json.state.currentIndex, 99);
  // الجهاز الموثوق يدخل بلا رمز جديد، والجهاز الأوّل ما زال يعمل
  assert.equal((await call('POST', '/api/auth/login', { headers: second })).status, 200);
  assert.equal((await call('GET', '/api/state', { headers: basic('ahmad@example.com', 'secret1', devices.ahmad) })).status, 200);
  // مفتاح جهاز حسابٍ لا يفتح حساباً آخر
  assert.equal((await call('GET', '/api/state', { headers: basic('owner', 'wrong', done.json.device) })).status, 401);
});

test('استرجاع كلمة السر: الرمز يبدّلها ويُخرج الأجهزة السابقة والبيانات تبقى', async () => {
  const ask = (user) => call('POST', '/api/auth/reset/request', { body: { user } });
  // بريد غير مسجّل: الردّ نفسه ولا رسالة
  assert.equal((await ask('nobody@example.com')).status, 200);
  assert.equal(outbox.has('nobody@example.com'), false);

  assert.equal((await ask('ahmad@example.com')).status, 200);
  const otp = outbox.get('ahmad@example.com');
  const confirm = (o, code) => call('POST', '/api/auth/reset/confirm', { body: { user: 'ahmad@example.com', otp: o, code } });
  assert.equal((await confirm(otp, '123')).status, 400);              // كلمة قصيرة لا تُتلف الرمز
  const done = await confirm(otp, 'newsecret');
  assert.equal(done.status, 200);
  assert.equal((await call('POST', '/api/auth/login', { headers: basic('ahmad@example.com', 'secret1') })).status, 401);
  // الجهاز القديم خرج حتى مع الكلمة الجديدة
  assert.equal((await call('GET', '/api/state', { headers: basic('ahmad@example.com', 'newsecret', devices.ahmad) })).status, 401);
  const state = await call('GET', '/api/state', { headers: basic('ahmad@example.com', 'newsecret', done.json.device) });
  assert.equal(state.json.state.currentIndex, 99);
});

test('السقف MAX_USERS يوقف التسجيل دون أن يمسّ الحسابات القائمة', async () => {
  assert.equal((await signUp('third@example.com', '123456')).status, 201);
  const full = await call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user: 'fourth@example.com', code: '123456' } });
  assert.equal(full.status, 403);
  assert.equal((await call('POST', '/api/auth/login', { headers: basic('third@example.com', '123456', devices['third@example.com']) })).status, 200);
});

test('رمز التأكيد: ينتهي بالوقت ويسقط بعد 5 محاولات خاطئة', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-sync-otp-'));
  let clock = 1000;
  const s = await start({ dataDir: dir, otpOptions: { ttlMs: 500, now: () => clock } });
  const reg = (user) => call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user, code: '123456' } }, s.origin);
  const verify = (user, otp) => call('POST', '/api/auth/verify', { body: { user, otp } }, s.origin);
  try {
    await reg('late@example.com');
    clock += 501;
    assert.equal((await verify('late@example.com', outbox.get('late@example.com'))).status, 400);

    await reg('guess@example.com');
    const otp = outbox.get('guess@example.com');
    const wrong = otp === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) assert.equal((await verify('guess@example.com', wrong)).status, 400);
    assert.equal((await verify('guess@example.com', otp)).status, 400);
  } finally {
    s.srv.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('تحديد المحاولات: دخول فاشل متكرّر ورسائل بريد متكرّرة', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-sync-rl-'));
  const s = await start({
    dataDir: dir,
    limits: {
      ipMail: { windowMs: 60000, max: 4 },
      emailMail: { windowMs: 60000, max: 2 },
      ipFails: { windowMs: 60000, max: 3 },
      userFails: { windowMs: 60000, max: 50 },
    },
  });
  const reg = (user) => call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user, code: '123456' } }, s.origin);
  try {
    // البريد الواحد: رسالتان ثم رفض
    assert.equal((await reg('u1@example.com')).status, 202);
    assert.equal((await reg('u1@example.com')).status, 202);
    assert.equal((await reg('u1@example.com')).status, 429);
    // العنوان الواحد: 4 رسائل إجمالاً ثم رفض
    assert.equal((await reg('u2@example.com')).status, 202);
    assert.equal((await reg('u3@example.com')).status, 202);
    assert.equal((await reg('u4@example.com')).status, 429);

    const made = await call('POST', '/api/auth/verify', { body: { user: 'u2@example.com', otp: outbox.get('u2@example.com') } }, s.origin);
    assert.equal(made.status, 201);
    const u2 = (code) => call('POST', '/api/auth/login', { headers: basic('u2@example.com', code, made.json.device) }, s.origin);

    // طلبات بلا بيانات دخول لا تُحتسب محاولات فاشلة
    for (let i = 0; i < 5; i++) await call('GET', '/api/state', {}, s.origin);
    assert.equal((await u2('123456')).status, 200);

    for (let i = 0; i < 3; i++) assert.equal((await u2('bad')).status, 401);
    // بعد بلوغ الحدّ يُرفض حتى الرمز الصحيح
    assert.equal((await u2('123456')).status, 429);
  } finally {
    s.srv.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('نقل المالك إلى بريد: يدخل بكلمة سرّه القديمة ورمز البريد ويجد بياناته', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-sync-owner-'));
  await fs.writeFile(path.join(dir, 'state.json'), JSON.stringify({ updatedAt: 111, state: { currentIndex: 7 } }));
  const s = await start({ dataDir: dir });
  try {
    assert.equal(await migrateLegacyOwner({ ...s, dataDir: dir, user: 'me@example.com', code: '12345', name: 'المالك' }), true);
    const pass = basic('me@example.com', '12345');   // كلمة سر أقصر من شرط التسجيل الجديد تبقى صالحة
    assert.equal((await call('GET', '/api/state', { headers: pass }, s.origin)).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { headers: pass }, s.origin)).status, 202);
    const done = await call('POST', '/api/auth/login/confirm', { headers: pass, body: { otp: outbox.get('me@example.com') } }, s.origin);
    assert.equal(done.json.name, 'المالك');
    const state = await call('GET', '/api/state', { headers: basic('me@example.com', '12345', done.json.device) }, s.origin);
    assert.deepEqual(state.json, { updatedAt: 111, state: { currentIndex: 7 } });
  } finally {
    s.srv.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('فشل خدمة البريد يُعلن 503 ولا يُنشئ حساباً', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-sync-mail-'));
  const s = await start({ dataDir: dir, sendMail: async () => { throw new Error('down'); } });
  try {
    const r = await call('POST', '/api/auth/register', { body: { name: 'أحمد علي', user: 'x@example.com', code: '123456' } }, s.origin);
    assert.equal(r.status, 503);
    assert.equal(await s.accounts.exists('x@example.com'), false);
  } finally {
    s.srv.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
