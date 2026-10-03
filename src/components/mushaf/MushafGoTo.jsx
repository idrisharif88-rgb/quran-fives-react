import { useState } from 'react';
import ModalDialog from '../ModalDialog';
import { SURAH_METADATA } from '../../data/quranConstants';
import { JUZ_START_PAGES } from '../../data/juzPages';
import { MUSHAF } from '../../utils/mushafEdition';
import { clampPage } from '../../utils/mushafLayout';

const TABS = [
  { id: 'surah', label: 'سورة' },
  { id: 'juz', label: 'جزء' },
  { id: 'page', label: 'صفحة' },
];

// نافذة الانتقال: إلى سورة أو جزء أو رقم صفحة.
// رقم الصفحة يُكتب مباشرة، أو يُضبط بالأزرار والشريط دون لوحة المفاتيح.
export default function MushafGoTo({ page, currentSurah, onSelect, onClose }) {
  const [tab, setTab] = useState('surah');
  // نصّ الحقل كما كُتب (قد يكون فارغاً أثناء الكتابة)؛ الصفحة الفعلية تُحصر عند الاستعمال
  const [draftText, setDraftText] = useState(String(page));
  const draftPage = clampPage(draftText === '' ? page : draftText, MUSHAF.totalPages);
  const setDraftPage = (n) => setDraftText(String(clampPage(n, MUSHAF.totalPages)));
  const stepDraft = (delta) => setDraftPage(draftPage + delta);
  const typeDraft = (text) => setDraftText(text.replace(/\D/g, '').slice(0, 3));

  return (
    <ModalDialog title="الانتقال في المصحف" onClose={onClose} className="mushaf-goto">
      <div className="mushaf-goto-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`mushaf-goto-tab ${tab === t.id ? 'active' : ''}`.trim()}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'surah' && (
        <div className="mushaf-goto-list">
          {SURAH_METADATA.map((surah, i) => (
            <button
              key={surah.id}
              type="button"
              className={`mushaf-goto-item ${surah.id === currentSurah ? 'current' : ''}`.trim()}
              onClick={() => onSelect(MUSHAF.surahPages[i])}
            >
              <span className="mushaf-goto-num">{surah.id}</span>
              <span className="mushaf-goto-name">{surah.name}</span>
              <span className="mushaf-goto-page">ص {MUSHAF.surahPages[i]}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'juz' && (
        <div className="mushaf-goto-grid">
          {JUZ_START_PAGES.map((startPage, i) => (
            <button key={startPage} type="button" className="mushaf-goto-cell" onClick={() => onSelect(startPage)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {tab === 'page' && (
        <div className="mushaf-goto-pagepick">
          <div className="mushaf-goto-stepper" dir="ltr">
            <button type="button" className="mushaf-goto-step" onClick={() => stepDraft(-10)}>−10</button>
            <button type="button" className="mushaf-goto-step" onClick={() => stepDraft(-1)}>−1</button>
            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="go"
              className="mushaf-goto-value"
              value={draftText}
              onChange={(e) => typeDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                // بلا preventDefault يُغلق الإدخالُ النافذةَ فيعود التركيز إلى زرّ فتحها،
                // ثم يضغطه ما بقي من حدث Enter نفسه فتُفتح النافذة من جديد فوق الصفحة
                e.preventDefault();
                e.currentTarget.blur();
                onSelect(draftPage);
              }}
              aria-label="رقم الصفحة"
            />
            <button type="button" className="mushaf-goto-step" onClick={() => stepDraft(1)}>+1</button>
            <button type="button" className="mushaf-goto-step" onClick={() => stepDraft(10)}>+10</button>
          </div>
          <input
            type="range"
            dir="ltr"
            min="1"
            max={MUSHAF.totalPages}
            value={draftPage}
            onChange={(e) => setDraftPage(e.target.value)}
            className="mushaf-goto-range"
            aria-label="شريط الصفحات"
          />
          <button type="button" className="mushaf-goto-go" onClick={() => onSelect(draftPage)}>
            انتقال إلى الصفحة {draftPage}
          </button>
        </div>
      )}
    </ModalDialog>
  );
}
