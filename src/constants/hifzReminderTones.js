import rising from '../assets/tones/hifz_tone_rising.wav';
import soft from '../assets/tones/hifz_tone_soft.wav';
import deep from '../assets/tones/hifz_tone_deep.wav';

// نغمات تذكير الحفظ. لكل نغمة قناة أندرويد خاصة (النغمة تُثبَّت في القناة عند إنشائها)،
// وملفها في android/app/src/main/res/raw باسم file، ونسخة للمعاينة داخل التطبيق (preview).
// system: صوت الإشعار الافتراضي في الهاتف.
export const REMINDER_TONES = [
  { id: 'rising', label: 'أجراس صاعدة', file: 'hifz_tone_rising.wav', preview: rising },
  { id: 'soft', label: 'نغمة هادئة', file: 'hifz_tone_soft.wav', preview: soft },
  { id: 'deep', label: 'جرس عميق', file: 'hifz_tone_deep.wav', preview: deep },
  { id: 'system', label: 'صوت الهاتف', file: null, preview: null },
];

export const DEFAULT_TONE = 'rising';
export const toneById = (id) => REMINDER_TONES.find((t) => t.id === id) || REMINDER_TONES[0];
