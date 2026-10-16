import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// مشاركة ملف عبر ورقة المشاركة الأصلية، وعلى المتصفح Web Share ثم التنزيل احتياطاً
export async function shareBlob(blob, fileName, title) {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    Share.share({ title, files: [uri] })
      .catch((e) => {
        if (e?.message !== 'Share canceled') alert('تعذّر المشاركة: ' + (e?.message || ''));
      })
      .finally(() => Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {}));
    return;
  }

  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    navigator.share({ files: [file], title }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
