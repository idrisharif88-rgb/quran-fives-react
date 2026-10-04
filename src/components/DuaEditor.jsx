import { useState } from 'react';
import { DUA_PRESETS } from '../utils/sessions';
import './DuaEditor.css';

/**
 * محرّر الدعاء: نافذة مستقلّة مثبّتة في أعلى الشاشة.
 * حقل الكتابة في أسفل بطاقة النتيجة كانت تغطّيه لوحة المفاتيح، وسلوك أندرويد حينها
 * (إزاحة النافذة أو تصغيرها) يختلف بين الأجهزة فلا يُعتمد عليه. أعلى الشاشة لا تبلغه
 * اللوحة على أي جهاز، فالحقل هنا ظاهر دائماً دون أي حساب لارتفاعها.
 *
 * يُستعمل لغير الدعاء أيضاً (ملاحظات «عجائب قرآنية») بتغيير title/placeholder/presets.
 */
export default function DuaEditor({
  initialDua,
  onSave,
  onCancel,
  title = 'الدعاء',
  placeholder = 'اكتب دعاءً…',
  presets = DUA_PRESETS,
}) {
  const [draft, setDraft] = useState(initialDua || '');

  return (
    <div className="dua-editor-overlay" onMouseDown={(e) => { e.stopPropagation(); onCancel(); }}>
      <div className="dua-editor" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dua-editor-head">
          <span>{title}</span>
          <div className="dua-editor-actions">
            <button type="button" className="dua-editor-btn" onClick={onCancel}>إلغاء</button>
            <button type="button" className="dua-editor-btn primary" onClick={() => onSave(draft.trim())}>حفظ</button>
          </div>
        </div>
        <textarea
          className="dua-editor-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        {presets.length > 0 && (
          <div className="dua-editor-presets">
            {presets.map((preset, i) => (
              <button key={i} type="button" className="dua-editor-preset" onClick={() => setDraft(preset)}>{preset}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
