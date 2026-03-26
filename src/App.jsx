import { useState, useEffect, useRef } from 'react';
import { getSurahAndRange } from './utils/quranLogic';
import TextDisplay from './components/TextDisplay';
import { QURAN_VERSES } from './data/quranVerses';
import { SURAH_METADATA } from './data/quranConstants';
import menuMainIcon from './assets/menu-main-icon.png';
import KhmasiyatQuiz from './utils/KhmasiyatQuiz';
import RandomAyahQuiz from './utils/RandomAyahQuiz';
import SurahCountQuiz from './utils/SurahCountQuiz';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [hijriData, setHijriData] = useState([]);
  const [hijriIndex, setHijriIndex] = useState(0);
  
  // إعدادات الخط
  const [isAyahMenuOpen, setIsAyahMenuOpen] = useState(false);
  const [activeAyahTest, setActiveAyahTest] = useState(null);
  const [isPageStartsMenuOpen, setIsPageStartsMenuOpen] = useState(false);
  const [pageStartsData, setPageStartsData] = useState([]);
  const [isPageStartsLoading, setIsPageStartsLoading] = useState(false);
  const [pageStartsError, setPageStartsError] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [starredPages, setStarredPages] = useState(new Set());
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState(38);
  const [fontFamily, setFontFamily] = useState("'Tajawal', sans-serif");
  const [fontWeight, setFontWeight] = useState("bold");
  const [fontColor, setFontColor] = useState("darkgreen");

  const actionButtonsRef = useRef(null);
  const audioRef = useRef(null);
  const pageStartsMenuRef = useRef(null);
  const ayahMenuRef = useRef(null);
  const fontMenuRef = useRef(null);

  const starredArray = Array.from(starredIndices).sort((a, b) => a - b);
  const starredPagesArray = Array.from(starredPages).sort((a, b) => a - b);

  const isPageStartsMode = viewMode === 'page-starts' || viewMode === 'page-starred';

  // Logic: We pass the state to our pure function to get the exact Surah details
  const currentKhmasiyat = getSurahAndRange(currentIndex);
  const lastVerseIndex = currentKhmasiyat.absoluteEndIndex - 1;
  const khmasiyatVersesText = QURAN_VERSES[lastVerseIndex] ? [QURAN_VERSES[lastVerseIndex]] : [];
  const currentPageStartVerse = pageStartsData[currentPageIndex] || null;
  const currentVersesText = isPageStartsMode
    ? (currentPageStartVerse ? [currentPageStartVerse] : [])
    : khmasiyatVersesText;

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
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target)) {
        setIsFontMenuOpen(false);
      }
      if (ayahMenuRef.current && !ayahMenuRef.current.contains(event.target)) {
        setIsAyahMenuOpen(false);
      }
      if (pageStartsMenuRef.current && !pageStartsMenuRef.current.contains(event.target)) {
        setIsPageStartsMenuOpen(false);
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
  const ayahTestOptions = [
    { id: 'khmasiyat', label: 'اختبار خماسيات' },
    { id: 'random-ayat', label: 'اختبار آيات عشوائي' },
    { id: 'surah-count', label: 'اختبار سور - عدد آيات' }
  ];
  const pageStartsOptions = ['بدايات صفحات', 'اختبار بدايات صفحات'];
  const loadPageStartsData = async () => {
    if (isPageStartsLoading || pageStartsData.length > 0) return;
    setIsPageStartsLoading(true);
    setPageStartsError('');
    try {
      const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
      const json = await res.json();
      if (json.code !== 200 || !json.data?.surahs) {
        throw new Error('bad-response');
      }
      const firstAyahByPage = new Map();
      json.data.surahs.forEach((surah) => {
        surah.ayahs.forEach((ayah) => {
          if (!firstAyahByPage.has(ayah.page)) {
            firstAyahByPage.set(ayah.page, {
              page: ayah.page,
              s: surah.number,
              a: ayah.numberInSurah,
              t: ayah.text
            });
          }
        });
      });
      const ordered = [];
      for (let p = 1; p <= 604; p++) {
        const ayah = firstAyahByPage.get(p);
        if (ayah) ordered.push(ayah);
      }
      if (ordered.length !== 604) {
        throw new Error('missing-pages');
      }
      setPageStartsData(ordered);
    } catch (e) {
      setPageStartsError('تعذر تحميل بدايات الصفحات حالياً. حاول مرة أخرى.');
    } finally {
      setIsPageStartsLoading(false);
    }
  };

  const handleAyahOptionClick = (optionId) => {
    if (['khmasiyat', 'random-ayat', 'surah-count'].includes(optionId)) {
      setActiveAyahTest(optionId);
    } else {
      setActiveAyahTest(null);
    }
    setIsAyahMenuOpen(false);
  };
  const handlePageStartsOptionClick = (option) => {
    if (option === 'بدايات صفحات') {
      setViewMode('page-starts');
      setCurrentPageIndex(0);
      loadPageStartsData();
    } else if (option === 'اختبار بدايات صفحات') {
      setPageStartsError('اختبار بدايات صفحات سيتم إضافته في الخطوة التالية.');
    }
    setIsPageStartsMenuOpen(false);
  };

  const isQuizMode = activeAyahTest === 'khmasiyat' || activeAyahTest === 'random-ayat' || activeAyahTest === 'surah-count';
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkIndex(prev => (prev + 1) % blinkValues.length);
    }, 800); // Changes the number every 800 milliseconds
    return () => clearInterval(interval);
  }, []);

  // جلب التاريخ الهجري من واجهة Aladhan API تلقائياً
  useEffect(() => {
    if (hijriData.length === 0) {
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`)
        .then(res => res.json())
        .then(json => {
          if (json.code === 200) {
            const hijri = json.data.hijri;
            // إزالة "ال" سواء كانت في البداية أو قبلها مسافة، مع إزالة الفراغات الزائدة
            const dayNameWithoutAl = hijri.weekday.ar.replace('ال', '').trim();
            // ترتيب العرض: اسم اليوم، رقم اليوم، اسم الشهر، رقم السنة
            setHijriData([dayNameWithoutAl, hijri.day, hijri.month.ar, hijri.year]);
          }
        })
        .catch(err => console.error("Error fetching Hijri date:", err));
    }
  }, [hijriData.length]);

  // حلقة وميض التاريخ الهجري
  useEffect(() => {
    let interval;
    if (hijriData.length > 0) {
      interval = setInterval(() => {
        setHijriIndex(prev => (prev + 1) % hijriData.length);
      }, 1500); // يتغير النص كل ثانية ونصف ليكون مريحاً للقراءة
    }
    return () => clearInterval(interval);
  }, [hijriData.length]);

  // إيقاف الصوت تلقائياً عند الانتقال لخماسية أخرى أو تغيير وضع العرض
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentIndex, currentPageIndex, viewMode]);

  const toggleAudio = async () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const verse = currentVersesText[0];
      if (verse) {
        // تنسيق رقم السورة والآية ليكون من 3 خانات (مثال: السورة 1 الآية 2 تصبح 001002)
        const surah = verse.s.toString().padStart(3, '0');
        const ayah = verse.a.toString().padStart(3, '0');
        const url = `https://everyayah.com/data/Minshawy_Murattal_128kbps/${surah}${ayah}.mp3`; // يمكنك تغيير المعرف هنا
        
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.onended = () => setIsPlaying(false); // إعادة الأيقونة عند انتهاء التلاوة
        }
        
        // استخدام Cache API لحفظ الصوتيات وتوفير الإنترنت
        if ('caches' in window) {
          try {
            const cache = await caches.open('quran-audio-cache');
            const cachedResponse = await cache.match(url);
            
            if (cachedResponse) {
              // التشغيل من الذاكرة المحلية فوراً
              const blob = await cachedResponse.blob();
              audioRef.current.src = URL.createObjectURL(blob);
            } else {
              // التشغيل من الإنترنت مع الحفظ في الخلفية للمرات القادمة
              if (!audioRef.current.src.includes(`${surah}${ayah}.mp3`)) audioRef.current.src = url;
              fetch(url).then(response => {
                if (response.ok) cache.put(url, response.clone());
              }).catch(e => console.error("Error caching audio in background", e));
            }
          } catch (e) {
            if (!audioRef.current.src.includes(`${surah}${ayah}.mp3`)) audioRef.current.src = url;
          }
        } else {
          if (!audioRef.current.src.includes(`${surah}${ayah}.mp3`)) audioRef.current.src = url;
        }

        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
        setIsPlaying(true);
      }
    }
  };

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

  const togglePageStar = (index) => {
    setStarredPages(prev => {
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
    <div className="app-container" style={{
      '--app-font-size': `${fontSize}px`,
      '--app-font-family': fontFamily,
      '--app-font-weight': fontWeight,
      '--app-font-color': fontColor
    }}>
      {/* الأزرار العلوية */}
      <div className="action-buttons-container upper-actions">
        {isPageStartsMode && (
          <button
            className="action-icon"
            title="العودة للقراءة"
            onClick={() => setViewMode('khmasiyat')}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        )}
        {!isPageStartsMode && (
          <>
            <div className="icon-wrapper" ref={pageStartsMenuRef}>
              <button
                className="action-icon menu-main-btn"
                title="القائمة"
                onClick={() => {
                  setIsPageStartsMenuOpen(prev => !prev);
                  setIsAyahMenuOpen(false);
                  setIsFontMenuOpen(false);
                }}
                style={{ backgroundColor: isPageStartsMenuOpen ? '#f39c12' : '' }}
              >
                <img src={menuMainIcon} alt="القائمة" className="menu-main-icon" />
              </button>
              {isPageStartsMenuOpen && (
                <div className="ayah-menu-popover popover-align-right" dir="rtl">
                  {pageStartsOptions.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="ayah-menu-item"
                      onClick={() => handlePageStartsOptionClick(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="icon-wrapper" ref={ayahMenuRef}>
              <button
                className="action-icon"
                title="اختبارات الآيات"
                onClick={() => {
                  setIsAyahMenuOpen(prev => !prev);
                  setIsPageStartsMenuOpen(false);
                  setIsFontMenuOpen(false);
                }}
                style={{ backgroundColor: isAyahMenuOpen ? '#f39c12' : '' }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    fontFamily: "'Tajawal', 'Noto Naskh Arabic', sans-serif",
                    lineHeight: 1,
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    transform: 'scaleX(1.12)'
                  }}
                >
                  آية
                </span>
              </button>
              {isAyahMenuOpen && (
                <div className="ayah-menu-popover" dir="rtl">
                  {ayahTestOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className="ayah-menu-item"
                      onClick={() => handleAyahOptionClick(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {/* قائمة إعدادات الخط (الثانية من اليسار) */}
        <div className="icon-wrapper" ref={fontMenuRef}>
          <button 
            className="action-icon" 
            title="إعدادات الخط"
            onClick={() => {
              setIsFontMenuOpen(prev => !prev);
              setIsAyahMenuOpen(false);
              setIsPageStartsMenuOpen(false);
            }}
            style={{ backgroundColor: isFontMenuOpen ? '#f39c12' : '' }}
          >
            <span style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>A</span>
          </button>
          
          {isFontMenuOpen && (
            <div className="settings-popover">
              <div className="settings-row font-size-ctrl">
                <button type="button" onClick={() => setFontSize(s => Math.max(16, s - 2))}>-</button>
                <span>{fontSize}</span>
                <button type="button" onClick={() => setFontSize(s => Math.min(100, s + 2))}>+</button>
              </div>
              <div className="settings-row">
                <select className="font-family-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  <option value="'Tajawal', sans-serif">تجوال</option>
                  <option value="'Amiri Quran', serif">أميري قرآني</option>
                  <option value="'Scheherazade New', serif">شهرزاد</option>
                  <option value="'Noto Naskh Arabic', serif">نوتو نسخ</option>
                  <option value="'Amiri', serif">أميري (عادي)</option>
                </select>
              </div>
              <div className="segmented-control">
                <button type="button" className={fontWeight === 'normal' ? 'active' : ''} onClick={() => setFontWeight('normal')}>عادي</button>
                <button type="button" className={fontWeight === 'bold' ? 'active' : ''} onClick={() => setFontWeight('bold')}>عريض</button>
              </div>
              <div className="settings-row colors-row">
              {['#000000', 'darkgreen', '#d9534f', '#007bff', '#ffffff', '#be185d', '#b45309'].map(c => (
                  <button 
                    key={c} 
                    style={{backgroundColor: c, border: c === '#ffffff' && fontColor !== '#ffffff' ? '1px solid #ccc' : ''}} 
                    className={`color-btn ${fontColor === c ? 'active' : ''}`} 
                    onClick={() => setFontColor(c)} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          className="action-icon" 
          title="التاريخ الهجري"
          style={{ width: '65px', height: '65px' }}
        >
          {hijriData.length > 0 ? (
            <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Tajawal, sans-serif', textAlign: 'center', lineHeight: '1.2' }}>
              {hijriData[hijriIndex]}
            </span>
          ) : (
            <span style={{ fontSize: '14px' }}>...</span>
          )}
        </button>
      </div>

      {activeAyahTest === 'khmasiyat' && (
        <KhmasiyatQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {activeAyahTest === 'random-ayat' && (
        <RandomAyahQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {activeAyahTest === 'surah-count' && (
        <SurahCountQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {!isQuizMode && (
        <>
      {viewMode === 'starred' || viewMode === 'page-starred' ? (
        <>
          <div className="top-stars-container starred-mode-stars">
            <button 
              className="top-star-btn"
              title="العودة للقراءة"
              onClick={() => setViewMode(viewMode === 'page-starred' ? 'page-starts' : 'khmasiyat')}
              style={{ color: '#f39c12' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{viewMode === 'page-starred' ? starredPages.size : starredIndices.size}</span>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            <button 
              className="top-star-btn"
              disabled={true}
              style={{ color: 'darkgreen', opacity: 0.5 }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
            </button>
          </div>
          <div className="starred-list-container">
          {viewMode === 'page-starred' ? (
            starredPagesArray.length === 0 ? (
              <div className="empty-starred">لا توجد صفحات مثبتة بعد</div>
            ) : (
              starredPagesArray.map(index => {
                const verse = pageStartsData[index];
                return (
                  <div 
                    key={index} 
                    className="starred-rectangle"
                    onClick={() => {
                      setCurrentPageIndex(index);
                      setViewMode('page-starts');
                    }}
                  >
                    <div className="starred-title">سورة {SURAH_NAMES[verse.s - 1]} - صفحة {verse.page}</div>
                    <div className="starred-preview">
                      {verse?.t} <span className="starred-verse-num">﴿{verse?.a}﴾</span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            starredArray.length === 0 ? (
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
            )
          )}
        </div>
        </>
      ) : (
        <div className="content-layout">
          <div className="top-stars-container inside-text-field">
            <button 
              className="top-star-btn"
              title={isPageStartsMode ? "قائمة الصفحات للتثبيت" : "قائمة الخماسيات للتثبيت"}
              onClick={() => setViewMode(isPageStartsMode ? 'page-starred' : 'starred')}
              style={{ color: 'darkgreen' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{isPageStartsMode ? starredPages.size : starredIndices.size}</span>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            <button 
              className="top-star-btn"
              title={isPageStartsMode ? "تثبيت الصفحة" : "تثبيت الخماسية"}
              onClick={() => isPageStartsMode ? togglePageStar(currentPageIndex) : toggleStar(currentIndex)}
              style={{ color: (isPageStartsMode ? starredPages.has(currentPageIndex) : starredIndices.has(currentIndex)) ? '#f39c12' : 'darkgreen' }}
            >
              {(isPageStartsMode ? starredPages.has(currentPageIndex) : starredIndices.has(currentIndex)) ? (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
              )}
            </button>
          </div>

          <button 
            onClick={() => {
              if (viewMode === 'khmasiyat') {
                setCurrentIndex(prev => Math.max(0, prev - 1));
              } else if (viewMode === 'shared-verses') {
                setSharedGroupIndex(prev => Math.max(0, prev - 1));
              } else if (viewMode === 'page-starts') {
                setCurrentPageIndex(prev => Math.max(0, prev - 1));
              }
            }}
            className="nav-arrow prev-arrow"
            disabled={(viewMode === 'khmasiyat' && currentIndex === 0) || 
                      (viewMode === 'shared-verses' && sharedGroupIndex === 0) ||
                      (viewMode === 'page-starts' && currentPageIndex === 0)}
            title="السابق">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
          
          {viewMode === 'shared-verses' ? (
            <div className="verse-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: '48px', marginBottom: '20px' }}>
                {SHARED_VERSE_GROUPS[sharedGroupIndex].count}
              </div>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)`, lineHeight: '1.8' }}>
                {SHARED_VERSE_GROUPS[sharedGroupIndex].surahs.map(s => `[${SURAH_NAMES[s - 1]}]`).join(' ، ')}
              </div>
            </div>
          ) : viewMode === 'page-starts' && isPageStartsLoading ? (
            <div className="verse-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)` }}>جاري تحميل بيانات الصفحات...</div>
            </div>
          ) : viewMode === 'page-starts' && pageStartsError ? (
            <div className="verse-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: '#d9534f', fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)` }}>{pageStartsError}</div>
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
              } else if (viewMode === 'page-starts') {
                setCurrentPageIndex(prev => Math.min(pageStartsData.length - 1, prev + 1));
              }
            }}
            className="nav-arrow next-arrow"
            disabled={(viewMode === 'khmasiyat' && currentIndex === 1201) || 
                      (viewMode === 'shared-verses' && sharedGroupIndex === SHARED_VERSE_GROUPS.length - 1) ||
                      (viewMode === 'page-starts' && currentPageIndex === pageStartsData.length - 1)}
            title="التالي">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      )}

      {!isPageStartsMode && (
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
            <span style={{ fontSize: '26px', fontWeight: 'bold', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>i</span>
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
          style={{ backgroundColor: viewMode === 'shared-verses' ? '#f39c12' : '' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M5 8h14v2H5zm0 6h14v2H5z"/>
          </svg>
        </button>
        
        <button 
          className="action-icon" 
          title={isPlaying ? "إيقاف الصوت" : "تشغيل الصوت"}
          onClick={toggleAudio}
          style={{ backgroundColor: isPlaying ? '#f39c12' : '' }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>
      )}

      {viewMode === 'khmasiyat' && (
        <>
          <div className="jump-to-container">
            <div className="jump-input-wrapper">
              <div className={`input-inner-wrapper ${jumpError ? 'shake border-error' : ''}`}>
                {!jumpInput && !jumpError && (
                  <div className="marquee-text">
                    أدخل رقم السورة + : + رقم الخماسية، مثلاً 55 : 5 أو أدخل رقم الخماسية
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

      {viewMode === 'page-starts' && !isPageStartsLoading && pageStartsData.length > 0 && (
        <div className="progress-wrapper">
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(((currentPageIndex + 1) / 604) * 100, 100)}%`, backgroundColor: '#f39c12' }}></div>
          </div>
          <div className="progress-text">
            صفحة {currentPageIndex + 1} / 604
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default App;
