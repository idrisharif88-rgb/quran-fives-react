import { useState, useEffect } from 'react';
import MushafPager from './MushafPager';
import MushafGoTo from './MushafGoTo';
import { SURAH_METADATA } from '../../data/quranConstants';
import { juzOfPage } from '../../data/juzPages';
import { MUSHAF } from '../../utils/mushafEdition';
import { surahOfPage, clampPage } from '../../utils/mushafLayout';
import './MushafReader.css';

/**
 * قارئ المصحف: شاشة كاملة فيها شريط علوي وصفحات تُقلَّب بالسحب.
 * @param page         الصفحة الحالية (تملكها App كي تُحفظ وتُستعاد)
 * @param onPageChange يُستدعى عند تقليب الصفحة أو القفز
 * @param backRef      يُملأ بدالّة إغلاق نافذة الانتقال ما دامت مفتوحة، ليغلقها زرّ الرجوع أولاً
 */
export default function MushafReader({ page, onPageChange, onClose, backRef }) {
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  // ملء الشاشة: نقرة على الصفحة تخفي الشريط العلوي فتكبر الصفحة، ونقرة أخرى تعيده
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentPage = clampPage(page, MUSHAF.totalPages);
  const surah = surahOfPage(currentPage, MUSHAF.surahPages);

  useEffect(() => {
    if (!backRef || !isGoToOpen) return undefined;
    backRef.current = () => setIsGoToOpen(false);
    return () => { backRef.current = null; };
  }, [backRef, isGoToOpen]);

  return (
    <div className={`mushaf-reader ${isFullScreen ? 'full-screen' : ''}`.trim()} dir="rtl">
      <div className="mushaf-toolbar">
        <button type="button" className="mushaf-tool-btn" onClick={onClose} aria-label="إغلاق المصحف" title="إغلاق">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <button type="button" className="mushaf-title" onClick={() => setIsGoToOpen(true)} title="الانتقال إلى سورة أو جزء أو صفحة">
          <span className="mushaf-title-surah">سورة {SURAH_METADATA[surah - 1]?.name}</span>
          <span className="mushaf-title-juz">الجزء {juzOfPage(currentPage)}</span>
        </button>
        <button type="button" className="mushaf-tool-btn" onClick={() => setIsGoToOpen(true)} aria-label="الانتقال" title="الانتقال">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </button>
      </div>

      <MushafPager page={currentPage} onPageChange={onPageChange} onTap={() => setIsFullScreen((v) => !v)} />

      {isGoToOpen && (
        <MushafGoTo
          page={currentPage}
          currentSurah={surah}
          onSelect={(target) => { onPageChange(clampPage(target, MUSHAF.totalPages)); setIsGoToOpen(false); }}
          onClose={() => setIsGoToOpen(false)}
        />
      )}
    </div>
  );
}
