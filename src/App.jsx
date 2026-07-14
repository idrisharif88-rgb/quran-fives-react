import { useState, useEffect, useRef, useCallback } from 'react';
import { getSurahAndRange } from './utils/quranLogic';
import TextDisplay from './components/TextDisplay';
import { QURAN_VERSES } from './data/quranVerses';
import { SURAH_METADATA } from './data/quranConstants';
import { SURAH_PAGE_COUNTS } from './data/surahPageCounts';
import CounterRing from './components/CounterRing';
import CustomKeyboard, { useCustomKeyboard } from './components/CustomKeyboard';
import { PAGE_STARTS } from './data/pageStarts';
import { PAGE_ENDS } from './data/pageEnds';
import menuMainIcon from './assets/menu-main-icon.png';
import KhmasiyatQuiz from './utils/KhmasiyatQuiz';
import RandomAyahQuiz from './utils/RandomAyahQuiz';
import QuranicWonders from './components/QuranicWonders'; // استيراد المكون الجديد
import SurahCountQuiz from './utils/SurahCountQuiz';
import SurahNamesQuiz from './utils/SurahNamesQuiz';
import UserManual from './components/UserManual';
import PageStartsQuiz from './utils/PageStartsQuiz';
import AudioSettings from './components/AudioSettings';
import QRSync from './components/QRSync';
import SurahTransitionToast from './components/SurahTransitionToast';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DEFAULT_RECITER } from './data/reciters';
import { FIQH_DATA } from './data/fiqhData';
import { getAudioUrl } from './utils/audioDownloader';
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
import { pullRemoteIfChanged, pushLocal, authKhitma, getKhitma, putKhitma } from './utils/cloudSync';
import { SYNC_ENABLED } from './utils/syncConfig';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import QuranFal from './components/QuranFal';
import './App.css';

// كلمة مرور حذف الختمات (قفل بسيط لمنع الحذف العَرَضي، وليست حماية أمنية)
const KHATMA_DELETE_PASSWORD = '27956';

// كلمة سر تفعيل المزامنة السحابية — معطّلة افتراضياً للجميع، تُفعَّل يدوياً بهذه الكلمة فقط
const CLOUD_SYNC_PASSWORD = '27956';
const SYNC_UNLOCK_KEY = 'quran-fives-sync-unlocked-v1';

// مصفوفة بأسماء السور الـ 114
const SURAH_NAMES ="الفاتحة,البقرة,آل عمران,النساء,المائدة,الأنعام,الأعراف,الأنفال,التوبة,يونس,هود,يوسف,الرعد,إبراهيم,الحجر,النحل,الإسراء,الكهف,مريم,طه,الأنبياء,الحج,المؤمنون,النور,الفرقان,الشعراء,النمل,القصص,العنكبوت,الروم,لقمان,السجدة,الأحزاب,سبأ,فاطر,يس,الصافات,ص,الزمر,غافر,فصلت,الشورى,الزخرف,الدخان,الجاثية,الأحقاف,محمد,الفتح,الحجرات,ق,الذاريات,الطور,النجم,القمر,الرحمن,الواقعة,الحديد,المجادلة,الحشر,الممتحنة,الصف,الجمعة,المنافقون,التغابن,الطلاق,التحريم,الملك,القلم,الحاقة,المعارج,نوح,الجن,المزمل,المدثر,القيامة,الإنسان,المرسلات,النبأ,النازعات,عبس,التكوير,الانفطار,المطففين,الانشقاق,البروج,الطارق,الأعلى,الغاشية,الفجر,البلد,الشمس,الليل,الضحى,الشرح,التين,العلق,القدر,البينة,الزلزلة,العاديات,القارعة,التكاثر,العصر,الهمزة,الفيل,قريش,الماعون,الكوثر,الكافرون,النصر,المسد,الإخلاص,الفلق,الناس".split(",");

// خماسيات السور: 1 (الفاتحة) ثم 5، 10، 15... حتى 110
const SURAH_FIVES_ORDER = [1, ...Array.from({ length: Math.floor(114 / 5) }, (_, i) => (i + 1) * 5)];

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
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  'quran_fives_surah_names_quiz_state'
];

const HIJRI_CACHE_KEY = 'quran-fives-hijri-cache';
const HIJRI_MONTHS_AR = ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
const HIJRI_WEEKDAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

// تقويم أم القرى الدقيق المدمج في النظام (بلا انحراف، يصحّح خطأ ±يوم في التقريب القديم)
const HIJRI_UMALQURA_FMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric', month: 'numeric', year: 'numeric',
});

function calcHijriOffline(date) {
  let day, month, year;
  try {
    const parts = HIJRI_UMALQURA_FMT.formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    day = parseInt(get('day'), 10);
    month = parseInt(get('month'), 10); // 1..12
    year = parseInt(get('year'), 10);
  } catch {
    // احتياط لبيئة لا تدعم التقويم: تقريب بسيط
    const diffDays = Math.round((date.getTime() - new Date(2024, 6, 7).getTime()) / 86400000);
    const mc = Math.floor(diffDays / 29.530588853);
    day = Math.max(1, Math.floor((diffDays / 29.530588853 - mc) * 29.530588853) + 1);
    month = ((mc % 12) + 12) % 12 + 1;
    year = 1446 + Math.floor(mc / 12);
  }
  const dayName = HIJRI_WEEKDAYS_AR[date.getDay()].replace('ال', '').trim();
  return [dayName, String(day), HIJRI_MONTHS_AR[month - 1], String(year)];
}

function formatHijriTimestamp(ms) {
  const d = new Date(ms);
  const [dayName, day, month, year] = calcHijriOffline(d);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${dayName} ${day} ${month} ${year} — ${hour12}:${minutes} ${period}`;
}

function App() {
  const [persistedAppState] = useState(() => loadStoredState(APP_STORAGE_KEY) || {});
  const [showSessionPrompt, setShowSessionPrompt] = useState(() => (
    SESSION_STORAGE_KEYS.some(storageKey => hasStoredState(storageKey))
  ));

  const [activeReciter, setActiveReciter] = useState(() => (
    typeof persistedAppState.activeReciter === 'string' ? persistedAppState.activeReciter : DEFAULT_RECITER
  ));
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

  // State Management: This holds our current Khmasiyat index (starts at 0)
  const [currentIndex, setCurrentIndex] = useState(() => (
    Number.isInteger(persistedAppState.currentIndex) ? persistedAppState.currentIndex : 0
  ));
  const [viewMode, setViewMode] = useState(() => (
    typeof persistedAppState.viewMode === 'string' ? persistedAppState.viewMode : 'khmasiyat'
  )); // 'khmasiyat', 'shared-verses', 'starred', 'surah-pages'
  const [surahFivesIndex, setSurahFivesIndex] = useState(() => (
    Number.isInteger(persistedAppState.surahFivesIndex) ? persistedAppState.surahFivesIndex : 0
  ));
  const [sharedGroupIndex, setSharedGroupIndex] = useState(() => {
    const saved = persistedAppState.sharedGroupIndex;
    return Number.isInteger(saved) && saved >= 0 && saved < SHARED_VERSE_GROUPS.length ? saved : 0;
  });
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
  // سجلّ الختمات خاص الآن: لا يُحفظ في الحالة المشتركة بل يُحمَّل من الخادم بعد الدخول
  const [khatmaList, setKhatmaList] = useState([]);
  // قفل الختمات: بيانات الدخول (user + code) وحالة الفتح
  const [khitmaUnlocked, setKhitmaUnlocked] = useState(false);
  const [khitmaUserInput, setKhitmaUserInput] = useState('');
  const [khitmaCodeInput, setKhitmaCodeInput] = useState('');
  const [khitmaAuthError, setKhitmaAuthError] = useState('');
  const [khitmaLoading, setKhitmaLoading] = useState(false);
  const khitmaCredsRef = useRef(null);      // بيانات الدخول المعتمدة للجلسة
  const khitmaSyncReadyRef = useRef(false);  // لتفادي رفع القائمة فور تحميلها
  const khitmaBaseRef = useRef(0);           // طابع آخر نسخة سحبها الجهاز (أساس الرفع)
  const [showKhatmaInput, setShowKhatmaInput] = useState(false);
  const [khatmaIntentionInput, setKhatmaIntentionInput] = useState('');
  const [pendingKhatmaTime, setPendingKhatmaTime] = useState(null);
  const [isKhatmaListOpen, setIsKhatmaListOpen] = useState(false);
  const [isFiqhOpen, setIsFiqhOpen] = useState(false);
  const [expandedFiqhId, setExpandedFiqhId] = useState(null);
  const [editingKhatmaId, setEditingKhatmaId] = useState(null);
  const [editKhatmaIntention, setEditKhatmaIntention] = useState('');
  const [deletingKhatmaId, setDeletingKhatmaId] = useState(null);
  const [deleteKhatmaPassword, setDeleteKhatmaPassword] = useState('');
  const [deleteKhatmaError, setDeleteKhatmaError] = useState(false);

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
  const [pageEndsData, setPageEndsData] = useState([]);
  const [isPageEndsLoading, setIsPageEndsLoading] = useState(false);
  const [pageEndsError, setPageEndsError] = useState('');
  const [currentPageEndIndex, setCurrentPageEndIndex] = useState(() => (
    Number.isInteger(persistedAppState.currentPageEndIndex) ? persistedAppState.currentPageEndIndex : 0
  ));
  const [starredPages, setStarredPages] = useState(() => (
    new Set(Array.isArray(persistedAppState.starredPages) ? persistedAppState.starredPages : [])
  ));
  const [starredPageEnds, setStarredPageEnds] = useState(() => (
    new Set(Array.isArray(persistedAppState.starredPageEnds) ? persistedAppState.starredPageEnds : [])
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
  const [quranicWondersNotes, setQuranicWondersNotes] = useState(() => (
    Array.isArray(persistedAppState.quranicWondersNotes) ? persistedAppState.quranicWondersNotes : []
  ));
  const [activeSurahNamesQuiz, setActiveSurahNamesQuiz] = useState(false);
  const [isUserManualOpen, setIsUserManualOpen] = useState(false);
  // مرساة الموضع قبل دخول مراجعة المثبتات { mode, index } للعودة إليه لاحقاً
  const [reviewAnchor, setReviewAnchor] = useState(null);
  // مؤشّر تحميل أثناء توليد صورة الختمة (PNG) قبل المشاركة
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const [isQRSyncOpen, setIsQRSyncOpen] = useState(false);
  const [isFalOpen, setIsFalOpen] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUnlocked, setSyncUnlocked] = useState(() => {
    try { return localStorage.getItem(SYNC_UNLOCK_KEY) === '1'; } catch { return false; }
  });
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(false);
  const [syncPasswordInput, setSyncPasswordInput] = useState('');
  const [syncPasswordError, setSyncPasswordError] = useState(false);
  const [counterConfirm, setCounterConfirm] = useState({ type: null, id: null });
  const [surahToast, setSurahToast] = useState(null);
  const [isKhRevealed, setIsKhRevealed] = useState(false);
  const [isPageRevealed, setIsPageRevealed] = useState(false);
  const [isPageEndRevealed, setIsPageEndRevealed] = useState(false);

  const actionButtonsRef = useRef(null);
  const audioRef = useRef(null);
  const nightCounterAudioCtxRef = useRef(null);
  const navAudioCtxRef = useRef(null);
  const lastKhmasiyatIndexRef = useRef(currentIndex);
  const skipKhmasiyatNavSoundRef = useRef(true);
  const lastPageIndexRef = useRef(currentPageIndex);
  const skipPageNavSoundRef = useRef(true);
  const lastSurahFivesIndexRef = useRef(surahFivesIndex);
  const skipSurahFivesNavSoundRef = useRef(true);
  const moreMenuRef = useRef(null);
  const pageStartsMenuRef = useRef(null);
  const ayahMenuRef = useRef(null);
  const swipeStartRef = useRef(null);
  const backHandlerRef = useRef();
  const prevSurahRef = useRef(null);
  const skipSurahToastRef = useRef(true);
  const lastBackPressTimeRef = useRef(0);
  const cloudSyncReadyRef = useRef(false);
  const cloudPushTimerRef = useRef(null);
  const cloudPushSeqRef = useRef(0);
  const cloudPushBusyRef = useRef(false);   // رفعة جارية — لا نطلق ثانية بالتوازي
  const cloudPushPendingRef = useRef(null); // آخر لقطة وصلت أثناء الانشغال، تُرفع بعده
  const lastSnapshotRef = useRef(null);

  const starredArray = Array.from(starredIndices).sort((a, b) => a - b);
  const starredPagesArray = Array.from(starredPages).sort((a, b) => a - b);
  const starredPageEndsArray = Array.from(starredPageEnds).sort((a, b) => a - b);

  const isPageStartsMode = viewMode === 'page-starts' || viewMode === 'page-starred';
  const isPageEndsMode = viewMode === 'page-ends' || viewMode === 'page-ends-starred';

  // موضع المرساة الحالي حسب الوضع، وشرط ظهور زر العودة لموضع ما قبل المراجعة
  const indexForReviewMode = (mode) => (
    mode === 'khmasiyat' ? currentIndex : mode === 'page-starts' ? currentPageIndex : currentPageEndIndex
  );
  const showReturnToAnchor = Boolean(
    reviewAnchor &&
    viewMode === reviewAnchor.mode &&
    indexForReviewMode(reviewAnchor.mode) !== reviewAnchor.index
  );

  const handleReturnToAnchor = () => {
    if (!reviewAnchor) return;
    if (reviewAnchor.mode === 'khmasiyat') setCurrentIndex(reviewAnchor.index);
    else if (reviewAnchor.mode === 'page-starts') setCurrentPageIndex(reviewAnchor.index);
    else if (reviewAnchor.mode === 'page-ends') setCurrentPageEndIndex(reviewAnchor.index);
    setReviewAnchor(null);
  };

  // زر «آخر آية»: يظهر بين حقل الإدخال وشريط النسبة، يعيدك لموضعك قبل مراجعة المثبتات
  const renderReturnToAnchor = () => (
    showReturnToAnchor ? (
      <div className="last-verse-bar">
        <button type="button" className="last-verse-btn" onClick={handleReturnToAnchor}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>آخر آية</span>
        </button>
      </div>
    ) : null
  );

  // إلغاء المرساة عند العودة لموضعها يدوياً أو مغادرة أقسام المراجعة لقسم آخر
  useEffect(() => {
    if (!reviewAnchor) return;
    const listMode = reviewAnchor.mode === 'khmasiyat' ? 'starred'
      : reviewAnchor.mode === 'page-starts' ? 'page-starred' : 'page-ends-starred';
    if (viewMode !== reviewAnchor.mode && viewMode !== listMode) {
      setReviewAnchor(null);
      return;
    }
    if (viewMode === reviewAnchor.mode && indexForReviewMode(reviewAnchor.mode) === reviewAnchor.index) {
      setReviewAnchor(null);
    }
  }, [viewMode, currentIndex, currentPageIndex, currentPageEndIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const isNightCounterMode = viewMode === 'night-counter';
  const isSurahFivesMode = viewMode === 'surah-fives';
  const clampedSurahFivesIndex = Math.min(
    Math.max(surahFivesIndex, 0),
    SURAH_FIVES_ORDER.length - 1
  );
  const surahFivesSurahNumber = SURAH_FIVES_ORDER[clampedSurahFivesIndex];
  const surahFivesSurahName = SURAH_NAMES[surahFivesSurahNumber - 1];
  const activeNightCounter = nightCounters.find(counter => counter.id === activeNightCounterId) || nightCounters[0];

  useEffect(() => {
    if (isPageStartsMode || isPageEndsMode) setIsFontMenuOpen(false);
  }, [isPageStartsMode, isPageEndsMode]);

  useEffect(() => {
    if (surahFivesIndex < 0 || surahFivesIndex >= SURAH_FIVES_ORDER.length) {
      setSurahFivesIndex(Math.min(Math.max(surahFivesIndex, 0), SURAH_FIVES_ORDER.length - 1));
    }
  }, [surahFivesIndex]);

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

  // عند فتح التطبيق: اسحب الحالة من الخادم، وإن كانت أحدث طبّقها بإعادة تحميل سريعة.
  // لا يبدأ الرفع التلقائي إلا بعد اكتمال هذه المحاولة (عبر cloudSyncReadyRef).
  useEffect(() => {
    // المزامنة معطّلة افتراضياً، ولا تعمل إلا بعد تفعيلها بكلمة السر (syncUnlocked)
    if (!SYNC_ENABLED || !syncUnlocked) {
      cloudSyncReadyRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const applied = await pullRemoteIfChanged();
        if (cancelled) return;
        if (applied) {
          window.location.reload();
          return;
        }
        cloudSyncReadyRef.current = true;
        setSyncFailed(false);
      } catch {
        // فشل السحب: لا نُفعّل الرفع إطلاقاً. الجهاز لم يعرف حالة الخادم بعد،
        // ورفع حالته المحلية هنا يكتب نسخة قديمة فوق الأحدث من جهاز آخر.
        if (!cancelled) setSyncFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [syncUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // رفع موحّد للسحابة مع حارس تسلسل: آخر عملية رفع فقط هي التي تتحكّم بحالة الواجهة،
  // فلا يكتب رفعٌ قديم فاشل فوق نجاح رفعٍ أحدث (يمنع رسالة «لم تتم» الكاذبة).
  const runCloudPush = (snapshot) => {
    if (!SYNC_ENABLED || !syncUnlocked || !snapshot) return;
    // رفعة واحدة في كل لحظة: التوازي على شبكة بطيئة كان يجعل الرفعة الثانية
    // تصطدم بـ409 من الأولى (أساسها صار قديماً) فتتعطّل المزامنة بلا سبب حقيقي
    if (cloudPushBusyRef.current) { cloudPushPendingRef.current = snapshot; return; }
    cloudPushBusyRef.current = true;
    const token = ++cloudPushSeqRef.current;
    setIsSyncing(true);
    pushLocal(snapshot)
      .then(() => { if (token === cloudPushSeqRef.current) setSyncFailed(false); })
      .catch((e) => {
        // تعارض: جهاز آخر كتب بعدنا. نوقف الرفع حتى يسحب المستخدم الأحدث بزر إعادة المحاولة
        if (e?.status === 409) cloudSyncReadyRef.current = false;
        if (token === cloudPushSeqRef.current) setSyncFailed(true);
        cloudPushPendingRef.current = null; // بعد الفشل لا نكرّر تلقائياً — المعالجة يدوية
      })
      .finally(() => {
        cloudPushBusyRef.current = false;
        if (token === cloudPushSeqRef.current) setIsSyncing(false);
        // ما تجمّع أثناء الانشغال يُرفع الآن بأساس محدّث من الرفعة السابقة
        const pending = cloudPushPendingRef.current;
        cloudPushPendingRef.current = null;
        if (pending) runCloudPush(pending);
      });
  };

  // إعادة المحاولة يدوياً: إن لم يكتمل السحب الأوّلي (أو حدث تعارض) نسحب أوّلاً،
  // فلا يُرفع شيء قبل أن يعرف الجهاز حالة الخادم.
  const handleSyncRetry = async () => {
    if (isSyncing) return;
    if (!cloudSyncReadyRef.current) {
      setIsSyncing(true);
      try {
        const applied = await pullRemoteIfChanged();
        if (applied) {
          window.location.reload();
          return;
        }
        cloudSyncReadyRef.current = true;
        setSyncFailed(false);
      } catch {
        setSyncFailed(true);
        return;
      } finally {
        setIsSyncing(false);
      }
    }
    runCloudPush(lastSnapshotRef.current);
  };

  // تفعيل/إيقاف المزامنة بكلمة السر (للاستخدام الشخصي فقط)
  const handleSyncUnlock = () => {
    if (syncPasswordInput !== CLOUD_SYNC_PASSWORD) {
      setSyncPasswordError(true);
      setSyncPasswordInput('');
      return;
    }
    try { localStorage.setItem(SYNC_UNLOCK_KEY, '1'); } catch { /* تجاهل */ }
    setSyncUnlocked(true);
    setSyncPasswordInput('');
    setSyncPasswordError(false);
    mainKeyboard.closeKeyboard();
  };

  const handleSyncDisable = () => {
    try { localStorage.setItem(SYNC_UNLOCK_KEY, '0'); } catch { /* تجاهل */ }
    cloudSyncReadyRef.current = false;
    setSyncUnlocked(false);
  };

  const closeSyncPanel = () => {
    mainKeyboard.closeKeyboard();
    setIsSyncPanelOpen(false);
    setSyncPasswordInput('');
    setSyncPasswordError(false);
  };

  // لا إعادة محاولة تلقائية عند الفشل — إعادة المحاولة يدوية فقط بالضغط على زر المؤشّر

  useEffect(() => {
    const appStateSnapshot = {
      activeReciter,
      currentIndex,
      viewMode,
      surahFivesIndex,
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
      currentPageEndIndex,
      starredPages: Array.from(starredPages),
      starredPageEnds: Array.from(starredPageEnds),
      fontSize,
      fontFamily,
      fontWeight,
      fontColor,
      quranicWondersNotes, // إضافة الملاحظات للحفظ
      isNightMode,
      // ملاحظة: khatmaList لم يعد ضمن الحالة المشتركة — صار خاصاً على الخادم خلف بيانات دخول
    };
    saveStoredState(APP_STORAGE_KEY, appStateSnapshot);
    lastSnapshotRef.current = appStateSnapshot;

    // رفع الحالة للسحابة بعد توقّف قصير (debounce) ولا يبدأ إلا بعد اكتمال السحب الأولي
    if (SYNC_ENABLED && cloudSyncReadyRef.current) {
      clearTimeout(cloudPushTimerRef.current);
      cloudPushTimerRef.current = setTimeout(() => {
        runCloudPush(appStateSnapshot);
      }, 2500);
    }
  }, [
    activeReciter,
    activeAyahTest,
    activePageStartsTest,
    currentIndex,
    currentPageIndex,
    currentPageEndIndex,
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
    quranicWondersNotes, // إضافة الملاحظات إلى مصفوفة التبعيات
    starredIndices,
    starredPages,
    starredPageEnds,
    surahFivesIndex,
    viewMode,
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('night-mode', isNightMode);
    document.documentElement.style.backgroundColor = isNightMode ? '#0c1116' : '#f4f6f8';
    
    // تحديث لون شريط النظام (Navigation & Status bar) في الأندرويد
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = isNightMode ? '#0c1116' : '#f4f6f8';
  }, [isNightMode]);

  // Logic: We pass the state to our pure function to get the exact Surah details
  // Effect to prevent body scrolling and ensure app fills viewport
  useEffect(() => {
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';

    const blockContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.documentElement.style.height = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);
  const currentKhmasiyat = getSurahAndRange(currentIndex);
  const lastVerseIndex = currentKhmasiyat.absoluteEndIndex - 1;
  
  let khmasiyatVersesText = [];
  if (QURAN_VERSES[lastVerseIndex]) {
    khmasiyatVersesText.push(QURAN_VERSES[lastVerseIndex]);
    const similarKhmasiyatIndices = [962, 963, 965, 966, 968, 970, 972, 1095, 1100, 1101];
    if (similarKhmasiyatIndices.includes(currentIndex) && QURAN_VERSES[lastVerseIndex + 1]) {
      khmasiyatVersesText.push(QURAN_VERSES[lastVerseIndex + 1]);
    }
  }
  const currentPageStartVerse = pageStartsData[currentPageIndex] || null;
  const currentPageEndVerse = pageEndsData[currentPageEndIndex] || null;
  const currentVersesText = isPageStartsMode
    ? (currentPageStartVerse ? [currentPageStartVerse] : [])
    : isPageEndsMode
    ? (currentPageEndVerse ? [currentPageEndVerse] : [])
    : khmasiyatVersesText;

  const lastVerseOfKhmasiya = QURAN_VERSES[currentKhmasiyat.absoluteEndIndex - 1];
  const khmasiyatPageNumber = (viewMode === 'khmasiyat' && lastVerseOfKhmasiya)
    ? getPageNumberForVerse(lastVerseOfKhmasiya.s, lastVerseOfKhmasiya.a)
    : null;

  // Data: Calculate total verses in the currently displayed Surah
  const currentSurahNumber = currentVersesText[0]?.s;
  const verseCount = QURAN_VERSES.filter(v => v.s === currentSurahNumber).length;

  const currentSurahPageCount = currentSurahNumber ? (SURAH_PAGE_COUNTS[currentSurahNumber - 1] || 0) : 0;

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
  const pageStartsOptions = ['بدايات صفحات', 'اختبار بدايات صفحات', 'نهايات صفحات'];
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

  const loadPageEndsData = () => {
    if (isPageEndsLoading || pageEndsData.length > 0) return;
    setIsPageEndsLoading(true);
    setPageEndsError('');
    try {
      if (Array.isArray(PAGE_ENDS) && PAGE_ENDS.length === 604) {
        setPageEndsData(PAGE_ENDS);
      } else {
        setPageEndsError('تعذر تحميل نهايات الصفحات.');
      }
    } catch (e) {
      setPageEndsError('تعذر تحميل نهايات الصفحات حالياً.');
    } finally {
      setIsPageEndsLoading(false);
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
    } else if (option === 'نهايات صفحات') {
      setViewMode('page-ends');
      loadPageEndsData();
    }
    setIsPageStartsMenuOpen(false);
    setIsMoreMenuOpen(false);
  };

  const isQuizMode =
    activeAyahTest === 'khmasiyat' ||
    activeAyahTest === 'random-ayat' ||
    activeAyahTest === 'surah-count' ||
    activePageStartsTest === 'page-starts' ||
    activeSurahNamesQuiz;

  useEffect(() => {
    if (viewMode === 'page-starts' || viewMode === 'page-starred') {
      loadPageStartsData();
    }
    if (viewMode === 'page-ends' || viewMode === 'page-ends-starred') {
      loadPageEndsData();
    }
  }, [viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkIndex(prev => (prev + 1) % blinkValues.length);
    }, 800); // Changes the number every 800 milliseconds
    return () => clearInterval(interval);
  }, []);

  // جلب التاريخ الهجري للمشهد الرئيسي فقط - مع كاش محلي واحتياط بدون إنترنت
  useEffect(() => {
    if (isPageStartsMode || isSurahFivesMode) return;

    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

    // استخدام الكاش أولاً
    try {
      const cached = JSON.parse(localStorage.getItem(HIJRI_CACHE_KEY) || 'null');
      if (cached && cached.date === dateStr && Array.isArray(cached.data) && cached.data.length === 4) {
        setHijriData(cached.data);
        return;
      }
    } catch {}

    // إذا بدون إنترنت، احسب الهجري محلياً
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setHijriData(calcHijriOffline(today));
      return;
    }

    fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`)
      .then(res => res.json())
      .then(json => {
        if (json.code !== 200) {
          setHijriData(calcHijriOffline(today));
          return;
        }
        const hijri = json.data.hijri;
        const dayNameWithoutAl = hijri.weekday.ar.replace('ال', '').trim();
        const data = [dayNameWithoutAl, hijri.day, hijri.month.ar, hijri.year];
        setHijriData(data);
        try {
          localStorage.setItem(HIJRI_CACHE_KEY, JSON.stringify({ date: dateStr, data }));
        } catch {}
      })
      .catch(() => {
        setHijriData(calcHijriOffline(today));
      });
  }, [isPageStartsMode, isSurahFivesMode]);

  useEffect(() => {
    if (hijriData.length === 0) return undefined;

    const interval = setInterval(() => {
      setHijriIndex(prev => (prev + 1) % hijriData.length);
    }, 1500);

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

  useEffect(() => { setIsKhRevealed(false); }, [currentIndex]);
  useEffect(() => { setIsPageRevealed(false); }, [currentPageIndex]);
  useEffect(() => { setIsPageEndRevealed(false); }, [currentPageEndIndex]);

  useEffect(() => {
    const toArabicNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    // خارج وضع الخماسيات: لا إشعار، أبقِ المرجع متزامناً واطلب تخطّي أول استقرار عند العودة
    if (viewMode !== 'khmasiyat') {
      prevSurahRef.current = currentKhmasiyat.surah;
      skipSurahToastRef.current = true;
      setSurahToast(null);
      return;
    }
    // أول استقرار بعد الدخول/العودة لوضع الخماسيات: مزامنة فقط دون إشعار
    if (skipSurahToastRef.current) {
      skipSurahToastRef.current = false;
      prevSurahRef.current = currentKhmasiyat.surah;
      return;
    }
    if (prevSurahRef.current !== currentKhmasiyat.surah) {
      setSurahToast({
        message: `انتقلت إلى سورة ${currentKhmasiyat.name} • ${toArabicNum(currentKhmasiyat.surah)}`,
        id: Date.now(),
      });
    }
    prevSurahRef.current = currentKhmasiyat.surah;
  }, [currentIndex, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // تشغيل المؤثر الصوتي عند التنقل بين الصفحات
  useEffect(() => {
    if (viewMode !== 'page-starts') {
      lastPageIndexRef.current = currentPageIndex;
      return;
    }
    if (skipPageNavSoundRef.current) {
      skipPageNavSoundRef.current = false;
      lastPageIndexRef.current = currentPageIndex;
      return;
    }
    if (currentPageIndex === lastPageIndexRef.current) return;
    playKhmasiyatNavSound();
    lastPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex, viewMode]);

  // تشغيل المؤثر الصوتي عند التنقل في وضع خماسيات - سور
  useEffect(() => {
    if (viewMode !== 'surah-fives') {
      lastSurahFivesIndexRef.current = surahFivesIndex;
      return;
    }
    if (skipSurahFivesNavSoundRef.current) {
      skipSurahFivesNavSoundRef.current = false;
      lastSurahFivesIndexRef.current = surahFivesIndex;
      return;
    }
    if (surahFivesIndex === lastSurahFivesIndexRef.current) return;
    playKhmasiyatNavSound();
    lastSurahFivesIndexRef.current = surahFivesIndex;
  }, [surahFivesIndex, viewMode]);

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
        const url = getAudioUrl(verse.s, verse.a, activeReciter);
        
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
            console.error("Cache error", e);
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

  const togglePageEndStar = (index) => {
    setStarredPageEnds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
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
      gain.gain.exponentialRampToValueAtTime(type === 'up' ? 0.5 : 0.3, now + 0.008);
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
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.008);
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
    if (viewMode === 'surah-fives') {
      if (direction === 'next') setSurahFivesIndex(prev => Math.min(SURAH_FIVES_ORDER.length - 1, prev + 1));
      if (direction === 'prev') setSurahFivesIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (viewMode === 'page-starts') {
      if (direction === 'next') setCurrentPageIndex(prev => Math.min(pageStartsData.length - 1, prev + 1));
      if (direction === 'prev') setCurrentPageIndex(prev => Math.max(0, prev - 1));
    }
    if (viewMode === 'page-ends') {
      if (direction === 'next') setCurrentPageEndIndex(prev => Math.min(pageEndsData.length - 1, prev + 1));
      if (direction === 'prev') setCurrentPageEndIndex(prev => Math.max(0, prev - 1));
    }
  };

  const onSwipeTouchStart = (e) => {
    if (viewMode !== 'khmasiyat' && viewMode !== 'page-starts' && viewMode !== 'page-ends' && viewMode !== 'surah-fives') return;
    const t = e.touches?.[0];
    if (!t) return;
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onSwipeTouchEnd = (e) => {
    if (viewMode !== 'khmasiyat' && viewMode !== 'page-starts' && viewMode !== 'page-ends' && viewMode !== 'surah-fives') return;
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
    setSurahFivesIndex(0);
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
    setStarredPageEnds(new Set());
    setIsFontMenuOpen(false);
    setFontSize(38);
    setFontFamily("'Tajawal', sans-serif");
    setFontWeight('bold');
    setFontColor('darkgreen');
    setActiveSurahNamesQuiz(false);
    setQuranicWondersNotes([]); // إعادة تعيين الملاحظات
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
    setCounterConfirm({ type: 'reset', id: counterId });
  };

  const handleDeleteNightCounter = (counterId) => {
    setCounterConfirm({ type: 'delete', id: counterId });
  };

  const handlePageJump = () => {
    setPageJumpError('');

    const page = parseInt(pageJumpInput, 10);
    if (!Number.isInteger(page) || page < 1 || page > 604) {
      setPageJumpError('الرجاء إدخال رقم صفحة من 1 إلى 604');
      return;
    }

    if (viewMode === 'page-ends') {
      setCurrentPageEndIndex(page - 1);
    } else {
      setCurrentPageIndex(page - 1);
    }
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
  const mainKeyboard = useCustomKeyboard({
    jump: {
      value: jumpInput,
      setValue: setJumpInput,
      allowColon: true,
      maxLength: 8,
      label: 'إدخال خماسية أو سورة:خماسية',
      showPlaceholder: false,
      submitLabel: 'اذهب',
      onSubmit: handleJump,
    },
    pageJump: {
      value: pageJumpInput,
      setValue: setPageJumpInput,
      allowColon: false,
      maxLength: 3,
      label: 'إدخال رقم الصفحة',
      submitLabel: 'اذهب',
      onSubmit: handlePageJump,
    },
    counterValue: {
      value: nightCounterValueInput,
      setValue: setNightCounterValueInput,
      allowColon: false,
      maxLength: 7,
      label: 'العدد الحالي',
      submitLabel: 'حفظ',
      onSubmit: applyNightCounterInputs,
    },
    counterLimit: {
      value: nightCounterLimitInput,
      setValue: setNightCounterLimitInput,
      allowColon: false,
      maxLength: 7,
      label: 'الهدف (اختياري)',
      submitLabel: 'حفظ',
      onSubmit: applyNightCounterInputs,
    },
    deletePassword: {
      value: deleteKhatmaPassword,
      setValue: (updater) => { setDeleteKhatmaPassword(updater); setDeleteKhatmaError(false); },
      allowColon: false,
      maxLength: 8,
      label: 'كلمة المرور',
      submitLabel: 'حذف',
      closeOnSubmit: false,
      onSubmit: () => confirmDeleteKhatma(),
    },
    syncPassword: {
      value: syncPasswordInput,
      setValue: (updater) => { setSyncPasswordInput(updater); setSyncPasswordError(false); },
      allowColon: false,
      maxLength: 12,
      label: 'كلمة سر المزامنة',
      submitLabel: 'تفعيل',
      closeOnSubmit: false,
      onSubmit: () => handleSyncUnlock(),
    },
  });

  const handleHardwareBack = () => {
    // الأولوية 0: إغلاق لوحة المفاتيح المنبثقة ورسالة الجلسة السابقة ومربعات التأكيد
    if (counterConfirm.type) {
      setCounterConfirm({ type: null, id: null });
      return true;
    }
    if (showSessionPrompt) {
      setShowSessionPrompt(false);
      return true;
    }
    if (mainKeyboard && mainKeyboard.showKeyboard) {
      mainKeyboard.closeKeyboard();
      return true;
    }

    // الأولوية 1: إغلاق القوائم والنوافذ المنبثقة المفتوحة
    if (deletingKhatmaId !== null) {
      cancelDeleteKhatma();
      return true;
    }
    if (showKhatmaInput) {
      setShowKhatmaInput(false);
      setPendingKhatmaTime(null);
      setKhatmaIntentionInput('');
      return true;
    }
    if (editingKhatmaId !== null) {
      setEditingKhatmaId(null);
      return true;
    }
    if (isKhatmaListOpen) {
      setIsKhatmaListOpen(false);
      return true;
    }
    if (isFiqhOpen) {
      setIsFiqhOpen(false);
      return true;
    }
    if (isFalOpen) {
      setIsFalOpen(false);
      return true;
    }
    if (isSyncPanelOpen) {
      closeSyncPanel();
      return true;
    }
    if (isNightCounterSettingsOpen) {
      setIsNightCounterSettingsOpen(false);
      return true;
    }
    if (isAudioSettingsOpen) {
      setIsAudioSettingsOpen(false);
      return true;
    }
    if (isQRSyncOpen) {
      setIsQRSyncOpen(false);
      return true;
    }
    if (isMoreMenuOpen || isFontMenuOpen || isPageStartsMenuOpen || isAyahMenuOpen) {
      setIsMoreMenuOpen(false);
      setIsFontMenuOpen(false);
      setIsPageStartsMenuOpen(false);
      setIsAyahMenuOpen(false);
      return true;
    }

    // الأولوية 2: الخروج من أوضاع الاختبار والأدلة
    if (activeAyahTest) {
      setActiveAyahTest(null);
      return true;
    }
    if (activePageStartsTest) {
      setActivePageStartsTest(null);
      return true;
    }
    if (activeSurahNamesQuiz) {
      setActiveSurahNamesQuiz(false);
      return true;
    }
    if (isUserManualOpen) {
      setIsUserManualOpen(false);
      return true;
    }

    // الأولوية 3: الرجوع من الشاشات الفرعية إلى الرئيسية
    if (viewMode === 'page-starred') {
      setViewMode('page-starts');
      return true;
    }
    if (viewMode === 'page-ends-starred') {
      setViewMode('page-ends');
      return true;
    }
    if (viewMode === 'quranic-wonders') {
      setViewMode('khmasiyat');
      return true;
    }
    if (viewMode === 'starred' || viewMode === 'shared-verses' || viewMode === 'night-counter' || viewMode === 'page-starts' || viewMode === 'page-ends' || viewMode === 'surah-fives' || viewMode === 'surah-pages') {
      setViewMode('khmasiyat');
      return true;
    }

    return false;
  };

  backHandlerRef.current = handleHardwareBack;

  // ─── قفل الختمات: الدخول وتحميل/مزامنة القائمة من الخادم ───
  const KHITMA_CREDS_KEY = 'quran-fives-khitma-creds-v1';

  const loadKhitmaWithCreds = useCallback(async (creds) => {
    setKhitmaLoading(true);
    setKhitmaAuthError('');
    try {
      const { list, updatedAt } = await getKhitma(creds); // يرمي 401 إن كانت البيانات خاطئة
      khitmaCredsRef.current = creds;
      khitmaBaseRef.current = updatedAt;             // أساس الرفع = ما سحبناه للتو
      khitmaSyncReadyRef.current = false;            // أول setState تحميل لا رفع
      setKhatmaList(list);
      setKhitmaUnlocked(true);
      try { localStorage.setItem(KHITMA_CREDS_KEY, JSON.stringify(creds)); } catch { /* تجاهل */ }
      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      setKhitmaAuthError(msg.includes('401') ? 'بيانات الدخول غير صحيحة' : 'تعذّر الاتصال بالخادم');
      try { localStorage.removeItem(KHITMA_CREDS_KEY); } catch { /* تجاهل */ }
      return false;
    } finally {
      setKhitmaLoading(false);
    }
  }, []);

  const handleKhitmaLogin = () => {
    const user = khitmaUserInput.trim();
    const code = khitmaCodeInput.trim();
    if (!user || !code) { setKhitmaAuthError('أدخل اسم المستخدم والرمز'); return; }
    loadKhitmaWithCreds({ user, code });
  };

  // عند فتح قسم الختمات: حاول الدخول تلقائياً ببيانات محفوظة على هذا الجهاز
  useEffect(() => {
    if (!isKhatmaListOpen || khitmaUnlocked) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KHITMA_CREDS_KEY)); } catch { /* تجاهل */ }
    if (saved?.user && saved?.code) loadKhitmaWithCreds(saved);
  }, [isKhatmaListOpen, khitmaUnlocked, loadKhitmaWithCreds]);

  // رفع أي تغيير على القائمة للخادم (بعد التحميل الأولي) — تأخير بسيط لتجميع التعديلات
  useEffect(() => {
    if (!khitmaUnlocked || !khitmaCredsRef.current) return;
    if (!khitmaSyncReadyRef.current) { khitmaSyncReadyRef.current = true; return; }
    const t = setTimeout(() => {
      const creds = khitmaCredsRef.current;
      putKhitma(creds, khatmaList, khitmaBaseRef.current)
        .then((r) => { khitmaBaseRef.current = r.updatedAt; })
        .catch(async (e) => {
          // تعارض: جهاز آخر عدّل السجلّ بعد سحبنا. الخادم رفض الكتابة فوقه،
          // فنعيد تحميل الأحدث بدل إبقاء الجهاز على نسخة مخالفة.
          if (e?.status !== 409) return; // فشل شبكة عابر: سيُعاد الرفع مع أي تعديل تالٍ
          try {
            const { list, updatedAt } = await getKhitma(creds);
            khitmaBaseRef.current = updatedAt;
            khitmaSyncReadyRef.current = false; // التحميل لا يُطلق رفعاً جديداً
            setKhatmaList(list);
          } catch { /* تجاهل: سيُعاد المحاولة عند فتح السجلّ لاحقاً */ }
        });
    }, 1500);
    return () => clearTimeout(t);
  }, [khatmaList, khitmaUnlocked]);

  // ─── دوال ختماتي ───
  const addKhatmaEntry = (intention) => {
    setKhatmaList(prev => [...prev, {
      id: String(pendingKhatmaTime),
      intention,
      timestamp: pendingKhatmaTime,
    }]);
    setShowKhatmaInput(false);
    setPendingKhatmaTime(null);
    setKhatmaIntentionInput('');
  };

  const handleSaveKhatma = () => {
    addKhatmaEntry(khatmaIntentionInput.trim());
  };

  const handleCancelKhatmaInput = () => {
    setShowKhatmaInput(false);
    setPendingKhatmaTime(null);
    setKhatmaIntentionInput('');
  };

  const startEditKhatma = (khatma) => {
    setEditingKhatmaId(khatma.id);
    setEditKhatmaIntention(khatma.intention || '');
  };

  const saveEditKhatma = (id) => {
    setKhatmaList(prev => prev.map(k => k.id === id ? { ...k, intention: editKhatmaIntention.trim() } : k));
    setEditingKhatmaId(null);
  };

  const cancelEditKhatma = () => { setEditingKhatmaId(null); };

  // حذف ختمة محميّ بكلمة مرور لمنع الحذف العَرَضي
  const requestDeleteKhatma = (id) => {
    setDeletingKhatmaId(id);
    setDeleteKhatmaPassword('');
    setDeleteKhatmaError(false);
  };

  const cancelDeleteKhatma = () => {
    mainKeyboard.closeKeyboard();
    setDeletingKhatmaId(null);
    setDeleteKhatmaPassword('');
    setDeleteKhatmaError(false);
  };

  const confirmDeleteKhatma = () => {
    if (deleteKhatmaPassword !== KHATMA_DELETE_PASSWORD) {
      setDeleteKhatmaError(true);
      setDeleteKhatmaPassword('');
      return;
    }
    setKhatmaList(prev => prev.filter(k => k.id !== deletingKhatmaId));
    cancelDeleteKhatma();
  };

  const handleShareKhatma = async (k) => {
    setIsPreparingShare(true);
    try {
    await document.fonts.ready;
    try {
      await Promise.all([
        document.fonts.load('bold 54px Tajawal'),
        document.fonts.load('28px Amiri'),
      ]);
    } catch (_) { /* continue with system fonts if needed */ }

    const khatmaIndex = khatmaList.findIndex(item => item.id === k.id);
    const num = khatmaIndex >= 0 ? khatmaIndex + 1 : 1;
    const ORDINALS = ['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
    const toAr = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
    const khatmaLabel = num <= 10 ? `الختمة ${ORDINALS[num]}` : `الختمة ${toAr(num)}`;
    const [, hDay, hMonth, hYear] = calcHijriOffline(new Date(k.timestamp));
    const hijriDate = `${toAr(hDay)} ${hMonth} ${toAr(hYear)} هـ`;

    const rrect = (c, x, y, w, h, r) => {
      c.beginPath();
      c.moveTo(x + r, y); c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };
    const diamond = (c, cx, cy, r) => {
      c.beginPath();
      c.moveTo(cx, cy - r); c.lineTo(cx + r, cy);
      c.lineTo(cx, cy + r); c.lineTo(cx - r, cy);
      c.closePath();
    };
    const drawStar = (c, cx, cy, spikes, ro, ri) => {
      let a = -Math.PI / 2;
      const step = Math.PI / spikes;
      c.beginPath();
      c.moveTo(cx + ro * Math.cos(a), cy + ro * Math.sin(a));
      for (let i = 0; i < spikes; i++) {
        a += step; c.lineTo(cx + ri * Math.cos(a), cy + ri * Math.sin(a));
        a += step; c.lineTo(cx + ro * Math.cos(a), cy + ro * Math.sin(a));
      }
      c.closePath();
    };
    const wrapText = (c, text, maxW) => {
      const words = text.split(' ');
      const lines = [];
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (c.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
        else { cur = test; }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const W = 600, H = 900;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    // Background
    ctx.fillStyle = '#1c3d0d';
    ctx.fillRect(0, 0, W, H);

    // Gold top bar
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(0, 0, W, 12);

    // Header bg
    ctx.fillStyle = '#152e09';
    ctx.fillRect(0, 12, W, 155);

    // Header bottom border
    ctx.strokeStyle = 'rgba(201,168,76,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 167); ctx.lineTo(W, 167); ctx.stroke();

    // Geometric ornament row
    ctx.strokeStyle = 'rgba(201,168,76,0.55)';
    ctx.lineWidth = 1;
    [60, 90, 120].forEach(x => { diamond(ctx, x, 42, 10); ctx.stroke(); });
    [480, 510, 540].forEach(x => { diamond(ctx, x, 42, 10); ctx.stroke(); });
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(201,168,76,0.3)';
    ctx.beginPath(); ctx.moveTo(140, 42); ctx.lineTo(282, 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(318, 42); ctx.lineTo(460, 42); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(201,168,76,0.75)';
    ctx.beginPath(); ctx.arc(300, 42, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(201,168,76,0.4)';
    ctx.beginPath(); ctx.arc(280, 42, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(320, 42, 3, 0, Math.PI * 2); ctx.fill();

    // App name
    ctx.fillStyle = '#c9a84c';
    ctx.font = 'bold 54px Tajawal, Arial';
    ctx.fillText('خماسيات', 300, 116);

    // Subtitle
    ctx.fillStyle = 'rgba(201,168,76,0.45)';
    ctx.font = '22px Tajawal, Arial';
    ctx.fillText('تطبيق القرآن الكريم', 300, 150);

    // Quran book icon
    const ic = { x: 272, y: 192, w: 56, h: 62, r: 6 };
    ctx.fillStyle = 'rgba(201,168,76,0.1)';
    rrect(ctx, ic.x, ic.y, ic.w, ic.h, ic.r); ctx.fill();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5;
    rrect(ctx, ic.x, ic.y, ic.w, ic.h, ic.r); ctx.stroke();
    ctx.strokeStyle = 'rgba(201,168,76,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(300, ic.y + 4); ctx.lineTo(300, ic.y + ic.h - 4); ctx.stroke();
    ctx.fillStyle = 'rgba(201,168,76,0.5)';
    [0, 8, 16, 24].forEach(o => {
      ctx.fillRect(ic.x + 7, ic.y + 14 + o, 13, 2);
      ctx.fillRect(300 + 7, ic.y + 14 + o, 13, 2);
    });

    // Main title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Tajawal, Arial';
    ctx.fillText('ختمة القرآن الكريم', 300, 312);

    // Khatma badge
    ctx.font = '26px Tajawal, Arial';
    const bw = Math.max(ctx.measureText(khatmaLabel).width + 60, 180);
    const bx = 300 - bw / 2, by = 328, bh = 44;
    ctx.fillStyle = 'rgba(201,168,76,0.08)';
    rrect(ctx, bx, by, bw, bh, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(201,168,76,0.45)'; ctx.lineWidth = 1.5;
    rrect(ctx, bx, by, bw, bh, 22); ctx.stroke();
    ctx.fillStyle = '#d4b060';
    ctx.fillText(khatmaLabel, 300, by + 30);

    // Divider with star
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 402); ctx.lineTo(270, 402); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, 402); ctx.lineTo(520, 402); ctx.stroke();
    ctx.fillStyle = 'rgba(201,168,76,0.55)';
    drawStar(ctx, 300, 402, 5, 9, 4); ctx.fill();

    // Dynamic content
    let curY = 448;

    if (k.intention) {
      ctx.fillStyle = '#d4b060';
      ctx.font = '22px Tajawal, Arial';
      ctx.fillText('النية', 300, curY); curY += 42;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '30px Tajawal, Arial';
      wrapText(ctx, k.intention, 460).slice(0, 2).forEach(line => {
        ctx.fillText(line, 300, curY); curY += 44;
      });
      curY += 10;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '24px Tajawal, Arial';
    ctx.fillText(hijriDate, 300, curY); curY += 55;

    // Verse box
    const verseBoxX = 56, verseBoxW = 488;
    const verse = '﴿وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ﴾';
    ctx.font = '28px Amiri, serif';
    const verseLines = wrapText(ctx, verse, 420);
    const verseBoxH = verseLines.length * 48 + 62;
    const verseBoxY = curY;

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    rrect(ctx, verseBoxX, verseBoxY, verseBoxW, verseBoxH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(201,168,76,0.15)'; ctx.lineWidth = 1;
    rrect(ctx, verseBoxX, verseBoxY, verseBoxW, verseBoxH, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(201,168,76,0.65)'; ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(verseBoxX + verseBoxW - 3, verseBoxY + 18);
    ctx.lineTo(verseBoxX + verseBoxW - 3, verseBoxY + verseBoxH - 18);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '28px Amiri, serif';
    verseLines.forEach((line, i) => { ctx.fillText(line, 300, verseBoxY + 46 + i * 48); });
    ctx.fillStyle = 'rgba(201,168,76,0.4)';
    ctx.font = '20px Tajawal, Arial';
    ctx.fillText('الإسراء: ٨٢', 300, verseBoxY + verseBoxH - 14);

    // Footer ornament
    ctx.strokeStyle = 'rgba(201,168,76,0.3)'; ctx.lineWidth = 0.9;
    [260, 300, 340].forEach(x => { diamond(ctx, x, H - 34, 7); ctx.stroke(); });
    ctx.fillStyle = 'rgba(201,168,76,0.18)';
    ctx.font = '16px Tajawal, Arial';
    ctx.fillText('خماسيات', 300, H - 18);

    // Gold bottom bar
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(0, H - 12, W, 12);

    // Share / download
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { alert('تعذّر إنشاء الصورة'); return; }

    // ── Native Android/iOS via Capacitor ──────────────────────────────────
    if (Capacitor.isNativePlatform()) {
      try {
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        const fileName = `khatma_${Date.now()}.png`;
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        setIsPreparingShare(false);
        await Share.share({ title: 'ختمة القرآن الكريم', files: [uri] });
        await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
      } catch (e) {
        if (e?.message !== 'Share canceled') alert('تعذّر المشاركة: ' + (e?.message || ''));
      }
      return;
    }

    // ── Web browser fallback ──────────────────────────────────────────────
    setIsPreparingShare(false);
    const file = new File([blob], 'khatma.png', { type: 'image/png' });
    let shared = false;
    if (navigator.share) {
      try {
        const canShare = !navigator.canShare || navigator.canShare({ files: [file] });
        if (canShare) {
          await navigator.share({ files: [file], title: 'ختمة القرآن الكريم' });
          shared = true;
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (!shared) {
      const a = document.createElement('a');
      a.download = 'khatma.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    } finally {
      setIsPreparingShare(false);
    }
  };

  // تجهيز الدالة ليتم استدعاؤها من كود الجافا في أندرويد ستوديو
  useEffect(() => {
    window.handleAndroidBack = () => {
      return backHandlerRef.current();
    };

    return () => {
      delete window.handleAndroidBack;
    };
  }, []);

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`} style={{
      '--app-font-size': `${fontSize}px`,
      '--app-font-family': fontFamily,
      '--app-font-weight': fontWeight,
      '--app-font-color': resolvedFontColor,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {counterConfirm.type && (
        <div className="session-overlay" dir="rtl" style={{ zIndex: 10001, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div style={{
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '320px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--app-text)', fontSize: '18px', marginBottom: '12px' }}>
              {counterConfirm.type === 'reset' ? 'تصفير العداد' : 'مسح العداد'}
            </h3>
            <p style={{ color: 'var(--app-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              {counterConfirm.type === 'reset' 
                ? 'هل أنت متأكد أنك تريد تصفير هذا العداد والبدء من جديد؟' 
                : 'هل أنت متأكد أنك تريد مسح هذا العداد نهائياً؟'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="night-counter-chip active"
                style={{ flex: 1, margin: 0, background: 'var(--app-danger)', color: '#fff', border: 'none' }}
                onClick={() => {
                  if (counterConfirm.type === 'reset') {
                    setNightCounters(prev => prev.map(counter => (counter.id === counterConfirm.id ? { ...counter, value: 0 } : counter)));
                  } else if (counterConfirm.type === 'delete') {
                    setNightCounters(prev => (prev.length <= 1 ? prev : prev.filter(counter => counter.id !== counterConfirm.id)));
                  }
                  setCounterConfirm({ type: null, id: null });
                }}
              >
                {counterConfirm.type === 'reset' ? 'تصفير' : 'مسح'}
              </button>
              <button type="button" className="night-counter-chip" style={{ flex: 1, margin: 0 }} onClick={() => setCounterConfirm({ type: null, id: null })}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
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
      {!isQuizMode && viewMode !== 'starred' && viewMode !== 'page-starred' && viewMode !== 'page-ends-starred' && viewMode !== 'night-counter' && viewMode !== 'quranic-wonders' && viewMode !== 'surah-pages' && (
      <div className="action-buttons-container upper-actions">
        {(isPageStartsMode || isPageEndsMode || isNightCounterMode || isSurahFivesMode) && (
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
        {viewMode === 'shared-verses' && (
          <button
            className="action-icon"
            title="العودة للقراءة"
            onClick={() => backHandlerRef.current()}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        )}
        {!isPageStartsMode && !isPageEndsMode && !isNightCounterMode && !isSurahFivesMode && viewMode !== 'shared-verses' && viewMode !== 'surah-pages' && (
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
                <div className="ayah-menu-popover more-menu-popover" dir="rtl" style={{ minWidth: '180px' }}>
                  {['العداد', 'ختماتي', 'فقهيات', 'فأل القرآن', 'الوضع الليلي', 'الخط', 'إعدادات الصوت', 'خماسيات - سور', 'اختبار سور', 'عجائب قرآنية', 'شرح البرنامج', 'مزامنة QR', 'المزامنة السحابية', 'السور المتشابهة في العدد'].map(option => (
                    <button
                      key={`more-${option}`}
                      type="button"
                      className={`ayah-menu-item ${(option === 'الوضع الليلي' && isNightMode) || (option === 'السور المتشابهة في العدد' && viewMode === 'shared-verses') ? 'active' : ''}`}
                      onClick={() => {
                        if (option === 'العداد') { setViewMode('night-counter'); setIsMoreMenuOpen(false); return; }
                        if (option === 'ختماتي') { mainKeyboard.closeKeyboard(); setIsKhatmaListOpen(true); setIsMoreMenuOpen(false); return; }
                        if (option === 'فقهيات') { mainKeyboard.closeKeyboard(); setIsFiqhOpen(true); setIsMoreMenuOpen(false); return; }
                        if (option === 'فأل القرآن') { mainKeyboard.closeKeyboard(); setIsFalOpen(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'خماسيات - سور') { mainKeyboard.closeKeyboard(); setSurahFivesIndex(0); setViewMode('surah-fives'); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'الوضع الليلي') { setIsNightMode(prev => !prev); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'إعدادات الصوت') { mainKeyboard.closeKeyboard(); setIsAudioSettingsOpen(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'الخط') { mainKeyboard.closeKeyboard(); setIsMoreMenuOpen(false); setIsFontMenuOpen(true); return; }
                        if (option === 'عجائب قرآنية') { mainKeyboard.closeKeyboard(); setViewMode('quranic-wonders'); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'اختبار سور') { mainKeyboard.closeKeyboard(); setActiveSurahNamesQuiz(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'شرح البرنامج') { mainKeyboard.closeKeyboard(); setIsUserManualOpen(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'مزامنة QR') { mainKeyboard.closeKeyboard(); setIsQRSyncOpen(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'المزامنة السحابية') { mainKeyboard.closeKeyboard(); setIsSyncPanelOpen(true); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
                        if (option === 'السور المتشابهة في العدد') { setViewMode(prev => prev === 'shared-verses' ? 'khmasiyat' : 'shared-verses'); setIsMoreMenuOpen(false); setIsFontMenuOpen(false); return; }
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
                        style={{ backgroundColor: c, border: c === '#ffffff' && fontColor !== '#ffffff' ? '1px solid #ccc' : '' }}
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
        

        {!isPageStartsMode && !isPageEndsMode && !isNightCounterMode && !isSurahFivesMode && viewMode !== 'shared-verses' && <div
          className="action-icon calendar-icon"
          style={{ width: '65px', height: '65px', cursor: 'default' }}
        >
          {hijriData.length > 0 ? (
            <span style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
              {hijriData[hijriIndex]}
            </span>
          ) : (
            <span style={{ fontSize: '14px' }}>...</span>
          )}
        </div>}

      </div>
      )}

      {viewMode === 'quranic-wonders' && (
        <QuranicWonders
          onClose={() => setViewMode('khmasiyat')}
          notes={quranicWondersNotes}
          setNotes={setQuranicWondersNotes}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fontColor={fontColor}
          isNightMode={isNightMode}
        />
      )}
      {activeAyahTest === 'khmasiyat' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <KhmasiyatQuiz onClose={() => setActiveAyahTest(null)} />
        </div>
      )}

      {activeAyahTest === 'random-ayat' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <RandomAyahQuiz onClose={() => setActiveAyahTest(null)} />
        </div>
      )}

      {activeAyahTest === 'surah-count' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <SurahCountQuiz onClose={() => setActiveAyahTest(null)} />
        </div>
      )}

      {activePageStartsTest === 'page-starts' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <PageStartsQuiz onClose={() => setActivePageStartsTest(null)} />
        </div>
      )}

      {activeSurahNamesQuiz && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <SurahNamesQuiz onClose={() => setActiveSurahNamesQuiz(false)} />
        </div>
      )}

      {isUserManualOpen && (
        <div className="shared-verses-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'var(--app-bg)', overflowY: 'auto' }}>
          <UserManual onClose={() => setIsUserManualOpen(false)} />
          <button className="khmasiyat-quiz-btn secondary" onClick={() => setIsUserManualOpen(false)} style={{ margin: '20px auto', display: 'block' }}>إغلاق</button>
        </div>
      )}

      {!isQuizMode && viewMode !== 'quranic-wonders' && ( // إخفاء هذا القسم عند تفعيل عجائب قرآنية
        <>
      {viewMode === 'starred' || viewMode === 'page-starred' || viewMode === 'page-ends-starred' ? (
        <>
          <div className="top-stars-container starred-mode-stars">
            <button
              className="top-star-btn"
              title="العودة للقراءة"
              onClick={() => setViewMode(viewMode === 'page-starred' ? 'page-starts' : viewMode === 'page-ends-starred' ? 'page-ends' : 'khmasiyat')}
              style={{ color: 'var(--app-warn)' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>{viewMode === 'page-starred' ? starredPages.size : viewMode === 'page-ends-starred' ? starredPageEnds.size : starredIndices.size}</span>
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
                    <div className="starred-preview starred-preview--blurred">
                      {verse?.t} <span className="starred-verse-num">﴿{verse?.a}﴾</span>
                    </div>
                  </div>
                );
              })
            )
          ) : viewMode === 'page-ends-starred' ? (
            starredPageEndsArray.length === 0 ? (
              <div className="empty-starred">لا توجد نهايات صفحات مثبتة بعد</div>
            ) : (
              starredPageEndsArray.map(index => {
                const verse = pageEndsData[index];
                if (!verse) return null;
                return (
                  <div
                    key={index}
                    className="starred-rectangle"
                    onClick={() => { setCurrentPageEndIndex(index); setViewMode('page-ends'); }}
                  >
                    <div className="starred-title">سورة {SURAH_NAMES[verse.s - 1]} - صفحة {verse.page}</div>
                    <div className="starred-preview starred-preview--blurred">
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
                    onClick={() => { setCurrentIndex(index); setViewMode('khmasiyat'); }}
                  >
                    <div className="starred-title">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ verticalAlign: 'middle', marginLeft: '6px', color: 'var(--app-warn)' }}>
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                      سورة {kh.name}
                    </div>
                    <div className="starred-preview starred-preview--blurred">
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
        <div className={`content-layout ${viewMode === 'night-counter' ? 'night-counter-layout' : ''}`} onTouchStart={onSwipeTouchStart} onTouchEnd={onSwipeTouchEnd} style={{ flexGrow: 1, overflow: 'hidden', minHeight: 0 }}>
          {viewMode !== 'shared-verses' && viewMode !== 'night-counter' && viewMode !== 'surah-fives' && viewMode !== 'surah-pages' && <div className="top-stars-container inside-text-field">
            <button
              className="top-star-btn"
              title={isPageStartsMode ? "قائمة الصفحات للتثبيت" : isPageEndsMode ? "قائمة نهايات صفحات" : "قائمة الخماسيات للتثبيت"}
              onClick={() => {
                // تحديد الوضع والموضع الحاليين للقراءة
                const readMode = isPageStartsMode ? 'page-starts' : viewMode === 'page-ends' ? 'page-ends' : 'khmasiyat';
                const readIndex = readMode === 'page-starts' ? currentPageIndex : readMode === 'page-ends' ? currentPageEndIndex : currentIndex;
                // التقاط مرساة جديدة إن لم توجد مرساة أو كانت لقسم مختلف (يمنع بقاء مرساة قديمة من قسم آخر)
                if (!reviewAnchor || reviewAnchor.mode !== readMode) {
                  setReviewAnchor({ mode: readMode, index: readIndex });
                }
                if (isPageStartsMode) setViewMode('page-starred');
                else if (viewMode === 'page-ends') setViewMode('page-ends-starred');
                else setViewMode('starred');
              }}
              style={{ color: 'var(--app-accent)' }}
            >
              <span style={{ fontSize: '26px', fontWeight: 'bold', paddingTop: '2px' }}>
                {isPageStartsMode ? starredPages.size : viewMode === 'page-ends' ? starredPageEnds.size : starredIndices.size}
              </span>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            {viewMode === 'khmasiyat' && khmasiyatPageNumber && (
              <div className="khmasiyat-page-display">
                صفحة {khmasiyatPageNumber}
              </div>
            )}
            {isPageStartsMode && pageStartsData.length > 0 && (
              <div className="khmasiyat-page-display">
                صفحة {currentPageIndex + 1}
              </div>
            )}
            {viewMode === 'page-ends' && pageEndsData.length > 0 && (
              <div className="khmasiyat-page-display">
                صفحة {currentPageEndIndex + 1}
              </div>
            )}
            <button
              className="top-star-btn"
              title={isPageStartsMode ? "تثبيت الصفحة" : viewMode === 'page-ends' ? "تثبيت نهاية الصفحة" : "تثبيت الخماسية"}
              onClick={() => {
                if (isPageStartsMode) togglePageStar(currentPageIndex);
                else if (viewMode === 'page-ends') togglePageEndStar(currentPageEndIndex);
                else toggleStar(currentIndex);
              }}
              style={{ color: (
                isPageStartsMode ? starredPages.has(currentPageIndex) :
                viewMode === 'page-ends' ? starredPageEnds.has(currentPageEndIndex) :
                starredIndices.has(currentIndex)
              ) ? 'var(--app-warn)' : 'var(--app-accent)' }}
            >
              {(
                isPageStartsMode ? starredPages.has(currentPageIndex) :
                viewMode === 'page-ends' ? starredPageEnds.has(currentPageEndIndex) :
                starredIndices.has(currentIndex)
              ) ? (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
              )}
            </button>
          </div>}

          {viewMode !== 'night-counter' && viewMode !== 'surah-pages' && (
            <button
              onClick={() => {
                if (viewMode === 'khmasiyat') {
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                } else if (viewMode === 'shared-verses') {
                  setSharedGroupIndex(prev => Math.max(0, prev - 1));
                } else if (viewMode === 'page-starts') {
                  setCurrentPageIndex(prev => Math.max(0, prev - 1));
                } else if (viewMode === 'page-ends') {
                  setCurrentPageEndIndex(prev => Math.max(0, prev - 1));
                } else if (viewMode === 'surah-fives') {
                  setSurahFivesIndex(prev => Math.max(0, prev - 1));
                }
              }}
              className="nav-arrow prev-arrow"
              disabled={(viewMode === 'khmasiyat' && currentIndex === 0) ||
                        (viewMode === 'shared-verses' && sharedGroupIndex === 0) ||
                        (viewMode === 'page-starts' && currentPageIndex === 0) ||
                        (viewMode === 'page-ends' && currentPageEndIndex === 0) ||
                        (viewMode === 'surah-fives' && clampedSurahFivesIndex === 0)}
              title="السابق">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          )}
          
          {viewMode === 'night-counter' ? (
            <div className="night-counter-mode">
              <div className="night-counter-toolbar">
                <div className="night-counter-toolbar-side night-counter-toolbar-left">
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
                    setCounterConfirm({ type: 'reset', id: activeNightCounterId });
                  }}
                  aria-label="تصفير"
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                    <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    mainKeyboard.closeKeyboard();
                    // السجلّ خاص: لا نسجّل ختمة قبل الدخول حتى لا نكتب فوق سجلّ الخادم بقائمة فارغة
                    if (!khitmaUnlocked) { setIsKhatmaListOpen(true); return; }
                    setPendingKhatmaTime(Date.now());
                    setKhatmaIntentionInput('');
                    setShowKhatmaInput(true);
                  }}
                  title="سجِّل ختمة جديدة"
                  className="nc-circle-88"
                  style={{
                    border: 'none',
                    background: 'var(--app-accent)', color: 'var(--app-accent-contrast)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: '0',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
                  </svg>
                </button>
                <div
                  aria-label={`${khatmaList.length} ختمة مسجلة`}
                  className="nc-circle-88"
                  style={{
                    border: 'none',
                    background: 'var(--app-accent)', color: 'var(--app-accent-contrast)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', lineHeight: '1.2', gap: '1px',
                  }}
                >
                  <span style={{ fontSize: '30px', fontWeight: '900', lineHeight: '1' }}>
                    {khatmaList.length}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', direction: 'rtl' }}>ختماتي</span>
                </div>
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
                {SHARED_VERSE_GROUPS[sharedGroupIndex]?.count ?? ''}
              </div>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)`, lineHeight: '1.8' }}>
                {(SHARED_VERSE_GROUPS[sharedGroupIndex]?.surahs ?? []).map(s => `[${SURAH_NAMES[s - 1]}]`).join(' ، ')}
              </div>
            </div>
          ) : viewMode === 'surah-pages' ? (
            <div style={{ overflowY: 'auto', padding: '8px 4px', width: '100%' }} dir="rtl">
              {SURAH_METADATA
                .map((surah, i) => ({ surah, i }))
                .filter(({ i }) => SURAH_PAGE_COUNTS[i] >= 3)
                .map(({ surah, i }) => (
                  <div
                    key={surah.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 14px',
                      color: fontColor,
                      fontWeight: fontWeight,
                      fontSize: `calc(${fontSize}px * 0.78)`,
                      borderBottom: '1px solid var(--app-muted)',
                      lineHeight: '1.5',
                    }}
                  >
                    <span>{surah.id}. {surah.name}</span>
                    <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'left' }}>{SURAH_PAGE_COUNTS[i]}</span>
                  </div>
                ))}
            </div>
          ) : viewMode === 'surah-fives' ? (
            <div className="verse-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: '54px', marginBottom: '12px' }}>
                {surahFivesSurahNumber}
              </div>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.95)`, lineHeight: '1.8' }}>
                سورة {surahFivesSurahName}
              </div>
              <div style={{ marginTop: '12px', color: 'var(--app-muted)', fontWeight: 800, fontSize: '18px' }} dir="ltr">
                {clampedSurahFivesIndex + 1} / {SURAH_FIVES_ORDER.length}
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
          ) : viewMode === 'page-ends' && isPageEndsLoading ? (
            <div className="verse-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: fontColor, fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)` }}>جاري تحميل بيانات الصفحات...</div>
            </div>
          ) : viewMode === 'page-ends' && pageEndsError ? (
            <div className="verse-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: 'var(--app-danger)', fontWeight: fontWeight, fontSize: `calc(${fontSize}px * 0.85)` }}>{pageEndsError}</div>
            </div>
          ) : (() => {
            const showKhBlur = viewMode === 'khmasiyat'
              && starredIndices.has(currentIndex)
              && !isKhRevealed;
            const showPageBlur = viewMode === 'page-starts'
              && starredPages.has(currentPageIndex)
              && !isPageRevealed;
            const showPageEndBlur = viewMode === 'page-ends'
              && starredPageEnds.has(currentPageEndIndex)
              && !isPageEndRevealed;
            const cornerNumber = viewMode === 'khmasiyat'
              ? currentVersesText[0]?.a
              : undefined;
            const cardClass = (viewMode === 'page-starts' || viewMode === 'page-ends' || viewMode === 'khmasiyat') ? 'page-card-style' : '';
            if (showKhBlur || showPageBlur || showPageEndBlur) {
              return (
                <div className="kh-blur-wrapper">
                  <TextDisplay verses={currentVersesText} cornerNumber={cornerNumber} cardClassName={cardClass} />
                  <div className="kh-blur-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style={{ color: 'var(--app-warn)' }}>
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <button
                      className="kh-reveal-btn"
                      onClick={() => {
                        if (showKhBlur) setIsKhRevealed(true);
                        else if (showPageBlur) setIsPageRevealed(true);
                        else setIsPageEndRevealed(true);
                      }}
                    >
                      كشف
                    </button>
                  </div>
                </div>
              );
            }
            return <TextDisplay verses={currentVersesText} cornerNumber={cornerNumber} cardClassName={cardClass} />;
          })()}
          {/* The main content area (TextDisplay, shared-verses, surah-fives)
              needs to be scrollable if its content overflows.
              This is handled by making content-layout a flex container and its children
              (like TextDisplay's verse-container) scrollable. */}
          
          {viewMode !== 'night-counter' && viewMode !== 'surah-pages' && (
            <button
              onClick={() => {
                if (viewMode === 'khmasiyat') {
                  setCurrentIndex(prev => Math.min(1201, prev + 1));
                } else if (viewMode === 'shared-verses') {
                  setSharedGroupIndex(prev => Math.min(SHARED_VERSE_GROUPS.length - 1, prev + 1));
                } else if (viewMode === 'page-starts') {
                  setCurrentPageIndex(prev => Math.min(pageStartsData.length - 1, prev + 1));
                } else if (viewMode === 'page-ends') {
                  setCurrentPageEndIndex(prev => Math.min(pageEndsData.length - 1, prev + 1));
                } else if (viewMode === 'surah-fives') {
                  setSurahFivesIndex(prev => Math.min(SURAH_FIVES_ORDER.length - 1, prev + 1));
                }
              }}
              className="nav-arrow next-arrow"
              disabled={(viewMode === 'khmasiyat' && currentIndex === 1201) || 
                        (viewMode === 'shared-verses' && sharedGroupIndex === SHARED_VERSE_GROUPS.length - 1) ||
                        (viewMode === 'page-starts' && currentPageIndex === pageStartsData.length - 1) ||
                        (viewMode === 'page-ends' && currentPageEndIndex === pageEndsData.length - 1) ||
                        (viewMode === 'surah-fives' && clampedSurahFivesIndex === SURAH_FIVES_ORDER.length - 1)}
              title="التالي">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* إشعار الانتقال إلى سورة جديدة — يظهر بين عرض الآية وأزرار الإجراءات */}
      {viewMode === 'khmasiyat' && !isQuizMode && (
        <SurahTransitionToast toast={surahToast} />
      )}

      {!isPageStartsMode && !isPageEndsMode && !isNightCounterMode && viewMode !== 'starred' && viewMode !== 'surah-fives' && viewMode !== 'quranic-wonders' && ( // إخفاء الأزرار السفلية
      <div className="action-buttons-container" ref={actionButtonsRef}>
        {viewMode !== 'shared-verses' && viewMode !== 'surah-pages' && (
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
              {activeTooltip === 'verses' && (() => {
                const sameCountSurahs = SURAH_METADATA.filter(s => s.verseCount === verseCount).map(s => s.name);
                return (
                  <div className="surah-tooltip" style={{ whiteSpace: 'pre-wrap', textAlign: 'center', lineHeight: '1.4' }}>
                    {sameCountSurahs.length > 1 ? sameCountSurahs.join(' - ') : `عدد الآيات: ${verseCount}`}
                  </div>
                );
              })()}
              <button
                className="action-icon"
                title="عدد الآيات"
                onClick={() => setActiveTooltip(activeTooltip === 'verses' ? null : 'verses')}
              >
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {verseCount || '-'}
                </span>
              </button>
            </div>
          </>
        )}

        {viewMode !== 'shared-verses' && currentSurahPageCount >= 3 && (
          <div className="icon-wrapper">
            {activeTooltip === 'pages' && (
              <div className="surah-tooltip" style={{ textAlign: 'center' }}>
                عدد الصفحات: {currentSurahPageCount}
              </div>
            )}
            <button
              className="action-icon"
              title="عدد صفحات السورة"
              onClick={() => setActiveTooltip(activeTooltip === 'pages' ? null : 'pages')}
            >
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {currentSurahPageCount}
              </span>
            </button>
          </div>
        )}
        
        {viewMode !== 'shared-verses' && viewMode !== 'surah-pages' && (
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

      {viewMode === 'khmasiyat' && viewMode !== 'quranic-wonders' && ( // إخفاء هذا القسم عند تفعيل عجائب قرآنية
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
                  value={jumpInput}
                  dir="ltr"
                  {...mainKeyboard.getInputProps('jump', { className: 'jump-input' })}
                />
              </div>
              <button onClick={() => { mainKeyboard.closeKeyboard(); handleJump(); }} className="jump-button">اذهب</button>
            </div>
            <div className="jump-error-container">
              {jumpError && <p className="jump-error-message">{jumpError}</p>}
            </div>
          </div>
          {renderReturnToAnchor()}
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

      {viewMode === 'page-ends' && !isPageEndsLoading && pageEndsData.length > 0 && (
        <>
        <div className="jump-to-container">
          <div className="jump-input-wrapper">
            <div className={`input-inner-wrapper ${pageJumpError ? 'shake border-error' : ''}`}>
              <input
                type="text"
                value={pageJumpInput}
                placeholder="1"
                min="1"
                max="604"
                dir="ltr"
                {...mainKeyboard.getInputProps('pageJump', { className: 'jump-input' })}
              />
            </div>
            <button onClick={() => { mainKeyboard.closeKeyboard(); handlePageJump(); }} className="jump-button">اذهب</button>
          </div>
          <div className="jump-error-container">
            {pageJumpError && <p className="jump-error-message">{pageJumpError}</p>}
          </div>
        </div>
        {renderReturnToAnchor()}
        <div className="progress-wrapper big-progress">
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(((currentPageEndIndex + 1) / 604) * 100, 100)}%`, backgroundColor: 'var(--app-warn)' }}></div>
          </div>
          <div className="progress-text">
            صفحة {currentPageEndIndex + 1} / 604
          </div>
        </div>
        </>
      )}
      {viewMode === 'page-starts' && !isPageStartsLoading && pageStartsData.length > 0 && viewMode !== 'quranic-wonders' && ( // إخفاء هذا القسم عند تفعيل عجائب قرآنية
        <>
        <div className="jump-to-container">
          <div className="jump-input-wrapper">
            <div className={`input-inner-wrapper ${pageJumpError ? 'shake border-error' : ''}`}>
              <input
                type="text"
                value={pageJumpInput}
                placeholder="1"
                min="1"
                max="604"
                dir="ltr"
                {...mainKeyboard.getInputProps('pageJump', { className: 'jump-input' })}
              />
            </div>
            <button onClick={() => { mainKeyboard.closeKeyboard(); handlePageJump(); }} className="jump-button">اذهب</button>
          </div>
          <div className="jump-error-container">
            {pageJumpError && <p className="jump-error-message">{pageJumpError}</p>}
          </div>
        </div>
        {renderReturnToAnchor()}
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
      {isAudioSettingsOpen && (
        <AudioSettings
          activeReciter={activeReciter}
          setActiveReciter={setActiveReciter}
          currentSurahNumber={currentSurahNumber}
          onClose={() => setIsAudioSettingsOpen(false)}
        />
      )}
      {isNightCounterSettingsOpen && (
        <div className="session-overlay" dir="rtl" style={{ zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="session-card" style={{ maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', textAlign: 'right' }}>
            <h2 className="session-title" style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px' }}>إعدادات العدادات</h2>
            
            <div className="night-counter-manager-header" style={{ marginBottom: '15px' }}>
              <div className="night-counter-manager-title">قائمة العدادات</div>
              <button
                type="button"
                className="night-counter-manager-add"
                onClick={handleAddNightCounter}
              >
                إضافة عداد
              </button>
            </div>
            
            <div className="night-counter-manager-list" style={{ marginBottom: '20px' }}>
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
                        title="تعديل وتنشيط"
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
            
            <div style={{ background: 'var(--app-surface-3)', borderRadius: '12px', padding: '16px', border: '1px solid var(--app-border)' }}>
              <div className="night-counter-editor-label" style={{ marginBottom: '10px' }}>
                تعديل: <strong style={{ color: 'var(--app-text)' }}>{activeNightCounter?.name || 'عداد'}</strong>
              </div>
              
              <div className="settings-row" style={{ marginBottom: '10px' }}>
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-muted)', marginBottom: '5px' }}>الاسم</label>
                  <input
                    type="text"
                    className="night-counter-input"
                    value={nightCounterNameInput}
                    onChange={(e) => setNightCounterNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyNightCounterInputs()}
                    placeholder="اسم العداد"
                  />
                </div>
              </div>
              
              <div className="settings-row night-counter-numbers" style={{ marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-muted)', marginBottom: '5px' }}>العدد الحالي</label>
                  <input
                    type="text"
                    placeholder="العدد"
                    {...mainKeyboard.getInputProps('counterValue', { className: 'night-counter-input' })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-muted)', marginBottom: '5px' }}>الهدف (اختياري)</label>
                  <input
                    type="text"
                    placeholder="الحد"
                    {...mainKeyboard.getInputProps('counterLimit', { className: 'night-counter-input' })}
                  />
                </div>
              </div>
              
              <button
                type="button"
                className="night-counter-apply"
                style={{ width: '100%' }}
                onClick={() => {
                  applyNightCounterInputs();
                  // optional: close after updating if desired
                  // setIsNightCounterSettingsOpen(false); 
                }}
              >
                حفظ التعديلات
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="khmasiyat-quiz-btn secondary"
                style={{ width: '100%', fontSize: '16px' }}
                onClick={() => setIsNightCounterSettingsOpen(false)}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
      {isQRSyncOpen && (
        <QRSync
          appState={{
            currentIndex,
            currentPageIndex,
            starredIndices,
            starredPages,
            starredPageEnds,
            nightCounters,
            quranicWondersNotes,
            khatmaList
          }}
          onRestore={(data) => {
            if (data.c !== undefined) setCurrentIndex(data.c);
            if (data.p !== undefined) setCurrentPageIndex(data.p);
            if (data.s !== undefined) setStarredIndices(new Set(data.s));
            if (data.sp !== undefined) setStarredPages(new Set(data.sp));
            if (Array.isArray(data.spe)) setStarredPageEnds(new Set(data.spe));
            if (data.n !== undefined) setNightCounters(data.n);
            if (data.qw !== undefined) setQuranicWondersNotes(data.qw);
            if (Array.isArray(data.kl)) setKhatmaList(data.kl);
            
            // إغلاق النافذة بصمت بعد نجاح الاستعادة وبدون رسالة منبثقة مزعجة
            setIsQRSyncOpen(false);
          }}
          onClose={() => setIsQRSyncOpen(false)}
        />
      )}
      {deletingKhatmaId !== null && (
        <div
          dir="rtl"
          onClick={cancelDeleteKhatma}
          style={{
            position: 'fixed', inset: 0, zIndex: 12000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--app-surface)', borderRadius: '16px', padding: '22px',
            width: '100%', maxWidth: '320px', border: '1px solid var(--app-border)',
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: 'var(--app-text-strong)', textAlign: 'center' }}>
              حذف الختمة
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--app-muted)', textAlign: 'center', lineHeight: '1.6' }}>
              أدخل كلمة المرور لتأكيد الحذف. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <input
              {...mainKeyboard.getInputProps('deletePassword')}
              type="password"
              value={deleteKhatmaPassword}
              placeholder="اضغط للإدخال"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px',
                borderRadius: '10px',
                border: `1.5px solid ${deleteKhatmaError ? 'var(--app-danger)' : 'var(--app-border)'}`,
                background: 'var(--app-surface-2)', color: 'var(--app-text)',
                fontSize: '16px', fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                cursor: 'pointer',
              }}
            />
            {deleteKhatmaError && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--app-danger)', textAlign: 'center' }}>
                كلمة المرور غير صحيحة
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={confirmDeleteKhatma} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'var(--app-danger)', color: '#fff',
                fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit',
              }}>حذف</button>
              <button type="button" onClick={cancelDeleteKhatma} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: '1.5px solid var(--app-border)',
                background: 'var(--app-surface-2)', color: 'var(--app-muted)',
                fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
              }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {isFalOpen && <QuranFal onClose={() => setIsFalOpen(false)} />}
      {isSyncPanelOpen && (
        <div className="audio-settings-overlay" dir="rtl" style={{ zIndex: 10000 }} onClick={closeSyncPanel}>
          <div className="audio-settings-card" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 className="audio-settings-title">المزامنة السحابية</h2>
            {syncUnlocked ? (
              <>
                <p style={{ fontSize: '15px', color: 'var(--app-accent)', fontWeight: 800, margin: '0 0 6px' }}>
                  المزامنة مفعّلة ✓
                </p>
                <p style={{ fontSize: '13px', color: 'var(--app-muted)', margin: '0 0 18px', lineHeight: 1.7 }}>
                  بياناتك تُرفع وتُسحب تلقائياً مع خادمك. هذه الميزة للاستخدام الشخصي فقط.
                </p>
                <button type="button" className="khmasiyat-quiz-btn" onClick={handleSyncDisable} style={{ width: '100%', marginBottom: '10px' }}>
                  إيقاف المزامنة
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: 'var(--app-muted)', margin: '0 0 16px', lineHeight: 1.7 }}>
                  المزامنة معطّلة. أدخل كلمة السر لتفعيلها على هذا الجهاز (للاستخدام الشخصي).
                </p>
                <input
                  {...mainKeyboard.getInputProps('syncPassword')}
                  type="password"
                  value={syncPasswordInput}
                  placeholder="اضغط للإدخال"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px', borderRadius: '10px',
                    border: `1.5px solid ${syncPasswordError ? 'var(--app-danger)' : 'var(--app-border)'}`,
                    background: 'var(--app-surface-2)', color: 'var(--app-text)',
                    fontSize: '16px', fontFamily: 'inherit', outline: 'none', textAlign: 'center', cursor: 'pointer',
                  }}
                />
                {syncPasswordError && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--app-danger)' }}>كلمة السر غير صحيحة</p>
                )}
                <button type="button" className="khmasiyat-quiz-btn" onClick={handleSyncUnlock} style={{ width: '100%', marginTop: '14px' }}>
                  تفعيل
                </button>
              </>
            )}
            <div className="audio-settings-actions" style={{ marginTop: '12px' }}>
              <button type="button" className="khmasiyat-quiz-btn secondary" onClick={closeSyncPanel} style={{ width: '100%' }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {isPreparingShare && (
        <div className="share-prep-overlay" dir="rtl">
          <div className="share-prep-card">
            <div className="share-prep-spinner" aria-hidden="true"></div>
            <div className="share-prep-text">جارٍ تجهيز صورة الختمة…</div>
          </div>
        </div>
      )}
      <SyncStatusIndicator failed={syncFailed} syncing={isSyncing} onRetry={handleSyncRetry} />
      <CustomKeyboard
        visible={mainKeyboard.showKeyboard}
        label={mainKeyboard.activeConfig?.label}
        value={mainKeyboard.activeConfig?.value}
        allowColon={Boolean(mainKeyboard.activeConfig?.allowColon)}
        submitLabel={mainKeyboard.activeConfig?.submitLabel}
        showPlaceholder={mainKeyboard.activeConfig?.showPlaceholder !== false}
        onInsert={mainKeyboard.handleKeyboardKeyPress}
        onBackspace={mainKeyboard.handleKeyboardBackspace}
        onSubmit={mainKeyboard.handleKeyboardSubmit}
        onClose={mainKeyboard.closeKeyboard}
      />
        </>
      )}
      {/* ─── قسم فقهيات ─── */}
      {isFiqhOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--app-bg)',
          zIndex: 11000, display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
        }} dir="rtl">

          {/* رأس الصفحة */}
          <div style={{
            padding: '20px 20px 14px', borderBottom: '1px solid var(--app-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div>
              <h2 style={{ margin: '0 0 2px', fontSize: '22px', color: 'var(--app-text)', fontWeight: 900 }}>فقهيات</h2>
              <span style={{ fontSize: '12px', color: 'var(--app-muted)' }}>
                مسائل من فقه الأئمة رضوان الله عليهم — {FIQH_DATA.length} مسألة
              </span>
            </div>
            <button onClick={() => setIsFiqhOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--app-muted)', fontSize: '28px', lineHeight: 1, padding: '4px',
            }}>×</button>
          </div>

          {/* القائمة */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {FIQH_DATA.map((item) => {
              const isOpen = expandedFiqhId === item.id;
              return (
                <div key={item.id} style={{
                  background: 'var(--app-surface)', borderRadius: '18px',
                  marginBottom: '12px', border: '1px solid var(--app-border)',
                  overflow: 'hidden',
                }}>

                  {/* رأس العنوان — قابل للضغط */}
                  <button
                    onClick={() => setExpandedFiqhId(isOpen ? null : item.id)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '16px 18px', cursor: 'pointer', textAlign: 'right',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: 'var(--app-accent)', color: 'var(--app-accent-contrast)',
                        borderRadius: '20px', padding: '3px 12px',
                        fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
                      }}>
                        {item.imam}
                      </div>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                        stroke="var(--app-muted)" strokeWidth="2.5" strokeLinecap="round"
                        style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    <p style={{
                      margin: 0, fontSize: '15px', color: 'var(--app-text)',
                      lineHeight: '1.7', textAlign: 'right', fontWeight: isOpen ? 'bold' : 'normal',
                    }}>
                      {item.question}
                    </p>
                  </button>

                  {/* المحتوى المطوي */}
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--app-border)' }}>

                      {/* الجواب */}
                      <div style={{ margin: '16px 0' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 900, color: 'var(--app-accent)',
                          letterSpacing: '0.5px', display: 'block', marginBottom: '8px',
                        }}>الجواب</span>
                        <p style={{ margin: 0, fontSize: '15px', color: 'var(--app-text)', lineHeight: '1.9', whiteSpace: 'pre-wrap' }}>
                          {item.answer}
                        </p>
                      </div>

                      {/* مربع المصدر */}
                      <div style={{
                        background: 'var(--app-surface-2)', borderRadius: '12px',
                        padding: '14px 16px', border: '1px solid var(--app-border)',
                      }}>
                        <div style={{
                          fontSize: '11px', fontWeight: 900, color: 'var(--app-muted)',
                          marginBottom: '10px', letterSpacing: '0.5px',
                        }}>المصدر</div>
                        {[
                          ['الكتاب',      item.source.book],
                          ['المؤلف',      item.source.author],
                          ['الصفحة',      item.source.page],
                          ['تاريخ النشر', item.source.publishDate],
                          ['ملاحظات',     item.source.notes],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label} style={{
                            display: 'flex', gap: '10px', marginBottom: '5px',
                            fontSize: '13px', lineHeight: '1.5',
                          }}>
                            <span style={{ color: 'var(--app-muted)', flexShrink: 0, minWidth: '85px' }}>{label}</span>
                            <span style={{ color: 'var(--app-text)' }}>{value}</span>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── نافذة تسجيل ختمة جديدة ─── */}
      {showKhatmaInput && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 12000, padding: '20px', fontFamily: 'inherit',
        }} dir="rtl">
          <div style={{
            background: 'var(--app-surface)', borderRadius: '22px',
            padding: '26px 22px', width: '100%', maxWidth: '320px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '19px', color: 'var(--app-text)', textAlign: 'center', fontWeight: 900 }}>
              تسجيل ختمة جديدة
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '12px', color: 'var(--app-muted)', textAlign: 'center' }}>
              {formatHijriTimestamp(pendingKhatmaTime)}
            </p>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '13px', color: 'var(--app-muted)', display: 'block', marginBottom: '6px' }}>
                النية
              </label>
              <textarea
                value={khatmaIntentionInput}
                onChange={e => setKhatmaIntentionInput(e.target.value)}
                placeholder="مثال: عن روح والدي رحمه الله"
                dir="rtl"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 13px',
                  borderRadius: '11px', border: '1.5px solid var(--app-border)',
                  background: 'var(--app-surface-2)', color: 'var(--app-text)',
                  fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveKhatma}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(145deg, #22c55e, #15803d)',
                  color: '#fff', fontSize: '15px', fontWeight: 'bold',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >حفظ</button>
              <button
                type="button"
                onClick={handleCancelKhatmaInput}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px',
                  border: '1.5px solid var(--app-border)',
                  background: 'var(--app-surface-2)', color: 'var(--app-muted)',
                  fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── قسم ختماتي ─── */}
      {isKhatmaListOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--app-bg)',
          zIndex: 11000, display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
        }} dir="rtl">
          <div style={{
            padding: '20px 20px 16px', borderBottom: '1px solid var(--app-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div>
              <h2 style={{ margin: '0 0 2px', fontSize: '22px', color: 'var(--app-text)', fontWeight: 900 }}>ختماتي</h2>
              <span style={{ fontSize: '13px', color: 'var(--app-muted)' }}>
                {khitmaUnlocked ? `${khatmaList.length} ختمة مسجلة` : '🔒 سجلّ خاص — يتطلّب الدخول'}
              </span>
            </div>
            <button
              onClick={() => { setIsKhatmaListOpen(false); setEditingKhatmaId(null); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--app-muted)', fontSize: '28px', lineHeight: 1, padding: '4px',
              }}
            >×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {!khitmaUnlocked ? (
              <div style={{ maxWidth: '320px', margin: '40px auto 0', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔒</div>
                <p style={{ fontSize: '14px', color: 'var(--app-muted)', margin: '0 0 20px' }}>
                  سجلّ الختمات خاص. أدخل بيانات الدخول لعرضه.
                </p>
                <input
                  type="text"
                  value={khitmaUserInput}
                  onChange={e => { setKhitmaUserInput(e.target.value); setKhitmaAuthError(''); }}
                  placeholder="اسم المستخدم"
                  autoComplete="off"
                  dir="ltr"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px 13px', marginBottom: '10px',
                    borderRadius: '10px', border: '1.5px solid var(--app-border)',
                    background: 'var(--app-surface-2)', color: 'var(--app-text)',
                    fontSize: '14px', fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                  }}
                />
                <input
                  type="password"
                  value={khitmaCodeInput}
                  onChange={e => { setKhitmaCodeInput(e.target.value); setKhitmaAuthError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleKhitmaLogin(); }}
                  placeholder="الرمز"
                  autoComplete="off"
                  inputMode="numeric"
                  dir="ltr"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px 13px', marginBottom: '10px',
                    borderRadius: '10px', border: '1.5px solid var(--app-border)',
                    background: 'var(--app-surface-2)', color: 'var(--app-text)',
                    fontSize: '14px', fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                  }}
                />
                {khitmaAuthError && (
                  <p style={{ color: 'var(--app-danger)', fontSize: '13px', margin: '0 0 10px' }}>{khitmaAuthError}</p>
                )}
                <button
                  type="button"
                  onClick={handleKhitmaLogin}
                  disabled={khitmaLoading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                    background: 'var(--app-accent)', color: 'var(--app-accent-contrast)',
                    fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit',
                    opacity: khitmaLoading ? 0.6 : 1,
                  }}
                >{khitmaLoading ? '...جارٍ الدخول' : 'دخول'}</button>
              </div>
            ) : khatmaList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--app-muted)', marginTop: '80px', fontSize: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
                لا توجد ختمات مسجلة بعد
              </div>
            ) : (
              khatmaList.map((k, i) => (
                <div key={k.id} style={{
                  background: 'var(--app-surface)', borderRadius: '16px',
                  padding: '16px', marginBottom: '12px', border: '1px solid var(--app-border)',
                }}>
                  {editingKhatmaId === k.id ? (
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--app-muted)', display: 'block', marginBottom: '4px' }}>النية</label>
                        <textarea
                          value={editKhatmaIntention}
                          onChange={e => setEditKhatmaIntention(e.target.value)}
                          dir="rtl"
                          rows={2}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '8px 11px',
                            borderRadius: '9px', border: '1.5px solid var(--app-border)',
                            background: 'var(--app-surface-2)', color: 'var(--app-text)',
                            fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'none',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => saveEditKhatma(k.id)} style={{
                          flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                          background: 'linear-gradient(145deg, #22c55e, #15803d)',
                          color: '#fff', fontSize: '13px', fontWeight: 'bold',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>حفظ</button>
                        <button type="button" onClick={cancelEditKhatma} style={{
                          flex: 1, padding: '9px', borderRadius: '9px',
                          border: '1.5px solid var(--app-border)',
                          background: 'var(--app-surface-2)', color: 'var(--app-muted)',
                          fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            background: 'var(--app-accent)',
                            color: 'var(--app-accent-contrast)', borderRadius: '50%', width: '30px', height: '30px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 'bold', flexShrink: 0,
                          }}>{i + 1}</span>
                          <span style={{ fontSize: '13px', color: 'var(--app-muted)' }}>{formatHijriTimestamp(k.timestamp)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button type="button" onClick={() => handleShareKhatma(k)} title="مشاركة" style={{
                            background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                            borderRadius: '10px', cursor: 'pointer',
                            color: 'var(--app-accent)', padding: '10px',
                          }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                            </svg>
                          </button>
                          <button type="button" onClick={() => startEditKhatma(k)} title="تعديل" style={{
                            background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                            borderRadius: '10px', cursor: 'pointer',
                            color: 'var(--app-accent)', padding: '10px',
                          }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          <button type="button" onClick={() => requestDeleteKhatma(k.id)} title="حذف" style={{
                            background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                            borderRadius: '10px', cursor: 'pointer',
                            color: 'var(--app-danger)', padding: '10px',
                          }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      {k.intention && (
                        <p style={{ margin: '0 40px 8px', fontSize: '13px', color: 'var(--app-muted)', lineHeight: '1.6' }}>
                          {k.intention}
                        </p>
                      )}
                      <p style={{ margin: '0 40px 0', fontSize: '11px', color: 'var(--app-muted)', direction: 'rtl' }}>
                        {formatHijriTimestamp(k.timestamp)}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showExitToast && (
        <div className="exit-toast">
          هل تريد الخروج من التطبيق؟ اضغط مرة أخرى للتأكيد
        </div>
      )}
    </div>
  );
}

export default App;
