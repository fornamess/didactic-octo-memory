// Хук для использования SSE для real-time обновления статуса заказа (PRF-003)
import { useEffect, useState, useRef } from 'react';

interface OrderStatus {
  status: string;
  statusDescription: string;
  videoUrl?: string | null;
  completed: boolean;
  failed: boolean;
}

export function useOrderStatusSSE(orderId: number | null, enabled: boolean = true) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) {
      return;
    }

    // Создаем EventSource для SSE
    const eventSource = new EventSource(`/api/status/${orderId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: OrderStatus = JSON.parse(event.data);
        setStatus(data);

        // Если заказ завершен или провален, закрываем соединение
        if (data.completed || data.failed) {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
        setError('Ошибка обработки данных');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Ошибка подключения к серверу');
      eventSource.close();
      eventSourceRef.current = null;
    };

    // Закрываем соединение при размонтировании
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [orderId, enabled]);

  return { status, error };
}
