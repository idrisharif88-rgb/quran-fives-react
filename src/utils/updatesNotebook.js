// ─── دفتر التحديثات (للمالك) ───
// ملاحظات بسيطة: { id, title, text, done, createdAt, updatedAt }. دوال صرفة؛ التخزين في الخطّاف.
export const NOTEBOOK_STORAGE_KEY = 'quran-fives-updates-notebook-v1';

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

export function normalizeNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n) => n && typeof n.id === 'string')
    .map((n) => ({
      id: n.id,
      title: clean(n.title),
      text: typeof n.text === 'string' ? n.text : '',
      done: n.done === true,
      createdAt: Number(n.createdAt) || 0,
      updatedAt: Number(n.updatedAt) || Number(n.createdAt) || 0,
    }));
}

export const newNoteId = () => `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ملاحظة بلا عنوان ولا نصّ لا تُحفظ
export function saveNote(notes, { id, title, text }, now = Date.now()) {
  const entry = { title: clean(title), text: (text || '').trim() };
  if (!entry.title && !entry.text) return id ? notes.filter((n) => n.id !== id) : notes;
  if (id && notes.some((n) => n.id === id)) {
    return notes.map((n) => (n.id === id ? { ...n, ...entry, updatedAt: now } : n));
  }
  return [...notes, { id: id || newNoteId(), ...entry, done: false, createdAt: now, updatedAt: now }];
}

export const toggleDone = (notes, id, now = Date.now()) =>
  notes.map((n) => (n.id === id ? { ...n, done: !n.done, updatedAt: now } : n));

export const removeNote = (notes, id) => notes.filter((n) => n.id !== id);

// المفتوحة أولاً (الأحدث فوق)، ثم المنجزة (آخر ما أُنجز فوق)
export function sortedNotes(notes) {
  const open = notes.filter((n) => !n.done).sort((a, b) => b.createdAt - a.createdAt);
  const done = notes.filter((n) => n.done).sort((a, b) => b.updatedAt - a.updatedAt);
  return { open, done };
}
