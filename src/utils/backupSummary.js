import {
  APP_STORAGE_KEY,
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  SURAH_NAMES_QUIZ_STORAGE_KEY,
} from './persistence';
import { isPristineState } from './deviceData';
import { verseAt } from './hifzSchedule';
import { SURAH_METADATA } from '../data/quranConstants';

const QUIZ_KEYS = [
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  SURAH_NAMES_QUIZ_STORAGE_KEY,
];

const countOf = (v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);

function counterPage(app) {
  const counters = Array.isArray(app.nightCounters) ? app.nightCounters : [];
  const active = counters.find((c) => c.id === app.activeNightCounterId) || counters[0];
  return Number(active?.value) || 0;
}

function hifzOf(program) {
  if (!program || !Array.isArray(program.memorizedOn)) return null;
  const verses = program.memorizedOn.length;
  const last = verses ? verseAt(program.direction, verses - 1, program.origin) : null;
  return {
    verses,
    reached: last ? `${SURAH_METADATA[last.s - 1]?.name} ${last.a}` : null,
    versesPerDay: program.rules?.versesPerDay ?? 1,
    startedOn: program.startedOn || null,
  };
}

function sentenceOf({ isEmpty, counter, hifz, recordings, notes }) {
  if (isEmpty) return '';
  const parts = [];
  if (counter.page) parts.push(`العدّاد عند صفحة ${counter.page}`);
  if (hifz?.verses) parts.push(`الآيات المحفوظة ${hifz.verses}`);
  const records = recordings.hifz + recordings.review;
  if (records) parts.push(`التسجيلات ${records}`);
  if (notes) parts.push(`التفسير ${notes}`);
  return parts.length ? `نسختك فيها: ${parts.join('، و')}.` : 'نسختك فيها بيانات وإعدادات، بلا عدّاد ولا حفظ ولا تسجيلات.';
}

/**
 * ما في نسخة جوجل درايف بكلمات المستخدم. يُحسب من ملف النسخة نفسه، فتعمل النسخ القديمة بلا إعادة حفظ.
 * «فارغة»: لا محتوى للمستخدم فيها — الاختبارات والتفضيلات لا تُحتسب.
 */
export function summarizeBackup(backup) {
  const data = backup?.data && typeof backup.data === 'object' ? backup.data : {};
  const app = data[APP_STORAGE_KEY] || {};
  const list = Array.isArray(backup?.files?.hifz) ? backup.files.hifz : [];
  const recordings = {
    hifz: list.filter((r) => r?.type !== 'review').length,
    review: list.filter((r) => r?.type === 'review').length,
  };
  const counter = { page: counterPage(app), cards: countOf(app.sessions), bestJuzMs: app.stopwatchBestJuzMs ?? null };
  const hifz = hifzOf(app.hifz);
  const notes = countOf(app.verseNotes) + countOf(app.quranicWondersNotes);
  const khatmas = countOf(data['quran-fives-khitma-cache-v1']?.list);
  const isEmpty = isPristineState(data[APP_STORAGE_KEY]) && !recordings.hifz && !recordings.review && !khatmas;
  const summary = {
    isEmpty,
    counter,
    hifz,
    recordings,
    notes,
    stars: Object.values(app.starredByStep || {}).reduce((sum, stars) => sum + countOf(stars), 0)
      + countOf(app.starredPages) + countOf(app.starredPageEnds),
    khatmas,
    ijazat: countOf(app.ijazat),
    quizzes: QUIZ_KEYS.filter((key) => data[key] != null).length,
  };
  return { ...summary, sentence: sentenceOf(summary) };
}
