import { VERSES_PER_DAY_CHOICES } from '../../utils/hifzSchedule';
import useSurahDownload from '../../hooks/useSurahDownload';
import { surahName } from './hifzText';

/**
 * إعدادات الحفظ: ورد اليوم (بلا إعادة ضبط)، وتحميل سورة الورد للسماع بلا إنترنت.
 * @param reciter          المقرئ المختار (يُختار بجانب زرّ التلاوة) — التحميل بصوته
 * @param surah            سورة ورد اليوم (رقمها) أو null إن لم يكن ورد
 * @param onBackToStart    العودة إلى اختيار نقطة البداية (قبل حفظ أي آية فقط)
 * @param onTrialStart     للمشرف: الدخول إلى وضع التجربة (برنامج منفصل)
 */
export default function HifzSettings({ program, reciter, surah, onVersesPerDay, onBackToStart, onTrialStart }) {
  const audio = useSurahDownload();
  const perDay = program.rules.versesPerDay;
  return (
    <div className="hifz-settings">
      <h3>كم آية تحفظ في اليوم؟</h3>
      <div className="hifz-start-perday" role="radiogroup" aria-label="عدد آيات اليوم">
        {VERSES_PER_DAY_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={perDay === n}
            className={`hifz-start-chip ${perDay === n ? 'active' : ''}`.trim()}
            onClick={() => onVersesPerDay(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="hifz-start-note">
        ما حفظته يبقى كما هو، والعدد الجديد يسري من أوّل ورد لم يُنجَز. تغييره أثناء ورد اليوم يعيد خطواته من أوّلها.
      </p>

      {surah && (
        <>
          <button type="button" className="hifz-btn" onClick={() => audio.download(surah, reciter)} disabled={audio.busy}>
            {audio.busy ? 'جارٍ التحميل…' : `تحميل سورة ${surahName(surah)} للسماع بلا إنترنت`}
          </button>
          {audio.progress?.total > 0 && (
            <span className="hifz-tool-count" dir="ltr">{audio.progress.downloaded} / {audio.progress.total}</span>
          )}
          {audio.message && <p className="hifz-start-note" role="status">{audio.message}</p>}
        </>
      )}

      {program.memorizedOn.length === 0 && (
        <button type="button" className="hifz-btn" onClick={onBackToStart}>العودة إلى اختيار نقطة البداية</button>
      )}
      {onTrialStart && (
        <button type="button" className="hifz-btn" onClick={onTrialStart}>وضع التجربة — برنامج منفصل لا يُحفظ في حسابك</button>
      )}
    </div>
  );
}
