import { useState, useEffect } from 'react';
import HifzTimeline from './HifzTimeline';
import HifzCelebration from './HifzCelebration';
import HifzContacts from './HifzContacts';
import HifzRecorder from './HifzRecorder';
import HifzRecordingsList from './HifzRecordingsList';
import HifzListenView from './HifzListenView';
import useHifzRecordings from '../../hooks/useHifzRecordings';
import { DIRECTIONS, daysBetween } from '../../utils/hifzSchedule';
import './HifzScreen.css';

// اختيار نقطة البداية: أول المصحف أو آخره فقط
function HifzStart({ onStart }) {
  return (
    <div className="hifz-start">
      <h3>من أين تبدأ الحفظ؟</h3>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.FORWARD)}>
        <strong>من أول المصحف</strong>
        <span>الصفحة 1 — من الفاتحة إلى الناس</span>
      </button>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.BACKWARD)}>
        <strong>من آخر المصحف</strong>
        <span>الصفحة 604 — من الناس إلى الفاتحة، وآيات كل سورة بترتيبها</span>
      </button>
      <p className="hifz-start-note">آية واحدة في اليوم، ثم مراجعة ما حُفظ.</p>
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
 */
export default function HifzScreen({ hifz, reciter, contacts, onClose, backRef }) {
  const { program, plan, today, celebrate, actions } = hifz;
  const [confirmReset, setConfirmReset] = useState(false);
  const recordings = useHifzRecordings();
  const [listening, setListening] = useState(null);   // التسجيل المفتوح في شاشة الاستماع

  // الآية الجارية وأحدث تسجيل محفوظ لها
  const verse = plan?.verse && !plan.verse.done ? plan.verse : null;
  const latestTake = verse ? [...recordings.list].reverse().find((r) => r.verseIndex === verse.index) : null;

  const saveTake = async (blob, durationMs) => {
    await recordings.add(blob, { verseIndex: verse.index, s: verse.ref.s, a: verse.ref.a, durationMs });
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
        {!program ? <HifzStart onStart={actions.start} /> : (
          <>
            <div className="hifz-summary">
              <div><strong>{daysBetween(program.startedOn, today) + 1}</strong><span>اليوم</span></div>
              <div><strong>{program.memorizedOn.length}</strong><span>آية محفوظة</span></div>
              <div className={plan.complete ? 'complete' : ''}><strong>{plan.complete ? '✓' : '…'}</strong><span>{plan.complete ? 'اكتمل اليوم' : 'مهام اليوم'}</span></div>
            </div>

            <HifzTimeline program={program} plan={plan} reciter={reciter} actions={actions} extras={extras} />
            <HifzRecordingsList recordings={recordings} onListen={setListening} />

            <div className="hifz-footer">
              {confirmReset ? (
                <>
                  <span>يُمحى تقدّم الحفظ كله. متأكد؟</span>
                  <button type="button" className="hifz-btn danger" onClick={() => { actions.reset(); setConfirmReset(false); }}>نعم، ابدأ من جديد</button>
                  <button type="button" className="hifz-btn" onClick={() => setConfirmReset(false)}>إلغاء</button>
                </>
              ) : (
                <button type="button" className="hifz-link" onClick={() => setConfirmReset(true)}>إعادة ضبط البرنامج</button>
              )}
            </div>
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
