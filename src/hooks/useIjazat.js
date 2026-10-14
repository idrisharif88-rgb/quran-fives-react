import { useState, useCallback } from 'react';
import { sanitizeIjazat, newIjazaId } from '../utils/ijazat';

// إجازات الحافظ: تُحفظ في حالة التطبيق فتُزامَن مع الحساب
export default function useIjazat(initial) {
  const [ijazat, setIjazat] = useState(() => sanitizeIjazat(initial));

  const addIjaza = useCallback(({ type, mojeez, chain }) => {
    const ijaza = { id: newIjazaId(), type, mojeez, chain, createdAt: new Date().toISOString() };
    setIjazat((prev) => [...prev, ...sanitizeIjazat([ijaza])]);
    return ijaza.id;
  }, []);

  const removeIjaza = useCallback((id) => {
    setIjazat((prev) => prev.filter((ij) => ij.id !== id));
  }, []);

  // ظهر بطاقة الاسم: نصّ فارغ يحذف الملاحظة
  const saveNote = useCallback((id, number, note) => {
    setIjazat((prev) => prev.map((ij) => {
      if (ij.id !== id) return ij;
      const notes = { ...ij.notes };
      if (note.trim()) notes[number] = note.trim();
      else delete notes[number];
      return { ...ij, notes };
    }));
  }, []);

  return { ijazat, addIjaza, removeIjaza, saveNote };
}
