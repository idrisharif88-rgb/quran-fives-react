import React from 'react';
import './CounterRing.css';

const CounterRing = ({ value }) => {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const numberOfSegments = 8;
  const totalSegment = circumference / numberOfSegments;
  const gap = 15;
  const dash = totalSegment - gap;

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