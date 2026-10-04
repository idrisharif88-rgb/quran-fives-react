import { useState, useCallback, useMemo } from 'react';
import {
  loadRecordingIndex, saveRecordingIndex, writeRecording, readRecordingUrl, deleteRecordingFile,
} from '../utils/hifzRecordingStore';

// تسجيلات الحفظ المحفوظة على الجهاز: تبقى كلها حتى يحذفها المستخدم
export default function useHifzRecordings() {
  const [list, setList] = useState(loadRecordingIndex);

  const update = useCallback((change) => {
    setList((prev) => {
      const next = change(prev);
      saveRecordingIndex(next);
      return next;
    });
  }, []);

  const add = useCallback(async (blob, meta) => {
    const recording = await writeRecording(blob, meta);
    update((prev) => [...prev, recording]);
    return recording;
  }, [update]);

  const remove = useCallback(async (recording) => {
    await deleteRecordingFile(recording);
    update((prev) => prev.filter((r) => r.id !== recording.id));
  }, [update]);

  return useMemo(() => ({ list, add, remove, loadUrl: readRecordingUrl }), [list, add, remove]);
}
