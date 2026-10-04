import { useState, useEffect } from 'react';
import HifzTimeline from './HifzTimeline';
import HifzCelebration from './HifzCelebration';
import HifzContacts from './HifzContacts';
import HifzRecorder from './HifzRecorder';
import HifzRecordingsList from './HifzRecordingsList';
import HifzListenView from './HifzListenView';
import HifzCustomStart from './HifzCustomStart';
import useHifzRecordings from '../../hooks/useHifzRecordings';
import { DIRECTIONS, VERSES_PER_DAY_CHOICES, daysBetween } from '../../utils/hifzSchedule';
import './HifzScreen.css';

const perDayLabel = (n) => (n === 1 ? 'آية واحدة' : `${n} آيات`);

// بدء البرنامج: ورد اليوم (آية أو 3 أو 5 أو 7) ثم نقطة البداية (أول المصحف أو آخره،
// أو آية يختارها من أذن له المشرف)
function HifzStart({ onStart, canCustomStart }) {
  const [perDay, setPerDay] = useState(VERSES_PER_DAY_CHOICES[0]);
  return (
    <div className="hifz-start">
      <h3>كم آية تحفظ في اليوم؟</h3>
      <div className="hifz-start-perday" role="radiogroup" aria-label="عدد آيات اليوم">
        {VERSES_PER_DAY_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={perDay === n}
            className={`hifz-start-chip ${perDay === n ? 'active' : ''}`.trim()}
            onClick={() => setPerDay(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <h3>من أين تبدأ الحفظ؟</h3>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.FORWARD, perDay)}>
        <strong>من أول المصحف</strong>
        <span>الصفحة 1 — من الفاتحة إلى الناس</span>
      </button>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.BACKWARD, perDay)}>
        <strong>من آخر المصحف</strong>
        <span>الصفحة 604 — من الناس إلى الفاتحة، وآيات كل سورة بترتيبها</span>
      </button>
      {canCustomStart && <HifzCustomStart onStart={(origin) => onStart(DIRECTIONS.FORWARD, perDay, origin)} />}
      <p className="hifz-start-note">{perDayLabel(perDay)} في اليوم، ثم مراجعة ما حُفظ.</p>
    </div>
  );
}

/**
 * شاشة برنامج الحفظ: شاشة كاملة فيها الخط الزمني لليوم.
 * @param hifz    ما يعيده useHifz
 * @param reciter  المقرئ المختار في التطبيق
 * @param contacts ما يعيده useHifzContacts (شيوخ خطوة تأكيد الحافظ)
 * @param backRef  يُملأ بدالّة تغلق ما فُتح فوق الشاشة (الاستماع، نموذج الشيخ، تنبيه الإتمام)
 *                 ليغلقه زرّ الرجوع أولاً قبل الشاشة نفسها
 * @param canTakeExtra حساب المشرف: يسمح بأكثر من ورد في اليوم الواحد (للتجربة)
 * @param canCustomStart أذن المشرف لهذا الحساب أن يبدأ الحفظ من آية يختارها
 */
export default function HifzScreen({ hifz, reciter, contacts, onClose, backRef, canTakeExtra = false, canCustomStart = false }) {
  const { program, plan, today, celebrate, actions } = hifz;
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);   // إعدادات الحفظ: تغيير ورد اليوم بلا إعادة ضبط
  const recordings = useHifzRecordings();
  const [listening, setListening] = useState(null);   // التسجيل المفتوح في شاشة الاستماع

  // الآية الجارية وأحدث تسجيل محفوظ لها
  const verse = plan?.verse && !plan.verse.done ? plan.verse : null;
  const latestTake = verse ? [...recordings.list].reverse().find((r) => r.verseIndex === verse.index) : null;

  const saveTake = async (blob, durationMs) => {
    // refs: آيات الورد كلّها (واحدة حين versesPerDay = 1) لعرض مدى التسجيل
    await recordings.add(blob, { verseIndex: verse.index, s: verse.ref.s, a: verse.ref.a, refs: verse.refs, durationMs });
    actions.record('record', 'recorded');
  };

  // بعد سماع تسجيل الآية الجارية يحكم صاحبه: صحيح ← تتمّ الخطوة، خطأ ← يعيد التسجيل
  const judgingCurrent = Boolean(verse && listening && listening.id === latestTake?.id && program.progress.record?.recorded);
  const giveVerdict = (verdict) => {
    actions.record('record', verdict === 'correct' ? 'reviewed' : 'retry');
    setListening(null);
  };

  // زرّ الرجوع: يغلق شاشة الاستماع أو تنبيه الإتمام أو تأكيد إعادة الضبط قبل الشاشة
  const showCelebration = Boolean(program && celebrate && !listening);
  useEffect(() => {
    if (!backRef) return undefined;
    let closeTop = null;
    if (listening) closeTop = () => setListening(null);
    else if (showCelebration) closeTop = actions.celebrated;
    else if (confirmReset) closeTop = () => setConfirmReset(false);
    if (!closeTop) return undefined;
    backRef.current = closeTop;
    return () => { if (backRef.current === closeTop) backRef.current = null; };
  }, [backRef, listening, showCelebration, confirmReset, actions]);

  // أدوات تُحقن في الخطوات المفتوحة
  const extras = verse ? {
    hafizContacts: <HifzContacts contacts={contacts} verse={verse} backRef={backRef} />,
    recorder: <HifzRecorder value={program.progress.record} latest={latestTake} onSave={saveTake} onListen={setListening} />,
  } : {};

  return (
    <div className="hifz-screen" dir="rtl">
      <div className="hifz-header">
        <button type="button" className="hifz-close" onClick={onClose} aria-label="إغلاق برنامج الحفظ">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <h2>برنامج الحفظ</h2>
        <span className="hifz-header-spacer" />
      </div>

      <div className="hifz-body">
        {!program ? <HifzStart onStart={actions.start} canCustomStart={canCustomStart} /> : (
          <>
            <div className="hifz-summary">
              <div><strong>{daysBetween(program.startedOn, today) + 1}</strong><span>اليوم</span></div>
              <div><strong>{program.memorizedOn.length}</strong><span>آية محفوظة</span></div>
              <div className={plan.complete ? 'complete' : ''}><strong>{plan.complete ? '✓' : '…'}</strong><span>{plan.complete ? 'اكتمل اليوم' : 'مهام اليوم'}</span></div>
            </div>

            <HifzTimeline program={program} plan={plan} reciter={reciter} actions={actions} extras={extras} canTakeExtra={canTakeExtra} />
            <HifzRecordingsList recordings={recordings} />

            <div className="hifz-footer">
              {confirmReset ? (
                <>
                  <span>يُمحى تقدّم الحفظ كله. متأكد؟</span>
                  <button type="button" className="hifz-btn danger" onClick={() => { actions.reset(); setConfirmReset(false); }}>نعم، ابدأ من جديد</button>
                  <button type="button" className="hifz-btn" onClick={() => setConfirmReset(false)}>إلغاء</button>
                </>
              ) : (
                <>
                  <button type="button" className="hifz-link" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>إعدادات الحفظ</button>
                  <button type="button" className="hifz-link" onClick={() => setConfirmReset(true)}>إعادة ضبط البرنامج</button>
                </>
              )}
            </div>

            {settingsOpen && !confirmReset && (
              <div className="hifz-settings">
                <h3>كم آية تحفظ في اليوم؟</h3>
                <div className="hifz-start-perday" role="radiogroup" aria-label="عدد آيات اليوم">
                  {VERSES_PER_DAY_CHOICES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={program.rules.versesPerDay === n}
                      className={`hifz-start-chip ${program.rules.versesPerDay === n ? 'active' : ''}`.trim()}
                      onClick={() => actions.setVersesPerDay(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="hifz-start-note">
                  ما حفظته يبقى كما هو، والعدد الجديد يسري من أوّل ورد لم يُنجَز. تغييره أثناء ورد اليوم يعيد خطواته من أوّلها.
                </p>
                {program.memorizedOn.length === 0 && (
                  <button type="button" className="hifz-btn" onClick={() => { actions.reset(); setSettingsOpen(false); }}>
                    العودة إلى اختيار نقطة البداية
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {listening && (
        <HifzListenView
          recording={listening}
          loadUrl={recordings.loadUrl}
          onVerdict={judgingCurrent ? giveVerdict : undefined}
          onClose={() => setListening(null)}
        />
      )}
      {showCelebration && <HifzCelebration memorized={program.memorizedOn.length} onClose={actions.celebrated} />}
    </div>
  );
}
