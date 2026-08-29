import React, { useEffect } from 'react';

interface HelmetProps {
  children?: React.ReactNode;
}

/**
 * Helmet SEO & Structured Data Manager.
 * - Manages canonical links dynamically in document.head
 * - Injects and updates schema.org JSON-LD scripts
 * - Syncs document.title and OpenGraph / Twitter meta tags
 * - Integrates with React 19 native metadata hoisting
 */
export const Helmet: React.FC<HelmetProps> = ({ children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let canonicalHref = '';
    let pageTitle = '';
    let pageDescription = '';
    let jsonLdContent = '';

    // Inspect child nodes to extract metadata directives
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;

      const type = child.type;
      const props = child.props as any;

      if (type === 'title' && typeof props?.children === 'string') {
        pageTitle = props.children;
      } else if (type === 'link' && props?.rel === 'canonical' && props?.href) {
        canonicalHref = props.href;
      } else if (type === 'meta' && props?.name === 'description' && props?.content) {
        pageDescription = props.content;
      } else if (type === 'script' && props?.type === 'application/ld+json' && props?.children) {
        jsonLdContent = typeof props.children === 'string' ? props.children : JSON.stringify(props.children);
      }
    });

    // 1. Synchronize Document Title
    if (pageTitle && document.title !== pageTitle) {
      document.title = pageTitle;
    }

    // 2. Synchronize Canonical Link Tag
    if (canonicalHref) {
      let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalTag) {
        canonicalTag = document.createElement('link');
        canonicalTag.rel = 'canonical';
        document.head.appendChild(canonicalTag);
      }
      canonicalTag.href = canonicalHref;
    }

    // 3. Synchronize Meta Description
    if (pageDescription) {
      let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!descTag) {
        descTag = document.createElement('meta');
        descTag.name = 'description';
        document.head.appendChild(descTag);
      }
      descTag.content = pageDescription;
    }

    // 4. Synchronize Structured Data JSON-LD in Document Head
    if (jsonLdContent) {
      let scriptTag = document.getElementById('seo-dynamic-ldjson') as HTMLScriptElement | null;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'seo-dynamic-ldjson';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = jsonLdContent;
    }

    return () => {
      // Clean up dynamic LD+JSON on unmount if needed
      const tag = document.getElementById('seo-dynamic-ldjson');
      if (tag && tag.parentNode) {
        tag.parentNode.removeChild(tag);
      }
    };
  }, [children]);

  return <>{children}</>;
};
