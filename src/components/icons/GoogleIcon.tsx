import type { SVGProps } from 'react';

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.14 3.58-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.86-3c-1.07.72-2.44 1.14-4.09 1.14-3.14 0-5.8-2.12-6.75-4.97H1.25v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27A7.21 7.21 0 0 1 4.88 12c0-.79.14-1.56.37-2.27V6.64H1.25A12 12 0 0 0 0 12c0 1.93.46 3.75 1.25 5.36l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.81l3.43-3.43C17.96 1.24 15.24 0 12 0A12 12 0 0 0 1.25 6.64l4 3.09c.95-2.85 3.61-4.96 6.75-4.96Z"
      />
    </svg>
  );
}
