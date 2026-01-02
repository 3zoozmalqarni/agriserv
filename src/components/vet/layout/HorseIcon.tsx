interface HorseIconProps {
  className?: string;
}

export default function HorseIcon({ className = "w-6 h-6" }: HorseIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3.5 L13.2 1.8 L14 3.3 L15 2.3 L15.9 4.2 L16.8 5.6 L17.7 8.4 L18.2 10.3 L18 12.1 L17.3 14 L16.3 15.8 L15 17.3 L13.1 18.2 L11.2 18.4 L9.3 18 L7.9 16.8 L7 15 L6.5 13.1 L6.3 11.2 L6.5 9.4 L7.2 7.5 L8.2 5.6 L9.3 4.2 L10.8 3.3 L12 3.5 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      <path
        d="M12.1 2.5 L13.1 1 L13.9 2.8 L13.1 3.5 L12.1 2.5 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />

      <path
        d="M14.5 2 L15.3 0.8 L16.1 2.3 L15.6 3.3 L14.5 2 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />

      <ellipse cx="10.8" cy="8.4" rx="0.6" ry="0.8" fill="#FFFFFF" opacity="0.9"/>
      <ellipse cx="11" cy="8.2" rx="0.2" ry="0.3" fill="#000000" opacity="0.3"/>

      <ellipse cx="8.2" cy="13.5" rx="0.8" ry="1.2" fill="currentColor" opacity="0.8"/>

      <path
        d="M8 15 Q 8.4 15.8, 9.3 16"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      <path d="M12.5 4.2 L12 5.1 L11.5 4.4" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
      <path d="M13.4 3.5 L13 4.4 L12.5 3.7" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
      <path d="M14.2 3 L13.8 4 L13.3 3.3" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>

      <path d="M16.3 11.2 L17 12.1 L17.3 13.1" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
      <path d="M16.8 12.6 L17.5 13.6 L17.8 14.5" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
      <path d="M17.3 14 L18 15 L18.3 15.9" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none"/>

      <path d="M10.3 7 Q 11.5 7.7, 12.2 7.2" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" fill="none" opacity="0.6"/>
    </svg>
  );
}
