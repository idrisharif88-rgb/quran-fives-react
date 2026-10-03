import { useState, useCallback } from 'react';
import { sanitizeNotes } from '../utils/verseNotesFile';

// مفتاح البطاقة المعروضة: يتغيّر بالتنقّل، فتعود البطاقة إلى وجهها تلقائياً
export const cardKeyOf = (verses) => (
  verses && verses.length ? `${verses[0].s}:${verses[0].a}:${verses.length}` : null
);

// ملاحظات الآيات + أيّ بطاقة مقلوبة الآن على ظهرها
export default function useVerseNotes(initialNotes) {
  const [verseNotes, setVerseNotes] = useState(() => sanitizeNotes(initialNotes));
  const [flippedCardKey, setFlippedCardKey] = useState(null);

  // نص فارغ يحذف الملاحظة
  const saveNote = useCallback((key, text) => {
    setVerseNotes((prev) => {
      const next = { ...prev };
      const trimmed = text.trim();
      if (trimmed) next[key] = trimmed;
      else delete next[key];
      return next;
    });
  }, []);

  // دمج ملف مستورد: ملاحظات الملف تحلّ محلّ نظيراتها وتبقى البقية
  const mergeNotes = useCallback((incoming) => {
    setVerseNotes((prev) => ({ ...prev, ...sanitizeNotes(incoming) }));
  }, []);

  return { verseNotes, saveNote, mergeNotes, flippedCardKey, setFlippedCardKey };
}
