import { BASE_URL } from '@/lib/config';
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BASE_URL;

  const routes = [
    '',
    '/service/ded-moroz',
    '/login',
    '/profile',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1.0 : route === '/service/ded-moroz' ? 0.9 : 0.7,
  }));

  return routes;
}
