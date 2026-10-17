import { VERSES_PER_DAY_CHOICES } from '../../utils/hifzSchedule';
import useSurahDownload from '../../hooks/useSurahDownload';
import { surahName } from './hifzText';
import './HifzSettings.css';

function Row({ label, hint, children }) {
  return (
    <div className="hifz-set-row">
      <div className="hifz-set-label">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </div>
      <div className="hifz-set-control">{children}</div>
    </div>
  );
}

/**
 * إعدادات الحفظ: صفوف قصيرة — آيات اليوم، تحميل سورة الورد، نقطة البداية، وضع التجربة.
 * @param reciter          المقرئ المختار (يُختار بجانب زرّ التلاوة) — التحميل بصوته
 * @param surah            سورة ورد اليوم (رقمها) أو null إن لم يكن ورد
 * @param onBackToStart    العودة إلى اختيار نقطة البداية (قبل حفظ أي آية فقط)
 * @param onTrialStart     للمشرف: الدخول إلى وضع التجربة (برنامج منفصل)
 */
export default function HifzSettings({ program, reciter, surah, onVersesPerDay, onBackToStart, onTrialStart }) {
  const audio = useSurahDownload();
  const perDay = program.rules.versesPerDay;
  const progress = audio.progress?.total > 0 ? `${audio.progress.downloaded} / ${audio.progress.total}` : null;

  return (
    <div className="hifz-set">
      <Row label="آيات اليوم" hint="يسري من الورد القادم">
        <div className="hifz-set-chips" role="radiogroup" aria-label="عدد آيات اليوم">
          {VERSES_PER_DAY_CHOICES.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={perDay === n} className={perDay === n ? 'on' : ''} onClick={() => onVersesPerDay(n)}>
              {n}
            </button>
          ))}
        </div>
      </Row>

      {surah && (
        <Row label="بلا إنترنت" hint={audio.message || progress || `سورة ${surahName(surah)}`}>
          <button type="button" className="hifz-set-btn" onClick={() => audio.download(surah, reciter)} disabled={audio.busy}>
            {audio.busy ? '…' : 'تحميل'}
          </button>
        </Row>
      )}

      {program.memorizedOn.length === 0 && (
        <Row label="نقطة البداية">
          <button type="button" className="hifz-set-btn" onClick={onBackToStart}>تغيير</button>
        </Row>
      )}

      {onTrialStart && (
        <Row label="وضع التجربة" hint="لا يُحفظ في حسابك">
          <button type="button" className="hifz-set-btn" onClick={onTrialStart}>ابدأ</button>
        </Row>
      )}
    </div>
  );
}
