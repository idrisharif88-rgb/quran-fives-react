import { describe, it, expect, vi, afterEach } from 'vitest';
import { tafseerPlainText, fetchTafseer, TAFSEER_BOOKS, DEFAULT_TAFSEER_BOOK, isTafseerBook } from './tafseerApi';

afterEach(() => vi.unstubAllGlobals());
const reply = (ok, body) => vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });

describe('تنظيف النص', () => {
  it('الوسوم تسقط والفقرات أسطر', () => {
    expect(tafseerPlainText('<p>أول</p><p>ثانٍ <span class="blue">مميّز</span></p>')).toBe('أول\n\nثانٍ مميّز');
    expect(tafseerPlainText('سطر<br/>سطر آخر')).toBe('سطر\nسطر آخر');
  });
  it('وسم برمجي لا يُنفَّذ ولا يظهر منه إلا نصّه', () => {
    expect(tafseerPlainText('<img src=x onerror="alert(1)">نصّ')).toBe('نصّ');
  });
  it('الرموز المرمّزة تُفكّ', () => {
    expect(tafseerPlainText('قال &quot;نعم&quot; &amp; &#1575;')).toBe('قال "نعم" & ا');
  });
  it('فارغ أو غائب', () => {
    expect(tafseerPlainText(undefined)).toBe('');
    expect(tafseerPlainText('  <p> </p> ')).toBe('');
  });
});

describe('الجلب', () => {
  it('الرابط بالكتاب والآية، والنصّ نظيف', async () => {
    const fetchMock = reply(true, { tafsir: { text: '<p>تفسير</p>' } });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchTafseer({ s: 2, a: 255 }, 91)).toBe('تفسير');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.quran.com/api/v4/tafsirs/91/by_ayah/2:255');
  });
  it('خطأ الخادم أو نصّ فارغ يرمي', async () => {
    vi.stubGlobal('fetch', reply(false, {}));
    await expect(fetchTafseer({ s: 1, a: 1 }, 16)).rejects.toThrow();
    vi.stubGlobal('fetch', reply(true, { tafsir: { text: '' } }));
    await expect(fetchTafseer({ s: 1, a: 1 }, 16)).rejects.toThrow();
  });
  it('الكتب: الميسر أولاً، وغير المعروف مرفوض', () => {
    expect(DEFAULT_TAFSEER_BOOK).toBe(16);
    expect(TAFSEER_BOOKS).toHaveLength(8);
    expect(isTafseerBook("qummi")).toBe(true);
    expect(isTafseerBook(91)).toBe(true);
    expect(isTafseerBook(999)).toBe(false);
  });
});
