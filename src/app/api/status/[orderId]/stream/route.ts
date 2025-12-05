// Server-Sent Events для real-time обновления статуса заказа (PRF-003)
import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getDb, get } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { orderId } = await params;
    const orderIdNum = parseInt(orderId, 10);

    if (isNaN(orderIdNum)) {
      return new Response('Invalid order ID', { status: 400 });
    }

    // Проверяем что заказ принадлежит пользователю
    const db = await getDb();
    const order = await get(
      db,
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderIdNum, user.id]
    );
    db.close();

    if (!order) {
      return new Response('Order not found', { status: 404 });
    }

    // Создаем SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let lastStatus = order.status;
        let lastStatusDescription = order.status_description;

        // Отправляем начальный статус
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              status: lastStatus,
              statusDescription: lastStatusDescription,
              completed: lastStatus === 'completed',
              failed: lastStatus === 'error' || lastStatus === 'failed',
            })}\n\n`
          )
        );

        // Проверяем статус каждые 5 секунд
        const interval = setInterval(async () => {
          try {
            const db = await getDb();
            const currentOrder = await get(
              db,
              'SELECT status, status_description, video_url FROM orders WHERE id = ?',
              [orderIdNum]
            );
            db.close();

            if (
              currentOrder &&
              (currentOrder.status !== lastStatus ||
                currentOrder.status_description !== lastStatusDescription)
            ) {
              lastStatus = currentOrder.status;
              lastStatusDescription = currentOrder.status_description;

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    status: lastStatus,
                    statusDescription: lastStatusDescription,
                    videoUrl: currentOrder.video_url,
                    completed: lastStatus === 'completed',
                    failed: lastStatus === 'error' || lastStatus === 'failed',
                  })}\n\n`
                )
              );

              // Если заказ завершен или провален, закрываем stream
              if (lastStatus === 'completed' || lastStatus === 'error' || lastStatus === 'failed') {
                clearInterval(interval);
                controller.close();
              }
            }
          } catch (error) {
            console.error('SSE error:', error);
            clearInterval(interval);
            controller.close();
          }
        }, 5000); // Проверка каждые 5 секунд

        // Закрываем stream через 10 минут (максимальное время ожидания)
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 10 * 60 * 1000);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE route error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
