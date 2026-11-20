import React from 'react';

interface ShareBiteLogoProps {
  variant?: 'mark' | 'horizontal' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
  light?: boolean;
}

export const ShareBiteLogo: React.FC<ShareBiteLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = false,
  light = false,
}) => {
  const markSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const MarkIcon = (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${markSizeMap[size]} shrink-0 transition-transform duration-200`}
      aria-hidden="true"
    >
      {/* Top Green Leaves */}
      <path d="M78 40C66 26 48 16 42 6C42 22 56 36 78 40Z" fill="#2E9A68" />
      <path d="M82 40C94 26 112 16 118 6C118 22 104 36 82 40Z" fill="#289E68" />

      {/* Orange Interlocking Crescent (Right & Bottom) */}
      <path
        d="M85 45C102 47 117 56 126 70C135 84 135 102 126 116C117 130 102 138 85 139C69 140 55 134 44 123C52 126 61 127 70 126C84 124 97 116 104 104C111 92 111 78 104 66C98 55 87 48 74 46C78 45.3 81.5 45 85 45Z"
        fill="#F57C00"
      />

      {/* Teal Main Body */}
      <path
        d="M78 45C62 45 47 53 37 66C27 79 25 96 31 110C36 123 48 133 62 137C76 141 91 138 102 129C92 133 80 133 70 129C58 124 49 114 45 102C41 90 43 77 50 67C56 58 66 52 76 50C77.5 48.5 78 46.5 78 45Z"
        fill="#167C80"
      />
      <path
        d="M54 74C46 80 43 90 46 99C49 108 57 115 67 117C76 119 86 116 93 110C83 113 72 111 64 105C56 99 52 90 53 80C53 78 53.5 76 54 74Z"
        fill="#105B60"
      />

      {/* Elegant Negative Space: Fork with sweeping curved handle */}
      <path d="M53 58L62 67L60 69L51 60L53 58Z" fill="#FFFFFF" />
      <path d="M57.5 53.5L66.5 62.5L64.5 64.5L55.5 55.5L57.5 53.5Z" fill="#FFFFFF" />
      <path d="M62 49L71 58L69 60L60 51L62 49Z" fill="#FFFFFF" />
      <path d="M66.5 44.5L75.5 53.5L73.5 55.5L64.5 46.5L66.5 44.5Z" fill="#FFFFFF" />
      <path
        d="M50 61L77 52C75 56 71 59 66 62L64 64C59 69 56 75 55 82C53 92 57 101 64 107C72 113 83 114 93 110C81 116 67 115 57 107C48 99 44 87 47 75C48 69 51 64 56 60L50 61Z"
        fill="#FFFFFF"
      />
    </svg>
  );

  if (variant === 'mark') {
    return <span className={`inline-flex items-center justify-center ${className}`}>{MarkIcon}</span>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="mb-2">{MarkIcon}</div>
        <div className={`font-black tracking-tight leading-none ${textClasses[size]}`}>
          <span className={light ? 'text-white' : 'text-[#105B60]'}>Share</span>
          <span className="text-[#F57C00]">Bite</span>
        </div>
        {showTagline && (
          <p
            className={`mt-1.5 text-xs font-semibold ${
              light ? 'text-[#DFF2F0]' : 'text-[#167C80]'
            } tracking-tight`}
          >
            Turn Surplus Food into Shared Value.
          </p>
        )}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {MarkIcon}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-tight flex items-baseline ${textClasses[size]}`}>
          <span className={light ? 'text-white' : 'text-[#105B60]'}>Share</span>
          <span className="text-[#F57C00]">Bite</span>
        </div>
        {showTagline && (
          <span
            className={`hidden sm:inline-block text-[11px] font-semibold leading-none mt-0.5 ${
              light ? 'text-[#DFF2F0]' : 'text-[#167C80]'
            }`}
          >
            Turn Surplus Food into Shared Value.
          </span>
        )}
      </div>
    </div>
  );
};
