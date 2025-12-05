// Компонент списка заказов для страницы профиля (CQ-004)
'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, Download, ExternalLink, Play, XCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';

interface Order {
  id: number;
  orderNumber: string;
  serviceName: string;
  taskId: number;
  childName: string;
  videoUrl: string | null;
  status: string;
  statusDescription: string;
  createdAt: string;
  completedAt: string | null;
}

interface OrderListProps {
  orders: Order[];
  onDownload: (taskId: number, childName: string) => void;
  onSelectOrder: (order: Order) => void;
  checkingStatus: boolean;
}

export default function OrderList({ orders, onDownload, onSelectOrder, checkingStatus }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#a8d8ea]/90 text-lg">У вас пока нет заказов</p>
        <p className="text-[#a8d8ea]/70 text-sm mt-2">Создайте свой первый заказ на главной странице</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isPending =
          order.status === 'pending' ||
          order.status === 'in queue' ||
          order.status === 'in progress';
        const isCompleted = order.status === 'completed';
        const isError = order.status === 'error' || order.status === 'failed';

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-festive rounded-2xl p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">{order.childName}</h3>
                  <span className="text-xs text-[#a8d8ea]/70">#{order.orderNumber}</span>
                </div>
                <p className="text-[#a8d8ea]/90 text-sm mb-3">{order.serviceName}</p>

                <div className="flex items-center gap-2 mb-3">
                  {isCompleted && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {isPending && <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />}
                  {isError && <XCircle className="w-5 h-5 text-red-400" />}
                  <span
                    className={`text-sm font-semibold ${
                      isCompleted
                        ? 'text-green-400'
                        : isPending
                          ? 'text-yellow-400'
                          : isError
                            ? 'text-red-400'
                            : 'text-[#a8d8ea]'
                    }`}
                  >
                    {order.statusDescription || order.status}
                  </span>
                  {checkingStatus && isPending && (
                    <span className="text-xs text-[#a8d8ea]/70">(проверка...)</span>
                  )}
                </div>

                <p className="text-xs text-[#a8d8ea]/70">
                  Создан: {new Date(order.createdAt).toLocaleString('ru-RU')}
                </p>
                {order.completedAt && (
                  <p className="text-xs text-[#a8d8ea]/70">
                    Завершен: {new Date(order.completedAt).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {isCompleted && order.videoUrl && (
                  <>
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Смотреть
                    </button>
                    <button
                      onClick={() => onDownload(order.taskId, order.childName)}
                      className="btn-magic px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </button>
                  </>
                )}
                {isCompleted && !order.videoUrl && (
                  <button
                    onClick={() => onDownload(order.taskId, order.childName)}
                    className="btn-magic px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть ссылку
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
