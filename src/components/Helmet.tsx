import React from 'react';

interface HelmetProps {
  children?: React.ReactNode;
}

/**
 * React 19 Native Metadata Hoisting Shim.
 * On React 19, <title>, <meta>, and <link> elements are natively hoisted
 * to the document's HTML <head>, eliminating the need for complex, heavy third-party context providers
 * like react-helmet-async, which cause invalid hook violations under newer runtimes.
 */
export const Helmet: React.FC<HelmetProps> = ({ children }) => {
  return <>{children}</>;
};
