import { useState, useCallback, useMemo } from 'react';
import { makeContact, sanitizeContacts } from '../utils/hifzContacts';

/**
 * جهات اتصال الشيوخ + لأيّ آية فُتحت محادثة تنتظر التأكيد.
 * @param persisted { contacts, askedIndex } المخزّنة
 * @returns { state, add, remove, markAsked } — state هو ما يُحفظ ويُزامن
 */
export default function useHifzContacts(persisted) {
  const [state, setState] = useState(() => ({
    contacts: sanitizeContacts(persisted?.contacts),
    askedIndex: Number.isInteger(persisted?.askedIndex) ? persisted.askedIndex : null,
  }));

  // يعيد false إن كانت البيانات ناقصة
  const add = useCallback((draft) => {
    const contact = makeContact(draft);
    if (!contact) return false;
    setState((prev) => ({ ...prev, contacts: [...prev.contacts, { id: String(Date.now()), ...contact }] }));
    return true;
  }, []);

  const remove = useCallback((id) => {
    setState((prev) => ({ ...prev, contacts: prev.contacts.filter((c) => c.id !== id) }));
  }, []);

  // سُجّل فتح محادثة لهذه الآية: تظهر حالة «بانتظار تأكيد الشيخ»
  const markAsked = useCallback((verseIndex) => {
    setState((prev) => ({ ...prev, askedIndex: verseIndex }));
  }, []);

  return useMemo(() => ({ state, add, remove, markAsked }), [state, add, remove, markAsked]);
}
