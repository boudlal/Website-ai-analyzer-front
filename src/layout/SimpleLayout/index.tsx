'use client';

import { lazy, ReactNode } from 'react';

// next
import { usePathname } from 'next/navigation';

// material-ui
const Header = lazy(() => import('./Header'));
const FooterBlock = lazy(() => import('./FooterBlock'));

// ==============================|| LAYOUTS - STRUCTURE ||============================== //

interface Props {
  children: ReactNode;
}

export default function SimpleLayout({ children }: Props) {
  const pathname = usePathname();
  const layout: string = pathname === '/' || pathname === '/landing' ? 'landing' : 'simple';

  return (
    <>
      <Header layout={layout} />
      {children}
      <FooterBlock isFull={layout === 'landing'} />
    </>
  );
}
