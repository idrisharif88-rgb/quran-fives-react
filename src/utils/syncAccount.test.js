import { describe, it, expect } from 'vitest';
import { authHeaders, validateName, validateEmail, validateCode } from './syncAccount';

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
