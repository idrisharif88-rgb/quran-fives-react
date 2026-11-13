import { useMemo } from 'react';
import { TOTAL_VERSES, daysBetween } from '../../utils/hifzSchedule';
import { dayProgress, juzProgress } from '../../utils/hifzStepNav';
import { activeTasbeeh } from '../../utils/hifzHome';
import { TAFSEER_BOOKS, allowedTafseerBook } from '../../utils/tafseerApi';
import { readAccountStatus } from '../../utils/syncAccount';
import HifzRing from './HifzRing';
import SectionSwitchIcon from '../SectionSwitch/SectionSwitchIcon';
import { refsText, isMulti } from './hifzText';

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 6C10 4.500 7.500 4 4 4v14c3.500 0 6 .5 8 2 2-1.500 4.500-2 8-2V4c-3.500 0-6 .5-8 2z" /><path d="M12 6v14" />
  </svg>
);

// قوس نصف دائري يمتلئ من اليمين: ما حُفظ من الجزء الجاري
function Arch({ juz, memorized, total }) {
  const share = total ? Math.min(1, memorized / total) : 0;
  const path = 'M184 104 A84 84 0 0 0 16 104';
  return (
    <div className="hifz-arch" role="img" aria-label={`حفظت ${memorized} من ${total} آية في الجزء ${juz}`}>
      <svg viewBox="0 0 200 112" aria-hidden="true">
        <path className="hifz-ring-track" d={path} fill="none" strokeWidth="13" strokeLinecap="round" />
        {share > 0 && <path className="hifz-ring-fill" d={path} fill="none" strokeWidth="13" strokeLinecap="round" pathLength="100" strokeDasharray={`${share * 100} 100`} />}
      </svg>
      <div className="hifz-arch-mid">
        <strong>{memorized}</strong>
        <span>آية من {total} في الجزء {juz}</span>
      </div>
    </div>
  );
}

/**
 * رئيسية قسم الحفظ: قوس الجزء الجاري، زرّ ورد اليوم، ثم بلاطتان تفتحان صفحتيهما:
 * تفسير، مسبحتي. كل بلاطة تعرض حالها الآن.
 * @param today يوم البرنامج (effectiveDay) — homeDay يوم التقويم لعدّ الأذكار
 * @param onOpen ('day' | 'tafseer' | 'tasbeeh')
 * @param onSwitchSection بإذن المشرف (sectionSwitch): أيقونة الخماسيات في الوسط تحت البلاطتين
 */
export default function HifzHome({ program, plan, today, home, tafseerRef, onOpen, onSwitchSection }) {
  const juz = useMemo(() => juzProgress(program), [program]);
  const progress = dayProgress(program, plan);
  const zikr = activeTasbeeh(home);
  const tafseerBookName = TAFSEER_BOOKS.find((book) => book.id === allowedTafseerBook(home.tafseerBook, readAccountStatus()))?.name ?? '';
  const refs = plan.verse ? plan.verse.refs.filter(Boolean) : [];
  const started = progress.done > 0;
  const title = plan.complete ? 'تمّ ورد اليوم' : started ? 'أكمل ورد اليوم' : 'ابدأ ورد اليوم';

  return (
    <>
      <section className="hifz-section hifz-home-top">
        <Arch {...juz} />
        {/* كل جزء معزول (bdi): رقمان بينهما نقطة يقلب المتصفّح ترتيبهما في السطر العربي */}
        <p className="hifz-home-meta"><bdi>اليوم {daysBetween(program.startedOn, today) + 1}</bdi> · <bdi>{program.memorizedOn.length} من {TOTAL_VERSES} آية</bdi></p>
      </section>

      <button type="button" className={`hifz-home-cta ${plan.complete ? 'complete' : ''}`.trim()} onClick={() => onOpen('day')}>
        <strong>{title}</strong>
        <span>
          {refs.length > 0 && <><bdi>{isMulti(program.rules) ? 'آيات اليوم' : 'آية اليوم'}: {refsText(refs)}</bdi> · </>}
          <bdi>{progress.done} من {progress.total}</bdi>
        </span>
      </button>

      <div className="hifz-home-tiles">
        <button type="button" className="hifz-home-tile" onClick={() => onOpen('tafseer')}>
          <span className="hifz-ring hifz-home-book"><BookIcon /></span>
          <b>تفسير</b>
          <small>{refsText([tafseerRef])} · {tafseerBookName}</small>
        </button>
        <button type="button" className="hifz-home-tile" onClick={() => onOpen('tasbeeh')}>
          <HifzRing value={home.tasbeehCount} total={zikr?.target ?? 0} stroke={12}><em>{home.tasbeehCount}</em></HifzRing>
          <b>مسبحتي</b>
          <small>{zikr ? zikr.text : 'أضف ذكرك'}</small>
        </button>
      </div>

      {onSwitchSection && <SectionSwitchIcon to="fives" onClick={onSwitchSection} />}
    </>
  );
}
