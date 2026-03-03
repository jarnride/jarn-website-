import { forwardRef } from 'react';

export const JarnnLogo = forwardRef(({ className = "w-8 h-8", ...props }, ref) => (
  <svg 
    ref={ref}
    viewBox="0 0 100 100" 
    className={className}
    fill="currentColor"
    {...props}
  >
    {/* Wheat stalk left branch */}
    <ellipse cx="22" cy="35" rx="6" ry="10" transform="rotate(-30 22 35)" />
    <ellipse cx="18" cy="48" rx="5" ry="9" transform="rotate(-35 18 48)" />
    <ellipse cx="16" cy="60" rx="4.5" ry="8" transform="rotate(-40 16 60)" />
    
    {/* Wheat stalk right branch */}
    <ellipse cx="38" cy="32" rx="6" ry="10" transform="rotate(15 38 32)" />
    <ellipse cx="44" cy="44" rx="5" ry="9" transform="rotate(20 44 44)" />
    <ellipse cx="48" cy="55" rx="4.5" ry="8" transform="rotate(25 48 55)" />
    
    {/* Wheat stalk center stem */}
    <path d="M30 25 L30 75" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
    
    {/* Motion lines */}
    <line x1="50" y1="20" x2="70" y2="10" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
    <line x1="55" y1="28" x2="72" y2="20" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
    <line x1="58" y1="36" x2="74" y2="30" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
    
    {/* Gavel head */}
    <rect x="60" y="50" width="22" height="14" rx="2" transform="rotate(-30 71 57)" />
    
    {/* Gavel handle */}
    <rect x="52" y="62" width="6" height="28" rx="2" transform="rotate(-30 55 76)" />
    
    {/* Gavel block/base */}
    <path d="M65 88 L85 88 L82 82 L68 82 Z" />
  </svg>
));

JarnnLogo.displayName = 'JarnnLogo';

export default JarnnLogo;
