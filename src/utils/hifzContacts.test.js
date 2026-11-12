import { describe, it, expect } from 'vitest';
import { makeContact, contactUrl, contactIntentUrl, sanitizeContacts } from './hifzContacts';

describe('hifzContacts', () => {
  it('cleans a WhatsApp number into international digits', () => {
    expect(makeContact({ name: ' الشيخ أحمد ', app: 'whatsapp', handle: '+966 50-123 4567' }))
      .toEqual({ name: 'الشيخ أحمد', app: 'whatsapp', handle: '966501234567' });
    expect(makeContact({ name: 'x', app: 'whatsapp', handle: '00966501234567' }).handle).toBe('966501234567');
  });

  it('accepts a Telegram username, link or phone', () => {
    expect(makeContact({ name: 'x', app: 'telegram', handle: '@Sheikh_Ali' }).handle).toBe('Sheikh_Ali');
    expect(makeContact({ name: 'x', app: 'telegram', handle: 'https://t.me/Sheikh_Ali' }).handle).toBe('Sheikh_Ali');
    expect(makeContact({ name: 'x', app: 'telegram', handle: '+966 501234567' }).handle).toBe('+966501234567');
  });

  it('rejects incomplete contacts', () => {
    expect(makeContact({ name: '', app: 'whatsapp', handle: '966501234567' })).toBeNull();
    expect(makeContact({ name: 'x', app: 'whatsapp', handle: '123' })).toBeNull();
    expect(makeContact({ name: 'x', app: 'telegram', handle: 'ab' })).toBeNull();
  });

  it('builds links that open the chat directly with a ready message', () => {
    expect(contactUrl({ app: 'whatsapp', handle: '966501234567' })).toBe('https://wa.me/966501234567');
    expect(contactUrl({ app: 'telegram', handle: 'Sheikh_Ali' }, 'سلام'))
      .toBe(`https://t.me/Sheikh_Ali?text=${encodeURIComponent('سلام')}`);
  });

  it('builds Android intent links that open the app, with the https link as fallback', () => {
    const wa = contactIntentUrl({ app: 'whatsapp', handle: '966501234567' }, 'سلام');
    expect(wa).toBe(`intent://send?phone=966501234567&text=${encodeURIComponent('سلام')}#Intent;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(`https://wa.me/966501234567?text=${encodeURIComponent('سلام')}`)};end`);
    expect(contactIntentUrl({ app: 'telegram', handle: 'Sheikh_Ali' })).toBe(`intent://resolve?domain=Sheikh_Ali#Intent;scheme=tg;S.browser_fallback_url=${encodeURIComponent('https://t.me/Sheikh_Ali')};end`);
    expect(contactIntentUrl({ app: 'telegram', handle: '+966501234567' })).toMatch(/^intent:\/\/resolve\?phone=966501234567#Intent;scheme=tg;/);
  });

  it('drops broken stored contacts', () => {
    const stored = [{ id: 1, name: 'a', app: 'whatsapp', handle: '966501234567' }, { name: 'b', app: 'whatsapp', handle: '1' }, null];
    expect(sanitizeContacts(stored)).toEqual([{ id: '1', name: 'a', app: 'whatsapp', handle: '966501234567' }]);
    expect(sanitizeContacts('x')).toEqual([]);
  });
});
