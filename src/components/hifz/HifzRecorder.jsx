import { useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import './HifzRecorder.css';

const clock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const ERRORS = {
  denied: 'لم يُسمح باستخدام الميكروفون. اسمح به من إعدادات التطبيق ثم أعد المحاولة.',
  unsupported: 'التسجيل غير مدعوم على هذا الجهاز.',
  error: 'تعذّر بدء التسجيل. أعد المحاولة.',
};

/**
 * أداة خطوة التسجيل: سجّل ← احفظ ← استمع وعينك على المصحف ← احكم (صحيح أو أعد).
 * كل مقطع يُحفظ يبقى في «تسجيلاتي» حتى يُحذف.
 * @param value     تقدّم الخطوة { recorded, reviewed }
 * @param latest    آخر تسجيل محفوظ لهذه الآية (أو لا شيء)
 * @param onSave    (blob, durationMs) ← يحفظ المقطع
 * @param onListen  يفتح شاشة الاستماع مع المصحف
 */
export default function HifzRecorder({ value, latest, onSave, onListen }) {
  const recorder = useRecorder();
  const [take, setTake] = useState(null);       // مقطع سُجّل ولم يُحفظ بعد
  const [saving, setSaving] = useState(false);
  const [recordAgain, setRecordAgain] = useState(false);

  const stop = async () => setTake(await recorder.stop());

  const save = async () => {
    setSaving(true);
    try {
      await onSave(take.blob, take.durationMs);
      setTake(null);
      setRecordAgain(false);
    } finally {
      setSaving(false);
    }
  };

  // مقطع محفوظ: يُسمع ثم يُحكم عليه — صحيح فتتمّ الخطوة، أو فيه خطأ فيُعاد التسجيل
  if (value.recorded && latest && !recordAgain && !take && recorder.status !== 'recording') {
    return (
      <div className="hifz-tool">
        <button type="button" className="hifz-btn primary" onClick={() => onListen(latest)}>استمع وعينك على المصحف</button>
        <button type="button" className="hifz-link" onClick={() => setRecordAgain(true)}>تسجيل من جديد</button>
      </div>
    );
  }

  if (recorder.status === 'recording') {
    return (
      <div className="hifz-recorder">
        <button type="button" className="hifz-record-btn recording" onClick={stop} aria-label="إيقاف التسجيل"><i /></button>
        <div className="hifz-recorder-info">
          <strong dir="ltr">{clock(recorder.elapsedMs)}</strong>
          <span>جارٍ التسجيل — اضغط للإيقاف</span>
        </div>
      </div>
    );
  }

  if (take) {
    return (
      <div className="hifz-tool">
        <span className="hifz-tool-count" dir="ltr">{clock(take.durationMs)}</span>
        <button type="button" className="hifz-btn primary" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ التسجيل'}</button>
        <button type="button" className="hifz-btn" onClick={() => setTake(null)} disabled={saving}>إعادة</button>
      </div>
    );
  }

  return (
    <div className="hifz-recorder">
      <button type="button" className="hifz-record-btn" onClick={recorder.start} aria-label="بدء التسجيل"><i /></button>
      <div className="hifz-recorder-info">
        <strong>اضغط للتسجيل</strong>
        <span>اقرأ من حفظك ثلاث مرات متتالية بلا خطأ</span>
      </div>
      {ERRORS[recorder.status] && <p className="hifz-tool-error">{ERRORS[recorder.status]}</p>}
    </div>
  );
}
