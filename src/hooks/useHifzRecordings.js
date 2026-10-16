import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  loadRecordingIndex, saveRecordingIndex, writeRecording, readRecordingUrl, deleteRecordingFile,
} from '../utils/hifzRecordingStore';
import { belongsHere, syncRecordings, uploadRecording, forgetRemote, ensureLocal } from '../utils/hifzRecordingSync';
import { canReachServer, currentAccount } from '../utils/fileRemote';

const typeOf = (r) => r.type || 'hifz';

// التسجيلات: على الجهاز، ومنسوخة في حساب صاحبها. تبقى كلها حتى يحذفها المستخدم.
// type: 'hifz' تسجيلات الحفظ («تسجيلاتي»)، 'review' تسجيلات المراجعة في العدّاد — فهرس واحد يجمعهما.
export default function useHifzRecordings(type = 'hifz') {
  const [all, setAll] = useState(loadRecordingIndex);

  // يُقرأ الفهرس من التخزين في كل تعديل: شاشتان مفتوحتان معاً (العدّاد والحفظ) لا تمحو إحداهما ما أضافته الأخرى
  const update = useCallback((change) => {
    const next = change(loadRecordingIndex());
    saveRecordingIndex(next);
    setAll(next);
  }, []);

  // مزامنة عند الفتح: الرفع المؤجَّل وما سُجّل على جهاز آخر
  useEffect(() => {
    let alive = true;
    syncRecordings(loadRecordingIndex())
      // ما أُضيف أثناء المزامنة يبقى
      .then((synced) => {
        if (!alive) return;
        update((prev) => {
          const ids = new Set(synced.map((r) => r.id));
          return [...synced, ...prev.filter((r) => !ids.has(r.id))];
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [update]);

  const add = useCallback(async (blob, meta) => {
    const recording = await writeRecording(blob, { ...meta, type }, currentAccount());
    update((prev) => [...prev, recording]);
    if (canReachServer()) {
      uploadRecording(recording)
        .then((done) => update((prev) => prev.map((r) => (r.id === done.id ? done : r))))
        .catch(() => {});
    }
    return recording;
  }, [update, type]);

  const remove = useCallback(async (recording) => {
    await deleteRecordingFile(recording);
    update((prev) => prev.filter((r) => r.id !== recording.id));
    await forgetRemote(recording);
  }, [update]);

  const loadUrl = useCallback(async (recording) => {
    await ensureLocal(recording);
    return readRecordingUrl(recording);
  }, []);

  const list = useMemo(() => all.filter((r) => belongsHere(r) && typeOf(r) === type), [all, type]);
  return useMemo(() => ({ list, add, remove, loadUrl }), [list, add, remove, loadUrl]);
}
