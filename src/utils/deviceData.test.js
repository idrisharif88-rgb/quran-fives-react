import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage };

const { isPristineState, wipeDeviceData } = await import('./deviceData');

// الحالة التي يحفظها تطبيق فُتح للتوّ بلا أي استعمال
const FRESH = {
  activeReciter: 'Husary_Mujawwad_64kbps', currentIndex: 0, viewMode: 'khmasiyat', surahFivesIndex: 0,
  sharedGroupIndex: 0, stepSize: 5, starredByStep: { 5: [] }, starredIndices: [], jumpInput: '', pageJumpInput: '',
  nightCounters: [{ id: 'counter-1', name: 'العداد', value: 0, limit: null }], activeNightCounterId: 'counter-1',
  stopwatchTargetSeconds: 60, stopwatchBestAvgMs: null, stopwatchBestJuzMs: null, activeAyahTest: null,
  activePageStartsTest: null, currentPageIndex: 0, currentPageEndIndex: 0, starredPages: [], starredPageEnds: [],
  fontSize: 38, fontFamily: "'Tajawal', sans-serif", fontWeight: 'bold', fontColor: 'darkgreen',
  quranicWondersNotes: [], verseNotes: {}, mushafPage: 1, hifz: null, hifzContacts: { contacts: [], askedIndex: null },
  isNightMode: false, accentTheme: 'green', sessions: [],
};

describe('isPristineState', () => {
  it('تطبيق جديد أو بلا حالة: بلا محتوى', () => {
    expect(isPristineState(null)).toBe(true);
    expect(isPristineState(FRESH)).toBe(true);
  });

  it('التفضيلات وحدها ليست محتوى', () => {
    expect(isPristineState({ ...FRESH, isNightMode: true, fontSize: 30, accentTheme: 'yellow', stepSize: 7, viewMode: 'night-counter' })).toBe(true);
  });

  it.each([
    ['موضع القراءة', { currentIndex: 12 }],
    ['نجمة', { starredByStep: { 5: [3] } }],
    ['ملاحظة عجائب', { quranicWondersNotes: [{ id: '1', text: 'x' }] }],
    ['ملاحظة آية', { verseNotes: { '2:255': 'x' } }],
    ['برنامج حفظ', { hifz: { version: 1 } }],
    ['جلسة محفوظة', { sessions: [{ id: 1 }] }],
    ['عدّاد', { nightCounters: [{ id: 'counter-1', value: 33 }] }],
    ['صفحة المصحف', { mushafPage: 40 }],
  ])('%s محتوى يمنع المسح أو التنزيل بلا سؤال', (_, change) => {
    expect(isPristineState({ ...FRESH, ...change })).toBe(false);
  });
});

describe('wipeDeviceData', () => {
  beforeEach(() => mem.clear());

  it('يمسح بيانات الحساب ويُبقي ما ليس منها', () => {
    for (const k of ['quran-fives-app-state-v1', 'quran-fives-khmasiyat-quiz-v1', 'quran-fives-khitma-cache-v1',
      'quran-fives-sync-meta-v1', 'quran-fives-account-status-v1']) mem.set(k, '{}');
    mem.set('quran-fives-hijri-cache', '{}');
    mem.set('quran-fives-hifz-recordings-v1', '[]');
    wipeDeviceData();
    expect([...mem.keys()].sort()).toEqual(['quran-fives-hifz-recordings-v1', 'quran-fives-hijri-cache']);
  });
});
