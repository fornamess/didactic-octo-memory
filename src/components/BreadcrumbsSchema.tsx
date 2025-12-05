import Script from 'next/script';
import { BASE_URL } from '@/lib/config';

interface BreadcrumbsSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export default function BreadcrumbsSchema({ items }: BreadcrumbsSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <Script
      id="breadcrumbs-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
