'use client';

import { useEffect, useState } from 'react';

/**
 * A wrapper component that delays rendering its children until the client-side has mounted.
 * This is useful for preventing SSR hydration mismatches with components that generate
 * unique IDs or rely on browser-specific APIs (e.g., Radix UI components, components using `window`).
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The children to render only on the client.
 * @returns {React.ReactNode | null} The children if mounted, otherwise null.
 */
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default ClientOnly;
