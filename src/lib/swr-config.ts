// Конфигурация SWR для data fetching (IMP-001)
import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include', // Важно: отправляем cookies
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.error || 'An error occurred while fetching the data.');
    // @ts-expect-error - расширяем Error объект
    error.info = errorData;
    // @ts-expect-error - расширяем Error объект
    error.status = res.status;
    // Логируем ошибки всегда
    console.error('[SWR Fetcher] Error fetching', url, ':', errorData);
    throw error;
  }

  const data = await res.json();
  // Логируем только в development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SWR Fetcher] Successfully fetched', url, ':', data);
  }
  return data;
};

export { fetcher };
export default useSWR;
