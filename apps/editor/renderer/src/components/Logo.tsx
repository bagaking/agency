import React from 'react';

export function Logo({ size = 32, className = "" }: any) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 1024 1024" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#1e293b' }} />
          <stop offset="100%" style={{ stopColor: '#0f172a' }} />
        </linearGradient>
        <linearGradient id="logo-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6' }} />
          <stop offset="100%" style={{ stopColor: '#2dd4bf' }} />
        </linearGradient>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <path 
        d="M512 80L884.4 295V729L512 944L139.6 729V295L512 80Z" 
        fill="url(#logo-bg-grad)" 
        stroke="url(#logo-stroke-grad)" 
        strokeWidth="20" 
      />
      
      <g filter="url(#logo-glow)">
        <path 
          d="M380 380L580 512L380 644" 
          stroke="#60a5fa" 
          strokeWidth="70" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <rect x="620" y="605" width="110" height="40" rx="4" fill="#2dd4bf">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
        </rect>
      </g>
      
      <circle cx="512" cy="80" r="12" fill="#3b82f6" />
      <circle cx="884.4" cy="295" r="12" fill="#3b82f6" />
      <circle cx="884.4" cy="729" r="12" fill="#2dd4bf" />
      <circle cx="512" cy="944" r="12" fill="#2dd4bf" />
      <circle cx="139.6" cy="729" r="12" fill="#3b82f6" />
      <circle cx="139.6" cy="295" r="12" fill="#3b82f6" />
    </svg>
  );
}
