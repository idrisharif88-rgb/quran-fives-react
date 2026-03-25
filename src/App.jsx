import { useState, useEffect, useRef } from 'react';
import { getSurahAndRange } from './utils/quranLogic';
import TextDisplay from './components/TextDisplay';
import { QURAN_VERSES } from './data/quranVerses';
import { SURAH_METADATA } from './data/quranConstants';
import './App.css';

// مصفوفة بأسماء السور الـ 114
const SURAH_NAMES = "الفاتحة,البقرة,آل عمران,النساء,المائدة,الأنعام,الأعراف,الأنفال,التوبة,يونس,هود,يوسف,الرعد,إبراهيم,الحجر,النحل,الإسراء,الكهف,مريم,طه,الأنبياء,الحج,المؤمنون,النور,الفرقان,الشعراء,النمل,القصص,العنكبوت,الروم,لقمان,السجدة,الأحزاب,سبأ,فاطر,يس,الصافات,ص,الزمر,غافر,فصلت,الشورى,الزخرف,الدخان,الجاثية,الأحقاف,محمد,الفتح,الحجرات,ق,الذاريات,الطور,النجم,القمر,الرحمن,الواقعة,الحديد,المجادلة,الحشر,الممتحنة,الصف,الجمعة,المنافقون,التغابن,الطلاق,التحريم,الملك,القلم,الحاقة,المعارج,نوح,الجن,المزمل,المدثر,القيامة,الإنسان,المرسلات,النبأ,النازعات,عبس,التكوير,الانفطار,المطففين,الانشقاق,البروج,الطارق,الأعلى,الغاشية,الفجر,البلد,الشمس,الليل,الضحى,الشرح,التين,العلق,القدر,البينة,الزلزلة,العاديات,القارعة,التكاثر,العصر,الهمزة,الفيل,قريش,الماعون,الكوثر,الكافرون,النصر,المسد,الإخلاص,الفلق,الناس".split(",");

// حساب مجاميع السور التي تشترك في نفس عدد الآيات تلقائياً
const surahVerseCounts = {};
QURAN_VERSES.forEach(v => {
  if (!surahVerseCounts[v.s] || v.a > surahVerseCounts[v.s]) {
    surahVerseCounts[v.s] = v.a;
  }
});

const countGroups = {};
Object.keys(surahVerseCounts).forEach(s => {
  const count = surahVerseCounts[s];
  if (!countGroups[count]) countGroups[count] = [];
  countGroups[count].push(Number(s));
});

const SHARED_VERSE_GROUPS = Object.keys(countGroups)
  .map(Number)
  .filter(count => countGroups[count].length > 1) // نأخذ فقط من يشتركون
  .sort((a, b) => a - b)
  .map(count => ({ count, surahs: countGroups[count] }));

function App() {
  // State Management: This holds our current Khmasiyat index (starts at 0)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('khmasiyat'); // 'khmasiyat', 'shared-verses', 'starred'
  const [sharedGroupIndex, setSharedGroupIndex] = useState(0);
  const [starredIndices, setStarredIndices] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [blinkIndex, setBlinkIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState('');
  const [jumpError, setJumpError] = useState('');
  const actionButtonsRef = useRef(null);

  const starredArray = Array.from(starredIndices).sort((a, b) => a - b);

  // Logic: We pass the state to our pure function to get the exact Surah details
  const currentKhmasiyat = getSurahAndRange(currentIndex);
  
  // Data: We extract ONLY the last verse of the current Khmasiyat group
  const lastVerseIndex = currentKhmasiyat.absoluteEndIndex - 1;
  const currentVersesText = QURAN_VERSES[lastVerseIndex] ? [QURAN_VERSES[lastVerseIndex]] : [];

  // Data: Calculate total verses in the currently displayed Surah
  const currentSurahNumber = currentVersesText[0]?.s;
  const verseCount = QURAN_VERSES.filter(v => v.s === currentSurahNumber).length;

  // Auto-hide tooltip after 3 seconds
  useEffect(() => {
    if (activeTooltip) {
      const timer = setTimeout(() => setActiveTooltip(null), 3000);
      return () => clearTimeout(timer); // Cleanup prevents memory leaks
    }
  }, [activeTooltip]);

  // Auto-hide jump error after 3 seconds
  useEffect(() => {
    if (jumpError) {
      const timer = setTimeout(() => setJumpError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [jumpError]);

  // Hide tooltip when clicking/touching anywhere else outside the container
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionButtonsRef.current && !actionButtonsRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Data: Cycle through 11, 29, 52 for the verse count button
  const blinkValues = ['11', '29', '52'];
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkIndex(prev => (prev + 1) % blinkValues.length);
    }, 800); // Changes the number every 800 milliseconds
    return () => clearInterval(interval);
  }, []);

  const toggleStar = (index) => {
    setStarredIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleJump = () => {
    setJumpError('');

    const parts = jumpInput.split(':');

    if (parts.length === 1) {
      const khmasiyatNum = parseInt(parts[0], 10);
      if (isNaN(khmasiyatNum)) {
        setJumpError('الرجاء إدخال أرقام صحيحة');
        return;
      }
      if (khmasiyatNum < 1 || khmasiyatNum > 1202) {
        setJumpError('رقم الخماسية يجب أن يكون بين 1 و 1202');
        return;
      }
      setCurrentIndex(khmasiyatNum - 1);
      setViewMode('khmasiyat');
      setJumpInput('');
      return;
    }

    if (parts.length !== 2) {
      setJumpError('الرجاء استخدام الصيغة الصحيحة، مثلاً 2:10 أو 700');
      return;
    }

    const surahNum = parseInt(parts[0], 10);
    const verseNum = parseInt(parts[1], 10);

    if (isNaN(surahNum) || isNaN(verseNum)) {
      setJumpError('الرجاء إدخال أرقام صحيحة');
      return;
    }

    if (surahNum < 1 || surahNum > 114) {
      setJumpError('رقم السورة يجب أن يكون بين 1 و 114');
      return;
    }

    if (verseNum % 5 !== 0 || verseNum <= 0) {
      setJumpError('رجاء ادخل عدد مناسب');
      return;
    }

    const surahMeta = SURAH_METADATA[surahNum - 1];
    const lastValidEndVerse = Math.floor(surahMeta.verseCount / 5) * 5;
    if (verseNum > lastValidEndVerse) {
      setJumpError(`آخر خماسية في سورة ${surahMeta.name} تنتهي عند الآية ${lastValidEndVerse}`);
      return;
    }

    let chunksBefore = 0;
    for (let i = 0; i < surahNum - 1; i++) {
      chunksBefore += Math.floor(SURAH_METADATA[i].verseCount / 5);
    }

    const chunksInSurah = verseNum / 5;
    const newIndex = chunksBefore + chunksInSurah - 1;

    setCurrentIndex(newIndex);
    setViewMode('khmasiyat');
    setJumpInput('');
  };

  return (
    <div className="app-container">
      <h1 className="app-title">خماسيات القرآن الكريم</h1>
      
      <div className="top-stars-container">
        {/* النجمة اليمنى: تعرض العداد وتفتح القائمة */}
        <button 
          className="top-star-btn"
          title="قائمة الخماسيات للتثبيت"
          onClick={() => setViewMode(prev => prev === 'starred' ? 'khmasiyat' : 'starred')}
          style={{ color: viewMode === 'starred' ? '#f39c12' : 'darkgreen' }}
        >
          <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{starredIndices.size}</span>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>

        {/* النجمة اليسرى: تضيف الخماسية الحالية للقائمة */}
        <button 
          className="top-star-btn"
          title="تثبيت الخماسية"
          onClick={() => toggleStar(currentIndex)}
          disabled={viewMode !== 'khmasiyat'}
          style={{ color: starredIndices.has(currentIndex) ? '#f39c12' : 'darkgreen' }}
        >
          {starredIndices.has(currentIndex) ? (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
          )}
        </button>
      </div>

      {viewMode === 'starred' ? (
        <div className="starred-list-container">
          {starredArray.length === 0 ? (
            <div className="empty-starred">لا توجد خماسيات مثبتة بعد</div>
          ) : (
            starredArray.map(index => {
              const kh = getSurahAndRange(index);
              const lastVerseIdx = kh.absoluteEndIndex - 1;
              const verse = QURAN_VERSES[lastVerseIdx];
              return (
                <div 
                  key={index} 
                  className="starred-rectangle"
                  onClick={() => {
                    setCurrentIndex(index);
                    setViewMode('khmasiyat');
                  }}
                >
                  <div className="starred-title">سورة {kh.name}</div>
                  <div className="starred-preview">
                    {verse?.t} <span className="starred-verse-num">﴿{verse?.a}﴾</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="content-layout">
          <button 
            onClick={() => {
              if (viewMode === 'khmasiyat') {
                setCurrentIndex(prev => Math.max(0, prev - 1));
              } else if (viewMode === 'shared-verses') {
                setSharedGroupIndex(prev => Math.max(0, prev - 1));
              }
            }}
            className="nav-arrow prev-arrow"
            disabled={(viewMode === 'khmasiyat' && currentIndex === 0) || 
                      (viewMode === 'shared-verses' && sharedGroupIndex === 0)}
            title="السابق">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
          
          {viewMode === 'shared-verses' ? (
            <div className="verse-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: 'darkgreen', fontWeight: 'bold', fontSize: '48px', marginBottom: '20px' }}>
                {SHARED_VERSE_GROUPS[sharedGroupIndex].count}
              </div>
              <div style={{ color: 'darkgreen', fontWeight: 'bold', fontSize: '32px', lineHeight: '1.8' }}>
                {SHARED_VERSE_GROUPS[sharedGroupIndex].surahs.map(s => `[${SURAH_NAMES[s - 1]}]`).join(' ، ')}
              </div>
            </div>
          ) : (
            <TextDisplay verses={currentVersesText} />
          )}
          
          <button 
            onClick={() => {
              if (viewMode === 'khmasiyat') {
                setCurrentIndex(prev => Math.min(1201, prev + 1));
              } else if (viewMode === 'shared-verses') {
                setSharedGroupIndex(prev => Math.min(SHARED_VERSE_GROUPS.length - 1, prev + 1));
              }
            }}
            className="nav-arrow next-arrow"
            disabled={(viewMode === 'khmasiyat' && currentIndex === 1201) || (viewMode === 'shared-verses' && sharedGroupIndex === SHARED_VERSE_GROUPS.length - 1)}
            title="التالي">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="action-buttons-container" ref={actionButtonsRef}>
        <div className="icon-wrapper">
          {activeTooltip === 'surah' && (
            <div className="surah-tooltip">
              {currentKhmasiyat.name} ({currentVersesText[0]?.s})
            </div>
          )}
          <button 
            className="action-icon" 
            title="فهرس السور"
            onClick={() => setActiveTooltip(activeTooltip === 'surah' ? null : 'surah')}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
            </svg>
          </button>
        </div>
        
        <div className="icon-wrapper">
          {activeTooltip === 'verses' && (
            <div 
              className="surah-tooltip"
            >
              عدد الآيات: {verseCount}
            </div>
          )}
          <button 
            className="action-icon" 
            title="عدد الآيات"
            onClick={() => setActiveTooltip(activeTooltip === 'verses' ? null : 'verses')}
          >
            <span style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Arial' }}>
              {blinkValues[blinkIndex]}
            </span>
          </button>
        </div>

        <button 
          className="action-icon" 
          title="السور المتشابهة في العدد"
          onClick={() => setViewMode(prev => prev === 'khmasiyat' ? 'shared-verses' : 'khmasiyat')}
          style={{ backgroundColor: viewMode === 'shared-verses' ? 'darkgreen' : '', color: viewMode === 'shared-verses' ? '#fff' : '' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M5 8h14v2H5zm0 6h14v2H5z"/>
          </svg>
        </button>
        
        {/* استعادة أيقونة الصوت ليبقى لدينا 4 أيقونات دائرية سفلية */}
        <button className="action-icon" title="تشغيل الصوت">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </div>

      {viewMode === 'khmasiyat' && (
        <>
          <div className="jump-to-container">
            <div className="jump-input-wrapper">
              <div className={`input-inner-wrapper ${jumpError ? 'shake border-error' : ''}`}>
                {!jumpInput && !jumpError && (
                  <div className="marquee-text">
                    أدخل رقم السورة + : + رقم الخماسية، مثلاً 5:55 أو أدخل رقم الخماسية
                  </div>
                )}
                <input
                  type="text"
                  className="jump-input"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJump()}
                  dir="ltr"
                />
              </div>
              <button onClick={handleJump} className="jump-button">اذهب</button>
            </div>
            <div className="jump-error-container">
              {jumpError && <p className="jump-error-message">{jumpError}</p>}
            </div>
          </div>
          <div className="progress-wrapper">
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${Math.min(((currentIndex + 1) / 1202) * 100, 100)}%` }}></div>
            </div>
            <div className="progress-text">
              {currentIndex + 1} / 1202
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
