import { useCallback, useEffect, useState } from 'react';
import { loadScale, saveScale, applyScale } from '../utils/appScale';

// حجم العرض: يُطبَّق فوراً ويُحفظ، ويُعاد حساب وحدات الشاشة عند تغيّر حجم النافذة (لوحة المفاتيح، التدوير)
export default function useAppScale() {
  const [scale, setScaleState] = useState(loadScale);

  useEffect(() => {
    applyScale(scale);
    const onResize = () => applyScale(scale);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scale]);

  const setScale = useCallback((next) => {
    saveScale(next);
    setScaleState(next);
  }, []);

  return { scale, setScale };
}
