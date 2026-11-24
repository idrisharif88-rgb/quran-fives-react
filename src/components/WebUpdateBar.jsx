import useWebUpdate from '../hooks/useWebUpdate';
import HijriMonthsReminder from './HijriMonthsReminder';

/** شريط «نسخة جديدة — حدّث الآن» في الموقع، بشكل شريط التنبيه الموجود. «لاحقًا» يخفيه حتى الفتح التالي. */
export default function WebUpdateBar({ backRef }) {
  const update = useWebUpdate();
  if (!update.ready) return null;
  return (
    <HijriMonthsReminder
      message="نسخة جديدة من الموقع"
      closeLabel="حدّث الآن"
      postponeLabel="لاحقًا"
      onClose={update.apply}
      onPostpone={update.later}
      backRef={backRef}
    />
  );
}
