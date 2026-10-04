import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};

const { getSyncMeta, deviceDataIsForeign } = await import('./syncMeta');
const META = 'quran-fives-sync-meta-v1';
const ACCOUNT = 'quran-fives-khitma-creds-v1';
const signIn = (user) => mem.set(ACCOUNT, JSON.stringify({ user, code: '123456' }));

describe('getSyncMeta: الطابع يخصّ حساباً', () => {
  beforeEach(() => mem.clear());

  it('طابع الحساب نفسه صالح', () => {
    signIn('a@example.com');
    mem.set(META, JSON.stringify({ updatedAt: 50, user: 'a@example.com' }));
    expect(getSyncMeta().updatedAt).toBe(50);
  });

  it('طابع حساب آخر يُعدّ صفراً', () => {
    signIn('b@example.com');
    mem.set(META, JSON.stringify({ updatedAt: 50, user: 'a@example.com' }));
    expect(getSyncMeta().updatedAt).toBe(0);
  });

  it('طابع قديم بلا اسم: صالح لحساب المالك (اسم) لا لحساب بريدي', () => {
    mem.set(META, JSON.stringify({ updatedAt: 50 }));
    signIn('owner');
    expect(getSyncMeta().updatedAt).toBe(50);
    // كان يُرسَل أساساً إلى سحابة الحساب الجديد الفارغة فيردّ الخادم 409 بلا نهاية
    signIn('new@example.com');
    expect(getSyncMeta().updatedAt).toBe(0);
  });

  it('deviceDataIsForeign: بيانات زامنها حساب آخر فقط', () => {
    signIn('b@example.com');
    expect(deviceDataIsForeign()).toBe(false);            // جهاز لم يزامن قط
    mem.set(META, JSON.stringify({ updatedAt: 50, user: 'a@example.com' }));
    expect(deviceDataIsForeign()).toBe(true);
    signIn('a@example.com');
    expect(deviceDataIsForeign()).toBe(false);
  });

  it('بلا حساب: صفر', () => {
    mem.set(META, JSON.stringify({ updatedAt: 50 }));
    expect(getSyncMeta().updatedAt).toBe(0);
  });
});
