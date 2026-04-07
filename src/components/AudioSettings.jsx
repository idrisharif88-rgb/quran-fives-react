import React, { useState } from 'react';
import { RECITERS } from '../data/reciters';
import { downloadSurah, clearAudioCache } from '../utils/audioDownloader';
import { SURAH_METADATA } from '../data/quranConstants';
import './AudioSettings.css';

const AudioSettings = ({ activeReciter, setActiveReciter, currentSurahNumber, onClose }) => {
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const surahName = currentSurahNumber ? SURAH_METADATA[currentSurahNumber - 1]?.name : '';

  const handleDownloadSurah = async () => {
    if (!currentSurahNumber) return;
    
    setIsDownloading(true);
    setStatusMessage(`جاري تحميل سورة ${surahName}...`);
    
    try {
      await downloadSurah(currentSurahNumber, activeReciter, (progress) => {
        setDownloadProgress(progress);
      });
      setStatusMessage('تم تحميل السورة بنجاح.');
    } catch (err) {
      setStatusMessage('حدث خطأ أثناء التحميل. تأكد من اتصالك بالإنترنت.');
      console.error('Audio download error:', err);
    } finally {
      setIsDownloading(false);
      setTimeout(() => {
        setStatusMessage('');
        setDownloadProgress(null);
      }, 3000);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('هل أنت متأكد من حذف جميع الملفات الصوتية المحملة؟')) {
      await clearAudioCache();
      setStatusMessage('تم تفريغ مساحة الصوتيات بنجاح.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <div className="audio-settings-overlay" dir="rtl">
      <div className="audio-settings-card">
        <h2 className="audio-settings-title">إعدادات الصوت والتحميل</h2>
        
        <div className="audio-setting-section">
          <label className="audio-setting-label">اختر القارئ:</label>
          <select 
            className="audio-setting-select"
            value={activeReciter} 
            onChange={(e) => setActiveReciter(e.target.value)}
            disabled={isDownloading}
          >
            {RECITERS.map(reciter => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.name}
              </option>
            ))}
          </select>
        </div>

        <div className="audio-setting-section">
          <label className="audio-setting-label">التحميل للاستماع بدون نت:</label>
          {currentSurahNumber && (
            <button 
              className="khmasiyat-quiz-btn" 
              onClick={handleDownloadSurah}
              disabled={isDownloading}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              {isDownloading ? 'جاري التحميل...' : `تحميل سورة ${surahName}`}
            </button>
          )}
          
          {downloadProgress && (
            <div className="download-progress-container">
              <div className="download-progress-bar">
                <div 
                  className="download-progress-fill" 
                  style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }}
                />
              </div>
              <div className="download-progress-text">
                {downloadProgress.downloaded} / {downloadProgress.total} آية
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="audio-status-message">{statusMessage}</div>
          )}
        </div>

        <div className="audio-setting-section">
          <button 
            className="khmasiyat-quiz-btn danger" 
            onClick={handleClearCache}
            disabled={isDownloading}
            style={{ width: '100%', backgroundColor: 'var(--app-danger)', color: 'white', borderColor: 'var(--app-danger)' }}
          >
            تفريغ مساحة الصوتيات المحملة
          </button>
        </div>

        <div className="audio-settings-actions">
          <button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose} style={{ width: '100%' }}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;
