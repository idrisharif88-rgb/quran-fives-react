import { useState } from 'react';
import { TARGET_MAX, TEXT_MAX } from '../../utils/hifzHome';

/**
 * إضافة ذكر من عند صاحبه: نصّه وعدده (1 إلى TARGET_MAX).
 * @param onAdd (text, target)
 * @param defaultTarget العدد إن تُركت خانته فارغة
 */
export default function HifzZikrForm({ onAdd, defaultTarget = 33 }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const count = target === '' ? defaultTarget : Number(target);
  const valid = text.trim() !== '' && Number.isInteger(count) && count >= 1 && count <= TARGET_MAX;
  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd(text, count);
    setText('');
    setTarget('');
  };
  return (
    <form className="hifz-zikr-form" onSubmit={submit}>
      <input className="hifz-start-field" value={text} maxLength={TEXT_MAX} onChange={(e) => setText(e.target.value)} placeholder="ذكر من عندك" aria-label="نصّ الذكر" />
      <input className="hifz-start-field hifz-zikr-target" type="number" inputMode="numeric" min={1} max={TARGET_MAX} value={target} onChange={(e) => setTarget(e.target.value)} placeholder={String(defaultTarget)} aria-label="العدد" />
      <button type="submit" className="hifz-btn primary" disabled={!valid}>أضف</button>
    </form>
  );
}
