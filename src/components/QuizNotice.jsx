import CelebrationDialog from './CelebrationDialog';

const percent = (correct, incorrect) => {
  const answered = correct + incorrect;
  return answered === 0 ? '—' : `${Math.round((correct / answered) * 100)}%`;
};

/**
 * ما يُعلَن للمختبِر: نتيجة كاملة عند آخر سؤال في المدى، وتهنئة عند كل محطّة (100، 200…).
 * الاختبار لا يبدأ من جديد وحده — «اختبار جديد» بطلب صاحبه.
 * @param notice    ما تعيده quizNotice: { kind: 'finished' | 'milestone', completed, total } أو null
 * @param onRestart يبدأ دورة جديدة للمدى نفسه
 * @param onClose   يغلق النافذة ويُبقي الاختبار حيث هو
 */
export default function QuizNotice({ notice, correct, incorrect, onRestart, onClose, backRef }) {
  if (!notice) return null;
  const stats = [
    { label: 'صحيح', value: correct, tone: 'good' },
    { label: 'خاطئ', value: incorrect, tone: 'bad' },
    { label: 'النسبة', value: percent(correct, incorrect) },
  ];
  if (notice.kind === 'finished') {
    return (
      <CelebrationDialog
        title="أتممت الاختبار"
        message={`مبارك! أجبت عن أسئلة الاختبار كلّها (${notice.total}). بارك الله فيك وثبّتك.`}
        stats={stats}
        primaryLabel="اختبار جديد"
        onPrimary={onRestart}
        secondaryLabel="إغلاق"
        onClose={onClose}
        backRef={backRef}
      />
    );
  }
  return (
    <CelebrationDialog
      title="أحسنت"
      message={`أتممت ${notice.completed} سؤالاً من ${notice.total}. واصل، بارك الله فيك.`}
      stats={stats}
      primaryLabel="متابعة"
      onPrimary={onClose}
      onClose={onClose}
      backRef={backRef}
    />
  );
}
