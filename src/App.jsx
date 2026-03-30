import { useState, useEffect, useRef } from 'react';
import { getSurahAndRange } from './utils/quranLogic';
import TextDisplay from './components/TextDisplay';
import { QURAN_VERSES } from './data/quranVerses';
import { SURAH_METADATA } from './data/quranConstants';
import CounterRing from './components/CounterRing';
import { PAGE_STARTS } from './data/pageStarts';
import menuMainIcon from './assets/menu-main-icon.png';
import KhmasiyatQuiz from './utils/KhmasiyatQuiz';
import RandomAyahQuiz from './utils/RandomAyahQuiz';
import SurahCountQuiz from './utils/SurahCountQuiz';
import PageStartsQuiz from './utils/PageStartsQuiz';
import {
  APP_STORAGE_KEY,
  KHMASIYAT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  hasStoredState,
  loadStoredState,
  removeStoredState,
  saveStoredState
} from './utils/persistence';
import './App.css';

// مصفوفة بأسماء السور الـ 114
const SURAH_NAMES = "الفاتحة,البقرة,آل عمران,النساء,المائدة,الأنعام,الأعراف,الأنفال,التوبة,يونس,هود,يوسف,الرعد,إبراهيم,الحجر,النحل,الإسراء,الكهف,مريم,طه,الأنبياء,الحج,المؤمنون,النور,الفرقان,الشعراء,النمل,القصص,العنكبوت,الروم,لقمان,السجدة,الأحزاب,سبأ,فاطر,يس,الصافات,ص,الزمر,غافر,فصلت,الشورى,الزخرف,الدخان,الجاثية,الأحقاف,محمد,الفتح,الحجرات,ق,الذاريات,الطور,النجم,القمر,الرحمن,الواقعة,الحديد,المجادلة,الحشر,الممتحنة,الصف,الجمعة,المنافقون,التغابن,الطلاق,التحريم,الملك,القلم,الحاقة,المعارج,نوح,الجن,المزمل,المدثر,القيامة,الإنسان,المرسلات,النبأ,النازعات,عبس,التكوير,الانفطار,المطففين,الانشقاق,البروج,الطارق,الأعلى,الغاشية,الفجر,البلد,الشمس,الليل,الضحى,الشرح,التين,العلق,القدر,البينة,الزلزلة,العاديات,القارعة,التكاثر,العصر,الهمزة,الفيل,قريش,الماعون,الكوثر,الكافرون,النصر,المسد,الإخلاص,الفلق,الناس".split(",");

const getPageNumberForVerse = (surah, ayah) => {
  if (!PAGE_STARTS || PAGE_STARTS.length === 0) {
    return null;
  }
  // Find the last page start that is before or at the current verse
  for (let i = PAGE_STARTS.length - 1; i >= 0; i--) {
    const pageStart = PAGE_STARTS[i];
    if (pageStart.s < surah || (pageStart.s === surah && pageStart.a <= ayah)) {
      return pageStart.page;
    }
  }
  return 1; // Default to page 1 if not found (e.g., for Surah Al-Fatiha)
};

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
const SESSION_STORAGE_KEYS = [
  APP_STORAGE_KEY,
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY
];

function App() {
  const [persistedAppState] = useState(() => loadStoredState(APP_STORAGE_KEY) || {});
  const [showSessionPrompt, setShowSessionPrompt] = useState(() => (
    SESSION_STORAGE_KEYS.some(storageKey => hasStoredState(storageKey))
  ));

  // State Management: This holds our current Khmasiyat index (starts at 0)
  const [currentIndex, setCurrentIndex] = useState(() => (
    Number.isInteger(persistedAppState.currentIndex) ? persistedAppState.currentIndex : 0
  ));
  const [viewMode, setViewMode] = useState(() => (
    typeof persistedAppState.viewMode === 'string' ? persistedAppState.viewMode : 'khmasiyat'
  )); // 'khmasiyat', 'shared-verses', 'starred'
  const [sharedGroupIndex, setSharedGroupIndex] = useState(() => (
    Number.isInteger(persistedAppState.sharedGroupIndex) ? persistedAppState.sharedGroupIndex : 0
  ));
  const [starredIndices, setStarredIndices] = useState(() => (
    new Set(Array.isArray(persistedAppState.starredIndices) ? persistedAppState.starredIndices : [])
  ));
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [blinkIndex, setBlinkIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState(() => (
    typeof persistedAppState.jumpInput === 'string' ? persistedAppState.jumpInput : ''
  ));
  const [jumpError, setJumpError] = useState('');
  const [pageJumpInput, setPageJumpInput] = useState(() => (
    typeof persistedAppState.pageJumpInput === 'string' ? persistedAppState.pageJumpInput : ''
  ));
  const [pageJumpError, setPageJumpError] = useState('');
  const [nightCounters, setNightCounters] = useState(() => {
    if (Array.isArray(persistedAppState.nightCounters) && persistedAppState.nightCounters.length > 0) {
      return persistedAppState.nightCounters;
    }
    const initialValue = Number.isInteger(persistedAppState.nightCounterValue)
      ? persistedAppState.nightCounterValue
      : 0;
    return [
      {
        id: 'counter-1',
        name: 'العداد',
        value: initialValue,
        limit: null
      }
    ];
  });
  const [activeNightCounterId, setActiveNightCounterId] = useState(() => {
    if (typeof persistedAppState.activeNightCounterId === 'string') {
      return persistedAppState.activeNightCounterId;
    }
    if (Array.isArray(persistedAppState.nightCounters) && persistedAppState.nightCounters[0]?.id) {
      return persistedAppState.nightCounters[0].id;
    }
    return 'counter-1';
  });
  const [isNightCounterSettingsOpen, setIsNightCounterSettingsOpen] = useState(false);
  const [nightCounterNameInput, setNightCounterNameInput] = useState('');
  const [nightCounterValueInput, setNightCounterValueInput] = useState('0');
  const [nightCounterLimitInput, setNightCounterLimitInput] = useState('');
  const [nightTimerSeconds, setNightTimerSeconds] = useState(() => (
    Number.isInteger(persistedAppState.nightTimerSeconds) ? persistedAppState.nightTimerSeconds : 0
  ));
  const [isNightTimerRunning, setIsNightTimerRunning] = useState(() => (
    Boolean(persistedAppState.isNightTimerRunning)
  ));
  const [isPlaying, setIsPlaying] = useState(false);
  const [hijriData, setHijriData] = useState([]);
  const [hijriIndex, setHijriIndex] = useState(0);
  
  // إعدادات الخط
  const [isAyahMenuOpen, setIsAyahMenuOpen] = useState(false);
  const [activeAyahTest, setActiveAyahTest] = useState(() => (
    typeof persistedAppState.activeAyahTest === 'string' ? persistedAppState.activeAyahTest : null
  ));
  const [activePageStartsTest, setActivePageStartsTest] = useState(() => (
    typeof persistedAppState.activePageStartsTest === 'string' ? persistedAppState.activePageStartsTest : null
  ));
  const [isPageStartsMenuOpen, setIsPageStartsMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [pageStartsData, setPageStartsData] = useState([]);
  const [isPageStartsLoading, setIsPageStartsLoading] = useState(false);
  const [pageStartsError, setPageStartsError] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(() => (
    Number.isInteger(persistedAppState.currentPageIndex) ? persistedAppState.currentPageIndex : 0
  ));
  const [starredPages, setStarredPages] = useState(() => (
    new Set(Array.isArray(persistedAppState.starredPages) ? persistedAppState.starredPages : [])
  ));
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => (
    Number.isInteger(persistedAppState.fontSize) ? persistedAppState.fontSize : 38
  ));
  const [fontFamily, setFontFamily] = useState(() => (
    typeof persistedAppState.fontFamily === 'string' ? persistedAppState.fontFamily : "'Tajawal', sans-serif"
  ));
  const [fontWeight, setFontWeight] = useState(() => (
    typeof persistedAppState.fontWeight === 'string' ? persistedAppState.fontWeight : 'bold'
  ));
  const [fontColor, setFontColor] = useState(() => (
    typeof persistedAppState.fontColor === 'string' ? persistedAppState.fontColor : 'darkgreen'
  ));
  const [isNightMode, setIsNightMode] = useState(() => (
    Boolean(persistedAppState.isNightMode)
  ));

  const actionButtonsRef = useRef(null);
  const audioRef = useRef(null);
  const nightCounterAudioCtxRef = useRef(null);
  const navAudioCtxRef = useRef(null);
  const lastKhmasiyatIndexRef = useRef(currentIndex);
  const skipKhmasiyatNavSoundRef = useRef(true);
  const moreMenuRef = useRef(null);
  const pageStartsMenuRef = useRef(null);
  const ayahMenuRef = useRef(null);
  const nightCounterSettingsRef = useRef(null);
  const swipeStartRef = useRef(null);

  const starredArray = Array.from(starredIndices).sort((a, b) => a - b);
  const starredPagesArray = Array.from(starredPages).sort((a, b) => a - b);

  const isPageStartsMode = viewMode === 'page-starts' || viewMode === 'page-starred';
  const isNightCounterMode = viewMode === 'night-counter';
  const activeNightCounter = nightCounters.find(counter => counter.id === activeNightCounterId) || nightCounters[0];

  useEffect(() => {
    if (isPageStartsMode) setIsFontMenuOpen(false);
  }, [isPageStartsMode]);

  useEffect(() => {
    if (!nightCounters.length) {
      setNightCounters([{
        id: 'counter-1',
        name: 'العداد',
        value: 0,
        limit: null
      }]);
      setActiveNightCounterId('counter-1');
      return;
    }
    if (!activeNightCounter) {
      setActiveNightCounterId(nightCounters[0].id);
    }
  }, [activeNightCounter, nightCounters]);

  useEffect(() => {
    if (!activeNightCounter) return;
    setNightCounterNameInput(activeNightCounter.name || '');
    setNightCounterValueInput(String(activeNightCounter.value ?? 0));
    setNightCounterLimitInput(
      Number.isInteger(activeNightCounter.limit) ? String(activeNightCounter.limit) : ''
    );
  }, [activeNightCounterId, activeNightCounter]);

  useEffect(() => {
    saveStoredState(APP_STORAGE_KEY, {
      currentIndex,
      viewMode,
      sharedGroupIndex,
      starredIndices: Array.from(starredIndices),
      jumpInput,
      pageJumpInput,
      nightCounters,
      activeNightCounterId,
      nightTimerSeconds,
      isNightTimerRunning,
      activeAyahTest,
      activePageStartsTest,
      currentPageIndex,
      starredPages: Array.from(starredPages),
      fontSize,
      fontFamily,
      fontWeight,
      fontColor,
      isNightMode,
    });
  }, [
    activeAyahTest,
    activePageStartsTest,
    currentIndex,
    currentPageIndex,
    fontColor,
    fontFamily,
    fontSize,
    fontWeight,
    isNightMode,
    jumpInput,
    pageJumpInput,
    nightCounters,
    activeNightCounterId,
    nightTimerSeconds,
    isNightTimerRunning,
    sharedGroupIndex,
    starredIndices,
    starredPages,
    viewMode,
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('night-mode', isNightMode);
  }, [isNightMode]);

  // Logic: We pass the state to our pure function to get the exact Surah details
  const currentKhmasiyat = getSurahAndRange(currentIndex);
  const lastVerseIndex = currentKhmasiyat.absoluteEndIndex - 1;
  const khmasiyatVersesText = QURAN_VERSES[lastVerseIndex] ? [QURAN_VERSES[lastVerseIndex]] : [];
  const currentPageStartVerse = pageStartsData[currentPageIndex] || null;
  const currentVersesText = isPageStartsMode
    ? (currentPageStartVerse ? [currentPageStartVerse] : [])
    : khmasiyatVersesText;

  const lastVerseOfKhmasiya = QURAN_VERSES[currentKhmasiyat.absoluteEndIndex - 1];
  const khmasiyatPageNumber = (viewMode === 'khmasiyat' && lastVerseOfKhmasiya)
    ? getPageNumberForVerse(lastVerseOfKhmasiya.s, lastVerseOfKhmasiya.a)
    : null;

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

  useEffect(() => {
    if (pageJumpError) {
      const timer = setTimeout(() => setPageJumpError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [pageJumpError]);

  // Hide tooltip when clicking/touching anywhere else outside the container
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionButtonsRef.current && !actionButtonsRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
      if (nightCounterSettingsRef.current && !nightCounterSettingsRef.current.contains(event.target)) {
        setIsNightCounterSettingsOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
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
      if (Array.isArray(PAGE_STARTS) && PAGE_STARTS.length === 604) {
        setPageStartsData(PAGE_STARTS);
        return;
      }

      const cachedRaw = localStorage.getItem('pageStartsDataV1');
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached) && cached.length === 604) {
          setPageStartsData(cached);
          return;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('offline');
      }

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
      try {
        localStorage.setItem('pageStartsDataV1', JSON.stringify(ordered));
      } catch {
        // ignore
      }
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
    setIsMoreMenuOpen(false);
  };
  const handlePageStartsOptionClick = (option) => {
    if (option === 'بدايات صفحات') {
      setViewMode('page-starts');
      loadPageStartsData();
    } else if (option === 'اختبار بدايات صفحات') {
      setActivePageStartsTest('page-starts');
    }
    setIsPageStartsMenuOpen(false);
    setIsMoreMenuOpen(false);
  };

  const isQuizMode =
    activeAyahTest === 'khmasiyat' ||
    activeAyahTest === 'random-ayat' ||
    activeAyahTest === 'surah-count' ||
    activePageStartsTest === 'page-starts';

  useEffect(() => {
    if (viewMode === 'page-starts' || viewMode === 'page-starred') {
      loadPageStartsData();
    }
  }, [viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkIndex(prev => (prev + 1) % blinkValues.length);
    }, 800); // Changes the number every 800 milliseconds
    return () => clearInterval(interval);
  }, []);

  // جلب التاريخ الهجري من واجهة Aladhan API تلقائياً
  useEffect(() => {
    if (isPageStartsMode) return;
    if (hijriData.length === 0) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
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
  }, [hijriData.length, isPageStartsMode]);

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

  useEffect(() => {
    if (viewMode !== 'khmasiyat') {
      lastKhmasiyatIndexRef.current = currentIndex;
      return;
    }
    if (skipKhmasiyatNavSoundRef.current) {
      skipKhmasiyatNavSoundRef.current = false;
      lastKhmasiyatIndexRef.current = currentIndex;
      return;
    }
    if (currentIndex === lastKhmasiyatIndexRef.current) return;
    playKhmasiyatNavSound();
    lastKhmasiyatIndexRef.current = currentIndex;
  }, [currentIndex, viewMode]);

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

  const playNightCounterSound = async (type) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!nightCounterAudioCtxRef.current) {
        nightCounterAudioCtxRef.current = new AudioCtx();
      }
      const ctx = nightCounterAudioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === 'up' ? 0.14 : 0.08, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'up' ? 0.06 : 0.12));
      gain.connect(ctx.destination);

      if (type === 'up') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(780, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // ignore
    }
  };

  const playKhmasiyatNavSound = async () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!navAudioCtxRef.current) {
        navAudioCtxRef.current = new AudioCtx();
      }
      const ctx = navAudioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // ignore
    }
  };

  const handleSwipeNav = (direction) => {
    if (viewMode === 'khmasiyat') {
      if (direction === 'next') setCurrentIndex(prev => Math.min(1201, prev + 1));
      if (direction === 'prev') setCurrentIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (viewMode === 'page-starts') {
      if (direction === 'next') setCurrentPageIndex(prev => Math.min(pageStartsData.length - 1, prev + 1));
      if (direction === 'prev') setCurrentPageIndex(prev => Math.max(0, prev - 1));
    }
  };

  const onSwipeTouchStart = (e) => {
    if (viewMode !== 'khmasiyat' && viewMode !== 'page-starts') return;
    const t = e.touches?.[0];
    if (!t) return;
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onSwipeTouchEnd = (e) => {
    if (viewMode !== 'khmasiyat' && viewMode !== 'page-starts') return;
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const t = e.changedTouches?.[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < 60 || absX < absY * 1.4) return;

    // Requested behavior: swipe right => next, swipe left => past
    if (dx > 0) handleSwipeNav('next');
    else handleSwipeNav('prev');
  };

  useEffect(() => {
    if (!isNightTimerRunning) return;
    const timer = setInterval(() => {
      setNightTimerSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isNightTimerRunning]);

  const clearSavedSession = () => {
    SESSION_STORAGE_KEYS.forEach(storageKey => removeStoredState(storageKey));
  };

  const handleStartFresh = () => {
    clearSavedSession();
    if (audioRef.current) audioRef.current.pause();
    setCurrentIndex(0);
    setViewMode('khmasiyat');
    setSharedGroupIndex(0);
    setStarredIndices(new Set());
    setActiveTooltip(null);
    setJumpInput('');
    setJumpError('');
    setPageJumpInput('');
    setPageJumpError('');
    setNightCounters([{
      id: 'counter-1',
      name: 'العداد',
      value: 0,
      limit: null
    }]);
    setActiveNightCounterId('counter-1');
    setNightCounterNameInput('العداد');
    setNightCounterValueInput('0');
    setNightCounterLimitInput('');
    setIsNightCounterSettingsOpen(false);
    setNightTimerSeconds(0);
    setIsNightTimerRunning(false);
    setIsPlaying(false);
    setIsAyahMenuOpen(false);
    setActiveAyahTest(null);
    setActivePageStartsTest(null);
    setIsPageStartsMenuOpen(false);
    setPageStartsError('');
    setCurrentPageIndex(0);
    setStarredPages(new Set());
    setIsFontMenuOpen(false);
    setFontSize(38);
    setFontFamily("'Tajawal', sans-serif");
    setFontWeight('bold');
    setFontColor('darkgreen');
    setIsNightMode(false);
    setShowSessionPrompt(false);
  };

  const handleResumeSession = () => {
    setShowSessionPrompt(false);
  };

  const applyNightCounterInputs = () => {
    if (!activeNightCounter) return;
    const name = nightCounterNameInput.trim() || 'العداد';
    const parsedValue = parseInt(nightCounterValueInput, 10);
    const parsedLimit = parseInt(nightCounterLimitInput, 10);
    const value = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
    const limit = Number.isFinite(parsedLimit) ? Math.max(0, parsedLimit) : null;
    const finalValue = limit !== null ? Math.min(value, limit) : value;

    setNightCounters(prev => prev.map(counter => (
      counter.id === activeNightCounterId
        ? { ...counter, name, value: finalValue, limit }
        : counter
    )));
    setNightCounterNameInput(name);
    setNightCounterValueInput(String(finalValue));
    setNightCounterLimitInput(limit !== null ? String(limit) : '');
  };

  const handleAddNightCounter = () => {
    const nextIndex = nightCounters.length + 1;
    const newCounter = {
      id: `counter-${Date.now()}`,
      name: `عداد ${nextIndex}`,
      value: 0,
      limit: null
    };
    setNightCounters(prev => [...prev, newCounter]);
    setActiveNightCounterId(newCounter.id);
    setIsNightCounterSettingsOpen(true);
    setNightCounterNameInput(newCounter.name);
    setNightCounterValueInput('0');
    setNightCounterLimitInput('');
  };

  const handleEditNightCounter = (counterId) => {
    setActiveNightCounterId(counterId);
  };

  const handleResetNightCounter = (counterId) => {
    setNightCounters(prev => prev.map(counter => (
      counter.id === counterId
        ? { ...counter, value: 0 }
        : counter
    )));
  };

  const handleDeleteNightCounter = (counterId) => {
    setNightCounters(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(counter => counter.id !== counterId);
    });
  };

  const handlePageJump = () => {
    setPageJumpError('');

    const page = parseInt(pageJumpInput, 10);
    if (!Number.isInteger(page) || page < 1 || page > 604) {
      setPageJumpError('الرجاء إدخال رقم صفحة من 1 إلى 604');
      return;
    }

    setCurrentPageIndex(page - 1);
    setPageJumpInput('');
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

  const resolvedFontColor = isNightMode && fontColor === 'darkgreen'
    ? 'var(--app-accent)'
    : fontColor;

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`} style={{
      '--app-font-size': `${fontSize}px`,
      '--app-font-family': fontFamily,
      '--app-font-weight': fontWeight,
      '--app-font-color': resolvedFontColor
    }}>
      {showSessionPrompt && (
        <div className="session-overlay" dir="rtl">
          <div className="session-card">
            <h2 className="session-title">متابعة الجلسة السابقة؟</h2>
            <p className="session-text">يمكنك المتابعة من نفس المكان أو البدء من جديد.</p>
            <div className="session-actions">
              <button type="button" className="khmasiyat-quiz-btn" onClick={handleResumeSession}>متابعة</button>
              <button type="button" className="khmasiyat-quiz-btn secondary" onClick={handleStartFresh}>بدء جديد</button>
            </div>
          </div>
        </div>
      )}
      {/* الأزرار العلوية */}
      {!isQuizMode && viewMode !== 'shared-verses' && viewMode !== 'starred' && viewMode !== 'page-starred' && viewMode !== 'night-counter' && (
      <div className="action-buttons-container upper-actions">
        {(isPageStartsMode || isNightCounterMode) && (
          <>
            {!isNightCounterMode && (
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
          </>
        )}
        {!isPageStartsMode && !isNightCounterMode && viewMode !== 'shared-verses' && (
          <>
            <div className="icon-wrapper" ref={moreMenuRef}>
              <button
                className="action-icon"
                title="المزيد"
                onClick={() => {
                  setIsMoreMenuOpen(prev => !prev);
                  setIsFontMenuOpen(false);
                  setIsPageStartsMenuOpen(false);
                  setIsAyahMenuOpen(false);
                }}
                style={{ backgroundColor: isMoreMenuOpen ? 'var(--app-warn)' : '' }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="2.2" />
                  <circle cx="12" cy="12" r="2.2" />
                  <circle cx="12" cy="19" r="2.2" />
                </svg>
              </button>
              {isMoreMenuOpen && (
                <div className="ayah-menu-popover more-menu-popover" dir="rtl">
                  {['العداد', 'الوضع الليلي', 'الخط'].map(option => (
                    <button
                      key={`more-${option}`}
                      type="button"
                      className={`ayah-menu-item ${option === 'الوضع الليلي' && isNightMode ? 'active' : ''}`}
                      onClick={() => {
                        if (option === 'العداد') {
                          setViewMode('night-counter');
                          setIsMoreMenuOpen(false);
                          return;
                        }
                        if (option === 'الوضع الليلي') {
                          setIsNightMode(prev => !prev);
                          setIsMoreMenuOpen(false);
                          setIsFontMenuOpen(false);
                          return;
                        }
                        if (option === 'الخط') {
                          setIsMoreMenuOpen(false);
                          setIsFontMenuOpen(true);
                          return;
                        }
                        setIsMoreMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {isFontMenuOpen && (
                <div className="settings-popover more-menu-settings">
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
            <div className="icon-wrapper" ref={pageStartsMenuRef}>
              <button
                className="action-icon menu-main-btn"
                title="القائمة"
                onClick={() => {
                  setIsPageStartsMenuOpen(prev => !prev);
                  setIsMoreMenuOpen(false);
                  setIsAyahMenuOpen(false);
                  setIsFontMenuOpen(false);
                }}
                style={{ backgroundColor: isPageStartsMenuOpen ? 'var(--app-warn)' : '' }}
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
                  setIsMoreMenuOpen(false);
                  setIsFontMenuOpen(false);
                }}
                style={{ backgroundColor: isAyahMenuOpen ? 'var(--app-warn)' : '' }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
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
        
        {!isPageStartsMode && !isNightCounterMode && <button 
          className="action-icon calendar-icon" 
          title="التاريخ الهجري"
          style={{ width: '65px', height: '65px' }}
        >
          {hijriData.length > 0 ? (
            <span style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
              {hijriData[hijriIndex]}
            </span>
          ) : (
            <span style={{ fontSize: '14px' }}>...</span>
          )}
        </button>}
      </div>
      )}

      {activeAyahTest === 'khmasiyat' && (
        <KhmasiyatQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {activeAyahTest === 'random-ayat' && (
        <RandomAyahQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {activeAyahTest === 'surah-count' && (
        <SurahCountQuiz onClose={() => setActiveAyahTest(null)} />
      )}

      {activePageStartsTest === 'page-starts' && (
        <PageStartsQuiz onClose={() => setActivePageStartsTest(null)} />
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
              style={{ color: 'var(--app-warn)' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{viewMode === 'page-starred' ? starredPages.size : starredIndices.size}</span>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            <button 
              className="top-star-btn"
              disabled={true}
              style={{ color: 'var(--app-accent)', opacity: 0.5 }}
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
        <div className="content-layout" onTouchStart={onSwipeTouchStart} onTouchEnd={onSwipeTouchEnd}>
          {viewMode !== 'shared-verses' && viewMode !== 'night-counter' && <div className="top-stars-container inside-text-field">
            <button 
              className="top-star-btn"
              title={isPageStartsMode ? "قائمة الصفحات للتثبيت" : "قائمة الخماسيات للتثبيت"}
              onClick={() => setViewMode(isPageStartsMode ? 'page-starred' : 'starred')}
              style={{ color: 'var(--app-accent)' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{isPageStartsMode ? starredPages.size : starredIndices.size}</span>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            {viewMode === 'khmasiyat' && khmasiyatPageNumber && (
              <div className="khmasiyat-page-display">
                صفحة {khmasiyatPageNumber}
              </div>
            )}
            <button 
              className="top-star-btn"
              title={isPageStartsMode ? "تثبيت الصفحة" : "تثبيت الخماسية"}
              onClick={() => isPageStartsMode ? togglePageStar(currentPageIndex) : toggleStar(currentIndex)}
              style={{ color: (isPageStartsMode ? starredPages.has(currentPageIndex) : starredIndices.has(currentIndex)) ? 'var(--app-warn)' : 'var(--app-accent)' }}
            >
              {(isPageStartsMode ? starredPages.has(currentPageIndex) : starredIndices.has(currentIndex)) ? (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
              )}
            </button>
          </div>}

          {viewMode !== 'night-counter' && (
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
          )}
          
          {viewMode === 'night-counter' ? (
            <div className="night-counter-mode">
              <div className="night-counter-toolbar">
                <div className="night-counter-toolbar-side night-counter-toolbar-left" ref={nightCounterSettingsRef}>
                  <button
                    className="action-icon night-counter-top-btn"
                    title="الإعدادات"
                    onClick={() => setIsNightCounterSettingsOpen(prev => !prev)}
                    style={{ backgroundColor: isNightCounterSettingsOpen ? 'var(--app-warn)' : '' }}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.42 7.42 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.42 7.42 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.81 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.24 1.13-.56 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>
                    </svg>
                  </button>
                  {isNightCounterSettingsOpen && (
                    <div className="settings-popover night-counter-settings night-counter-settings-popover" dir="rtl">
                      <div className="night-counter-manager-header">
                        <div className="night-counter-manager-title">عدادات</div>
                        <button
                          type="button"
                          className="night-counter-manager-add"
                          onClick={handleAddNightCounter}
                        >
                          إضافة
                        </button>
                      </div>
                      <div className="night-counter-manager-list">
                        {nightCounters.map(counter => {
                          const isActiveCounter = counter.id === activeNightCounterId;
                          return (
                            <div
                              key={`manager-${counter.id}`}
                              className={`night-counter-manager-card ${isActiveCounter ? 'active' : ''}`}
                            >
                              <div className="night-counter-manager-card-head">
                                <div className="night-counter-manager-name">
                                  {counter.name || 'عداد'}
                                </div>
                                {isActiveCounter && (
                                  <span className="night-counter-manager-badge">نشط</span>
                                )}
                              </div>
                              <div className="night-counter-manager-meta">
                                <span>العد الحالي: {counter.value}</span>
                                <span>الحد: {Number.isInteger(counter.limit) ? counter.limit : '-'}</span>
                              </div>
                              <div className="night-counter-manager-actions">
                                <button
                                  type="button"
                                  className="night-counter-manager-btn primary"
                                  onClick={() => handleEditNightCounter(counter.id)}
                                  title="تعديل"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.12 1.12 3.75 3.75 1.12-1.12z"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="night-counter-manager-btn"
                                  onClick={() => handleResetNightCounter(counter.id)}
                                  title="تصفير"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="night-counter-manager-btn danger"
                                  onClick={() => handleDeleteNightCounter(counter.id)}
                                  disabled={nightCounters.length <= 1}
                                  title="حذف"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="night-counter-editor-label">
                        تعديل: {activeNightCounter?.name || 'عداد'}
                      </div>
                      <div className="night-counter-list">
                        {nightCounters.map(counter => (
                          <button
                            key={counter.id}
                            type="button"
                            className={`night-counter-chip ${counter.id === activeNightCounterId ? 'active' : ''}`}
                            onClick={() => setActiveNightCounterId(counter.id)}
                          >
                            {counter.name || 'العداد'}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="night-counter-chip add"
                          onClick={handleAddNightCounter}
                        >
                          +
                        </button>
                      </div>
                      <div className="settings-row">
                        <input
                          type="text"
                          className="night-counter-input"
                          value={nightCounterNameInput}
                          onChange={(e) => setNightCounterNameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyNightCounterInputs()}
                          placeholder="اسم العداد"
                        />
                      </div>
                      <div className="settings-row night-counter-numbers">
                        <input
                          type="number"
                          className="night-counter-input"
                          value={nightCounterValueInput}
                          onChange={(e) => setNightCounterValueInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyNightCounterInputs()}
                          placeholder="العدد"
                          min="0"
                        />
                        <input
                          type="number"
                          className="night-counter-input"
                          value={nightCounterLimitInput}
                          onChange={(e) => setNightCounterLimitInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyNightCounterInputs()}
                          placeholder="الحد"
                          min="0"
                        />
                      </div>
                      <button
                        type="button"
                        className="night-counter-apply"
                        onClick={applyNightCounterInputs}
                      >
                        تحديث
                      </button>
                    </div>
                  )}
                </div>

                <div className="night-timer night-timer-toolbar">
                  <button
                    type="button"
                    className="night-timer-btn secondary"
                    onClick={() => {
                      setIsNightTimerRunning(false);
                      setNightTimerSeconds(0);
                    }}
                    aria-label="إعادة"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
                    </svg>
                  </button>
                  <div className="night-timer-display">
                    {String(Math.floor(nightTimerSeconds / 60)).padStart(2, '0')}:{String(nightTimerSeconds % 60).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    className="night-timer-btn"
                    onClick={() => setIsNightTimerRunning(prev => !prev)}
                    aria-label={isNightTimerRunning ? 'إيقاف' : 'تشغيل'}
                  >
                    {isNightTimerRunning ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                </div>

                <div className="night-counter-toolbar-side night-counter-toolbar-right">
                  <button
                    className="action-icon night-counter-top-btn"
                    title="العودة للقراءة"
                    onClick={() => setViewMode('khmasiyat')}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="night-counter-screen">
                <button
                  type="button"
                  className="night-counter-circle"
                  style={{ background: 'none', border: 'none' }}
                  onPointerDown={() => {
                    if (!activeNightCounter) return;
                    setIsNightTimerRunning(true);
                    playNightCounterSound('up');
                    setNightCounters(prev => prev.map(counter => {
                      if (counter.id !== activeNightCounterId) return counter;
                      const hasLimit = Number.isInteger(counter.limit);
                      const nextValue = hasLimit
                        ? Math.min(counter.limit, counter.value + 1)
                        : counter.value + 1;
                      return { ...counter, value: nextValue };
                    }));
                  }}
                  aria-label="night counter"
                >
                  <CounterRing value={activeNightCounter?.value ?? 0} />
                </button>
              </div>

              {Number.isInteger(activeNightCounter?.limit) && (
                <div className="night-counter-limit" dir="ltr">
                  <span className="night-counter-pagination">{activeNightCounter?.limit}</span>
                  <span className="night-counter-separator">/</span>
                  <span className="night-counter-pagination">{activeNightCounter?.value ?? 0}</span>
                </div>
              )}

              <div className="night-counter-actions">
                <button
                  type="button"
                  className="night-counter-btn night-counter-reset-btn"
                  onClick={() => {
                    if (!activeNightCounter) return;
                    setNightCounters(prev => prev.map(counter => (
                      counter.id === activeNightCounterId
                        ? { ...counter, value: 0 }
                        : counter
                    )));
                  }}
                  aria-label="تصفير"
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                    <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="night-counter-btn secondary night-counter-minus-btn"
                  onClick={() => {
                    if (!activeNightCounter) return;
                    playNightCounterSound('down');
                    setNightCounters(prev => prev.map(counter => (
                      counter.id === activeNightCounterId
                        ? { ...counter, value: Math.max(0, counter.value - 1) }
                        : counter
                    )));
                  }}
                >
                  -
                </button>
              </div>
            </div>
          ) : viewMode === 'shared-verses' ? (
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
              <div style={{ color: 'var(--app-danger)', fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)` }}>{pageStartsError}</div>
            </div>
          ) : (
            <TextDisplay verses={currentVersesText} />
          )}
          
          {viewMode !== 'night-counter' && (
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
          )}
        </div>
      )}

      {!isPageStartsMode && !isNightCounterMode && viewMode !== 'starred' && (
      <div className="action-buttons-container" ref={actionButtonsRef}>
        {viewMode !== 'shared-verses' && (
          <>
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
                <span style={{ fontSize: '26px', fontWeight: 'bold', fontStyle: 'italic' }}>i</span>
              </button>
            </div>
            
            <div className="icon-wrapper">
              {activeTooltip === 'verses' && (
                <div className="surah-tooltip">
                  عدد الآيات: {verseCount}
                </div>
              )}
              <button 
                className="action-icon" 
                title="عدد الآيات"
                onClick={() => setActiveTooltip(activeTooltip === 'verses' ? null : 'verses')}
              >
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {blinkValues[blinkIndex]}
                </span>
              </button>
            </div>
          </>
        )}

        <button 
          className="action-icon" 
          title="السور المتشابهة في العدد"
          onClick={() => setViewMode(prev => prev === 'khmasiyat' ? 'shared-verses' : 'khmasiyat')}
          style={{ backgroundColor: viewMode === 'shared-verses' ? 'var(--app-warn)' : '' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M5 8h14v2H5zm0 6h14v2H5z"/>
          </svg>
        </button>
        
        {viewMode !== 'shared-verses' && (
          <button 
            className="action-icon" 
            title={isPlaying ? "إيقاف الصوت" : "تشغيل الصوت"}
            onClick={toggleAudio}
            style={{ backgroundColor: isPlaying ? 'var(--app-warn)' : '' }}
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
        )}
      </div>
      )}

      {viewMode === 'khmasiyat' && (
        <>
          <div className="jump-to-container">
            <div className="jump-input-wrapper">
              <div className={`input-inner-wrapper ${jumpError ? 'shake border-error' : ''}`}>
                {!jumpInput && !jumpError && (
                  <div className="marquee-text">
                    أدخل رقم السورة + : + رقم الخماسية، مثلاً 55 : 5 أو أدخل رقم الخماسية مثلاً 120 
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
          <div className="progress-wrapper big-progress">
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
        <>
        <div className="jump-to-container">
          <div className="jump-input-wrapper">
            <div className={`input-inner-wrapper ${pageJumpError ? 'shake border-error' : ''}`}>
              <input
                type="number"
                className="jump-input"
                value={pageJumpInput}
                onChange={(e) => setPageJumpInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePageJump()}
                placeholder="1"
                min="1"
                max="604"
                dir="ltr"
              />
            </div>
            <button onClick={handlePageJump} className="jump-button">اذهب</button>
          </div>
          <div className="jump-error-container">
            {pageJumpError && <p className="jump-error-message">{pageJumpError}</p>}
          </div>
        </div>
        <div className="progress-wrapper big-progress">
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(((currentPageIndex + 1) / 604) * 100, 100)}%`, backgroundColor: 'var(--app-warn)' }}></div>
          </div>
          <div className="progress-text">
            صفحة {currentPageIndex + 1} / 604
          </div>
        </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

export default App;
