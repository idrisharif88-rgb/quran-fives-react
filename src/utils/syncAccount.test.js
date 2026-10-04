import { describe, it, expect } from 'vitest';
import { authHeaders, validateName, validateEmail, validateCode, readKnownEmails, rememberEmail, forgetEmail } from './syncAccount';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};

// الخادم يفكّ الترويسة هكذا (server/app.js)
const decode = (headers) => new TextDecoder().decode(
  Uint8Array.from(atob(headers.Authorization.slice(6)), c => c.charCodeAt(0)),
);

describe('authHeaders', () => {
  it('يرسل اسماً عربياً بترميز يفكّه الخادم كما هو', () => {
    expect(decode(authHeaders({ user: 'أحمد', code: 'سرّ123' }))).toBe('أحمد:سرّ123');
  });

  it('قيمة الترويسة ASCII فقط — fetch يرفض غيرها', () => {
    expect(authHeaders({ user: 'أحمد', code: '123456' }).Authorization).toMatch(/^Basic [A-Za-z0-9+/=]+$/);
  });

  it('مفتاح الجهاز الموثوق يُرسل إن وُجد فقط', () => {
    expect(authHeaders({ user: 'a@b.co', code: '123456', device: 'tok' })['X-Device']).toBe('tok');
    expect(authHeaders({ user: 'owner', code: '12345' })).not.toHaveProperty('X-Device');
  });

  it('بلا حساب لا ترويسة', () => {
    expect(authHeaders(null)).toEqual({});
  });
});

describe('شروط الحساب الجديد', () => {
  it('البريد: يقبل الصحيح ويرفض الاسم المجرّد والنقطتين', () => {
    expect(validateEmail('ahmad@example.com')).toBeNull();
    expect(validateEmail('ahmad')).toBeTruthy();
    expect(validateEmail('ahmad@example')).toBeTruthy();
    expect(validateEmail('a:b@example.com')).toBeTruthy();
    expect(validateEmail('a b@example.com')).toBeTruthy();
  });

  it('الاسم: حرفان على الأقل وبلا وسوم', () => {
    expect(validateName('أحمد علي')).toBeNull();
    expect(validateName('أ')).toBeTruthy();
    expect(validateName('<b>x</b>')).toBeTruthy();
  });

  it('كلمة السر: 6 أحرف على الأقل', () => {
    expect(validateCode('123456')).toBeNull();
    expect(validateCode('12345')).toBeTruthy();
  });
});

describe('البُرُد المحفوظة للدخول السريع', () => {
  it('الأحدث أوّلاً، بلا تكرار، وخمسة على الأكثر', () => {
    mem.clear();
    expect(readKnownEmails()).toEqual([]);
    for (const n of [1, 2, 3, 4, 5, 6]) rememberEmail(`u${n}@example.com`);
    rememberEmail('u3@example.com');
    expect(readKnownEmails()).toEqual(['u3@example.com', 'u6@example.com', 'u5@example.com', 'u4@example.com', 'u2@example.com']);
  });

  it('نسيان بريد يُبقي غيره', () => {
    mem.clear();
    rememberEmail('a@example.com');
    rememberEmail('b@example.com');
    expect(forgetEmail('b@example.com')).toEqual(['a@example.com']);
    expect(readKnownEmails()).toEqual(['a@example.com']);
  });
});
