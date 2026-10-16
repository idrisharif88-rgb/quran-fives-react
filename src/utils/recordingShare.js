import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { readRecordingBlob } from './hifzRecordingStore';

// مشاركة تسجيل (لإرساله إلى المُسمِّع): على الهاتف نسخة مؤقتة في الذاكرة المؤقتة ثم قائمة المشاركة
// — المشاركة لا تصل إلى مساحة التطبيق الخاصة. في المتصفح Web Share أو التنزيل.
export async function shareRecording(recording, name) {
  const ext = recording.file.split('.').pop();
  const fileName = `${name}.${ext}`.replace(/[\\/:*?"<>|]/g, '_');

  if (Capacitor.isNativePlatform()) {
    await Filesystem.copy({ from: recording.file, directory: Directory.Data, to: fileName, toDirectory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title: name, files: [uri] }).catch(() => {});
    return;
  }

  const blob = await readRecordingBlob(recording);
  const file = new File([blob], fileName, { type: recording.mime });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title: name }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
