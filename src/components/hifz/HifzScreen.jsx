import { useState, useEffect } from 'react';
import HifzTimeline from './HifzTimeline';
import HifzCelebration from './HifzCelebration';
import HifzContacts from './HifzContacts';
import HifzRecorder from './HifzRecorder';
import HifzRecordingsList from './HifzRecordingsList';
import HifzReminderSettings from './HifzReminderSettings';
import HifzListenView from './HifzListenView';
import HifzStart from './HifzStart';
import HifzHome from './HifzHome';
import HifzAzkar from './HifzAzkar';
import HifzTasbeeh from './HifzTasbeeh';
import HifzTafseer from './HifzTafseer';
import HifzDayProgress from './HifzDayProgress';
import HifzFooter from './HifzFooter';
import HifzSettings from './HifzSettings';
import HifzReciterSelect from './HifzReciterSelect';
import HifzMethodTool from './HifzMethodTool';
import HifzTrialBar from './HifzTrialBar';
import useHifzRecordings from '../../hooks/useHifzRecordings';
import './HifzScreen.css';
import './HifzHome.css';

// صفحات القسم: الرئيسية، ورد اليوم، وصفحات البلاطات الثلاث
const PAGE_TITLE = { home: 'برنامج الحفظ', day: 'ورد اليوم', azkar: 'أذكاري', tafseer: 'تفسير آية', tasbeeh: 'مسبحتي' };

/**
 * شاشة برنامج الحفظ: رئيسية (HifzHome) تُفتح منها صفحة ورد اليوم بخطّها الزمني، وصفحات
 * أذكاري وتفسير ومسبحتي. زرّ الرجوع يعيد من أي صفحة إلى الرئيسية.
 * @param hifz    ما يعيده useHifz
 * @param reciter  المقرئ المختار في التطبيق، و onReciterChange يغيّره (بجانب زرّ التلاوة)
 * @param contacts ما يعيده useHifzContacts (شيوخ خطوة تأكيد الحافظ)
 * @param backRef  يُملأ بدالّة تغلق ما فُتح فوق الشاشة (الاستماع، نموذج الشيخ، تنبيه الإتمام)
 *                 ليغلقه زرّ الرجوع أولاً قبل الشاشة نفسها
 * @param homeData ما يعيده useHifzHome (أذكاري، مسبحتي، آية التفسير)
 * @param notes / onSaveNote / noteBackRef تفسير الآيات (verseNotes) لصفحة التفسير
 * @param canTakeExtra المشرف ومن أذن له: فتح ورد الغد في اليوم نفسه بعد إتمام اليوم
 * @param onSwitchSection لمن أذن له المشرف: الانتقال إلى قسم الخماسيات بلا تسجيل خروج
 * @param canCustomStart أذن المشرف لهذا الحساب أن يبدأ الحفظ من آية يختارها
 * @param trial   وضع التجربة جارٍ (hifz عندها برنامج التجربة): شريطه، و«تخطَّ» في كل خطوة
 * @param onTrialStart / onTrialEnd للمشرف وحده (غائبان عن غيره): الدخول إلى وضع التجربة والخروج منه
 */
export default function HifzScreen({ hifz, homeData, notes, onSaveNote, noteBackRef, reciter, onReciterChange, contacts, onOpenAccount, onSwitchSection, backRef, canTakeExtra = false, canCustomStart = false, trial = false, onTrialStart, onTrialEnd }) {
  const { program, plan, today, celebrate, inSession, method, actions } = hifz;
  const [page, setPage] = useState('home');                  // الصفحة المعروضة (PAGE_TITLE)
  const [confirming, setConfirming] = useState(null);       // سؤال مفتوح أسفل الشاشة: 'reset' | 'cancel'
  const [settingsOpen, setSettingsOpen] = useState(false);   // إعدادات الحفظ: تغيير ورد اليوم بلا إعادة ضبط
  const recordings = useHifzRecordings();
  const [listening, setListening] = useState(null);   // التسجيل المفتوح في شاشة الاستماع
  const [recording, setRecording] = useState(false);  // تسجيل جارٍ: يُغطّى نصّ الورد
  const [methodOpen, setMethodOpen] = useState(false); // طريقة الخماسيات مفتوحة: يُغطّى كذلك

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

  // زرّ الرجوع: يغلق نافذة الطريقة أو شاشة الاستماع أو تنبيه الإتمام أو سؤال التأكيد، ثم يعيد
  // من الصفحة المفتوحة إلى الرئيسية، قبل الشاشة نفسها
  const showCelebration = Boolean(program && celebrate && !listening);
  useEffect(() => {
    if (!backRef) return undefined;
    let closeTop = null;
    if (methodOpen) closeTop = () => setMethodOpen(false);
    else if (listening) closeTop = () => setListening(null);
    else if (showCelebration) closeTop = actions.celebrated;
    else if (confirming) closeTop = () => setConfirming(null);
    else if (program && page !== 'home') closeTop = () => setPage('home');
    if (!closeTop) return undefined;
    backRef.current = closeTop;
    return () => { if (backRef.current === closeTop) backRef.current = null; };
  }, [backRef, methodOpen, listening, showCelebration, confirming, actions, program, page]);

  // الرئيسية: لا برنامج بعدُ (شاشة البدء) أو صفحتها؛ وآية التفسير: المختارة وإلا أول ورد اليوم
  const onHome = !program || page === 'home';
  const todayRef = plan?.verse?.ref ?? null;
  const tafseerRef = homeData.home.tafseer ?? todayRef ?? { s: 1, a: 1 };

  // أدوات تُحقن في الخطوات المفتوحة
  const extras = verse ? {
    backRef,
    reciterSelect: <HifzReciterSelect reciter={reciter} onChange={onReciterChange} />,
    method: <HifzMethodTool refs={verse.refs.filter(Boolean)} linkRef={verse.linkRef} reciter={reciter} method={method} open={methodOpen} onOpenChange={setMethodOpen} onTap={actions.methodTap} onAnswer={actions.methodAnswer} onDone={() => actions.tick('memorize')} />,
    hafizContacts: <HifzContacts contacts={contacts} verse={verse} backRef={backRef} />,
    recorder: <HifzRecorder value={program.progress.record} latest={latestTake} onSave={saveTake} onListen={setListening} onRecordingChange={setRecording} />,
  } : {};

  return (
    <div className="hifz-screen" dir="rtl">
      <div className="hifz-header">
        {onHome ? (
          <button type="button" className="hifz-account" onClick={onOpenAccount} aria-label="الحساب والمزامنة">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.4 4-6.5 8-6.5s7.2 2.1 8 6.5" /></svg>
          </button>
        ) : (
          <button type="button" className="hifz-close" onClick={() => setPage('home')} aria-label="رجوع إلى الرئيسية">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
        <h2>{PAGE_TITLE[onHome ? 'home' : page]}</h2>
        {onHome && onSwitchSection
          ? <button type="button" className="hifz-switch" onClick={onSwitchSection}>⇄ الخماسيات</button>
          : <span className="hifz-header-spacer" />}
      </div>
      {trial && <HifzTrialBar canAdvance={Boolean(program)} onNextDay={actions.nextDay} onJump={actions.jumpDays} onEnd={onTrialEnd} />}

      <div className="hifz-body">
        {!program && <HifzStart onStart={actions.start} canCustomStart={canCustomStart || trial} onTrialStart={trial ? undefined : onTrialStart} />}
        {program && page === 'home' && (
          <HifzHome program={program} plan={plan} today={today} home={homeData.home} homeDay={homeData.day} tafseerRef={tafseerRef} onOpen={setPage} />
        )}
        {program && page === 'azkar' && <HifzAzkar home={homeData.home} day={homeData.day} actions={homeData.actions} />}
        {program && page === 'tasbeeh' && <HifzTasbeeh home={homeData.home} day={homeData.day} actions={homeData.actions} />}
        {program && page === 'tafseer' && (
          <HifzTafseer home={homeData.home} todayRef={todayRef} notes={notes} onSaveNote={onSaveNote} noteBackRef={noteBackRef} actions={homeData.actions} />
        )}
        {program && page === 'day' && (
          <>
            <HifzDayProgress program={program} plan={plan} />

            <HifzTimeline program={program} plan={plan} reciter={reciter} actions={actions} extras={extras} cover={recording ? 'recording' : methodOpen ? 'method' : null} trial={trial} canTakeExtra={canTakeExtra} />
            <HifzRecordingsList recordings={recordings} />
            {!trial && <HifzReminderSettings />}

            <HifzFooter
              confirming={confirming}
              onConfirming={setConfirming}
              canCancel={inSession}
              onReset={() => { actions.reset(); setPage('home'); }}
              onCancel={actions.cancelSession}
              settingsOpen={settingsOpen}
              onToggleSettings={() => setSettingsOpen((v) => !v)}
            />

            {settingsOpen && !confirming && (
              <HifzSettings
                program={program}
                reciter={reciter}
                surah={plan.verse?.ref?.s ?? null}
                onVersesPerDay={actions.setVersesPerDay}
                onBackToStart={() => { actions.reset(); setSettingsOpen(false); setPage('home'); }}
                onTrialStart={onTrialStart && !trial ? () => { setSettingsOpen(false); onTrialStart(); } : undefined}
              />
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
