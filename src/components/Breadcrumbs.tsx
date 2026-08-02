import Link from 'next/link';
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `https://sneaker-checker.com${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', color: 'var(--foreground-muted)' }}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isLast ? (
                  <span style={{ color: 'var(--foreground)', fontWeight: 600 }} aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link href={item.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.label}
                    </Link>
                    <span>/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
