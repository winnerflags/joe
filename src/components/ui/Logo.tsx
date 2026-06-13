interface LogoProps {
  variant?: 'mark' | 'full';
  className?: string;
}

export default function Logo({ variant = 'full', className = '' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="WinnerFlags"
      >
        <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" strokeWidth="2.5" />
        <text
          x="20"
          y="16"
          textAnchor="middle"
          fill="currentColor"
          fontSize="11"
          fontWeight="800"
          fontFamily="var(--font-barlow-condensed, sans-serif)"
          letterSpacing="0.5"
        >
          WF
        </text>
        <line x1="6" y1="21" x2="34" y2="21" stroke="currentColor" strokeWidth="1.5" />
        <text
          x="20"
          y="29"
          textAnchor="middle"
          fill="currentColor"
          fontSize="5.5"
          fontWeight="700"
          fontFamily="var(--font-barlow-condensed, sans-serif)"
          letterSpacing="1.5"
        >
          WINNER
        </text>
        <text
          x="20"
          y="36"
          textAnchor="middle"
          fill="currentColor"
          fontSize="5.5"
          fontWeight="700"
          fontFamily="var(--font-barlow-condensed, sans-serif)"
          letterSpacing="1.5"
        >
          FLAGS
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WinnerFlags"
    >
      {/* Badge mark */}
      <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" strokeWidth="2.5" />
      <text
        x="20"
        y="16"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontWeight="800"
        fontFamily="var(--font-barlow-condensed, sans-serif)"
        letterSpacing="0.5"
      >
        WF
      </text>
      <line x1="6" y1="21" x2="34" y2="21" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="20"
        y="29"
        textAnchor="middle"
        fill="currentColor"
        fontSize="5.5"
        fontWeight="700"
        fontFamily="var(--font-barlow-condensed, sans-serif)"
        letterSpacing="1.5"
      >
        WINNER
      </text>
      <text
        x="20"
        y="36"
        textAnchor="middle"
        fill="currentColor"
        fontSize="5.5"
        fontWeight="700"
        fontFamily="var(--font-barlow-condensed, sans-serif)"
        letterSpacing="1.5"
      >
        FLAGS
      </text>

      {/* Wordmark */}
      <text
        x="48"
        y="22"
        fill="currentColor"
        fontSize="19"
        fontWeight="800"
        fontFamily="var(--font-barlow-condensed, sans-serif)"
        letterSpacing="0.5"
      >
        WINNER
      </text>
      <text
        x="48"
        y="38"
        fill="currentColor"
        fontSize="11"
        fontWeight="600"
        fontFamily="var(--font-barlow-condensed, sans-serif)"
        letterSpacing="3"
      >
        FLAGS
      </text>
    </svg>
  );
}
