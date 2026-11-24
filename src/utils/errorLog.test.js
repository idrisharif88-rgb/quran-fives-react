import { describe, it, expect } from 'vitest';
import { scrub, browserLabel } from './errorLog';

describe('scrub', () => {
  it('hides emails, tokens and secrets', () => {
    expect(scrub('push failed for me@mail.com ses.Ab_9-x')).toBe('push failed for <email> <token>');
    expect(scrub('Authorization: Basic bWU6cGFzcw==')).toBe('Authorization: Basic <hidden>');
    expect(scrub('GET /x?code=1234&y=2')).toBe('GET /x?code=<hidden>&y=2');
  });
});

describe('browserLabel', () => {
  it('names the browser and system', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; SM-N960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
    expect(browserLabel(ua)).toEqual({ model: 'Chrome', os: 'Android 10' });
    expect(browserLabel('Mozilla/5.0 (Windows NT 10.0; Win64) Gecko/20100101 Firefox/121.0')).toEqual({ model: 'Firefox', os: 'Windows NT 10.0' });
  });
});
