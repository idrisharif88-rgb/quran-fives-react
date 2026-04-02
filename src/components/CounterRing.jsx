import React from 'react';
import './CounterRing.css';

const CounterRing = ({ value }) => {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const numberOfSegments = 8;
  const totalSegment = circumference / numberOfSegments;
  const gap = 15;
  const dash = totalSegment - gap;
  // لضمان تمركز الفراغ العلوي بشكل صحيح، نحتاج إلى إزاحة نمط الخط المتقطع.
  // الإزاحة تساوي طول "الشرطة" مضافاً إليها نصف طول "الفراغ".
  // هذا يضمن أن نقطة البداية (12 o'clock) تقع في منتصف الفراغ الأول.
  const offset = dash + gap / 2;

  return (
    <svg className="counter-ring-svg" viewBox="0 0 200 200">
      <circle
        className="counter-ring-circle"
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        strokeWidth="15"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
      />
      <text
        x="50%"
        y="50%"
        dy=".35em"
        textAnchor="middle"
        className="counter-ring-number"
      >
        {value}
      </text>
    </svg>
  );
};

export default CounterRing;