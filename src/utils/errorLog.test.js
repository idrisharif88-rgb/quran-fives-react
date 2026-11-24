import { describe, it, expect } from 'vitest';
import { scrub } from './errorLog';

describe('scrub', () => {
  it('hides emails, tokens and secrets', () => {
    expect(scrub('push failed for me@mail.com ses.Ab_9-x')).toBe('push failed for <email> <token>');
    expect(scrub('Authorization: Basic bWU6cGFzcw==')).toBe('Authorization: Basic <hidden>');
    expect(scrub('GET /x?code=1234&y=2')).toBe('GET /x?code=<hidden>&y=2');
  });
});
