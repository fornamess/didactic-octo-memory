'use client';

import OrderList from '@/components/profile/OrderList';
import TopupModal from '@/components/profile/TopupModal';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  ExternalLink,
  History,
  Loader,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

interface Transaction {
  id: number;
  amount: number;
  type: string;
  status: string;
  invoice_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    email: string;
    nickname: string;
    firstName?: string;
    lastName?: string;
    balance: number;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'balance'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10);
  const [topupLoading, setTopupLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string[]>(['USDT', 'BTC', 'ETH', 'TRX']);
  const [refreshing, setRefreshing] = useState(false);

  // Загрузка заказов
  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/videos/history', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }, []);

  // Загрузка баланса
  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/user/balance', { credentials: 'include' });
      const data = await res.json();
      if (data.balance !== undefined) {
        setUser((prev) => (prev ? { ...prev, balance: data.balance } : prev));
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }, []);

  // Загрузка транзакций
  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/user/transactions', { credentials: 'include' });
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, []);

  // Обновить всё
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadOrders(), loadBalance(), loadTransactions()]);
    setRefreshing(false);
  }, [loadOrders, loadBalance, loadTransactions]);

  // Инициализация
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Загружаем данные
    Promise.all([loadOrders(), loadBalance(), loadTransactions()]).finally(() => setLoading(false));
  }, [router, loadOrders, loadBalance, loadTransactions]);

  // Polling для обновления статусов pending заказов
  useEffect(() => {
    const hasPendingOrders = orders.some(
      (o) => o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress'
    );

    if (!hasPendingOrders) return;

    const interval = setInterval(async () => {
      // Проверяем статусы всех pending заказов
      const pendingOrders = orders.filter(
        (o) => o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress'
      );

      // Проверяем статусы параллельно
      await Promise.all(
        pendingOrders.map(async (order) => {
          if (!order.taskId) return;

          try {
            const response = await fetch('/api/videos/check-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: order.taskId, orderId: order.id }),
            });

            if (response.ok) {
              // После проверки обновляем список заказов
              await loadOrders();
            }
          } catch (error) {
            console.error(`Error checking status for order ${order.id}:`, error);
          }
        })
      );
    }, 10000); // Каждые 10 секунд

    return () => clearInterval(interval);
  }, [orders, loadOrders]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/');
    router.refresh();
  };

  const handleDownload = async (taskId: number, childName: string) => {
    try {
      const response = await fetch(`/api/videos/download?taskId=${taskId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pozdravlenie-${childName}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        if (data.directDownload && data.videoUrl) {
          window.open(data.videoUrl, '_blank');
        } else {
          alert('Ошибка при скачивании видео');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Ошибка при скачивании видео');
    }
  };

  const handleTopup = async () => {
    setTopupLoading(true);
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: topupAmount, paymentCurrency: selectedCrypto }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка создания платежа');

      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        setShowTopupModal(false);
        setTimeout(() => loadBalance(), 1000);
      } else {
        alert(data.error || 'Ошибка создания платежа');
      }
    } catch (error) {
      console.error('Topup error:', error);
      alert(error instanceof Error ? error.message : 'Ошибка создания платежа');
    } finally {
      setTopupLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <Loader className="w-12 h-12 text-[#ffd700] animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Хедер */}
      <header className="relative z-10 pt-6 pb-4 border-b border-white/10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-[#a8d8ea] hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            На главную
          </Link>
          <button
            onClick={handleLogout}
            className="text-[#a8d8ea]/60 hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Профиль */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-festive rounded-3xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c41e3a] to-[#8b0000] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.nickname || user?.firstName}
                </h1>
                <p className="text-[#a8d8ea]/60">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="glass-dark px-6 py-4 rounded-xl">
                <p className="text-[#a8d8ea]/60 text-sm">Баланс</p>
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-[#ffd700]" />
                  <span className="text-2xl font-bold text-[#ffd700]">{user?.balance || 0}</span>
                  <span className="text-[#a8d8ea]">Койнов</span>
                </div>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="btn-magic px-4 py-4 rounded-xl text-white flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Пополнить
              </button>
            </div>
          </div>
        </motion.div>

        {/* Табы */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#c41e3a] text-white'
                : 'glass text-[#a8d8ea] hover:bg-white/10'
            }`}
          >
            <History className="w-5 h-5" />
            Заказы
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'balance'
                ? 'bg-[#c41e3a] text-white'
                : 'glass text-[#a8d8ea] hover:bg-white/10'
            }`}
          >
            <Coins className="w-5 h-5" />
            История пополнений
          </button>
          <Link
            href="/contacts"
            className="px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap glass text-[#a8d8ea] hover:bg-white/10"
          >
            <MessageCircle className="w-5 h-5" />
            Тикеты
          </Link>
        </div>

        {/* Контент табов */}
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card-festive rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Мои заказы ({orders.length})</h2>
                <button
                  onClick={refreshAll}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-[#a8d8ea] hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Обновить</span>
                </button>
              </div>
              <OrderList
                orders={orders}
                onDownload={handleDownload}
                onSelectOrder={setSelectedOrder}
                checkingStatus={refreshing}
              />
            </motion.div>
          )}

          {activeTab === 'balance' && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card-festive rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">История пополнений</h2>
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="btn-magic px-4 py-2 rounded-xl text-white flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Пополнить
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 text-[#a8d8ea]/60">История пополнений пуста</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[#a8d8ea]/60 text-left border-b border-white/10">
                        <th className="pb-3 pr-4">Инвойс</th>
                        <th className="pb-3 pr-4">Сумма</th>
                        <th className="pb-3 pr-4">Статус</th>
                        <th className="pb-3 pr-4">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 pr-4">
                            {t.invoice_url ? (
                              <a
                                href={t.invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#ffd700] hover:underline flex items-center gap-1"
                              >
                                Ссылка <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-[#a8d8ea]/60">—</span>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-green-400 font-bold">+{t.amount}</span>
                            <span className="text-[#a8d8ea]/60 ml-1">Койнов</span>
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                t.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : t.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {t.status === 'completed'
                                ? 'Оплачено'
                                : t.status === 'pending'
                                ? 'Ожидает'
                                : 'Отменено'}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#a8d8ea]/60">
                            {formatDate(t.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модальное окно просмотра видео */}
      <AnimatePresence>
        {selectedOrder && selectedOrder.videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-xl font-bold">
                  {selectedOrder.serviceName} для {selectedOrder.childName}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <video src={selectedOrder.videoUrl} controls autoPlay className="w-full rounded-xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно пополнения */}
      <TopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        amount={topupAmount}
        onAmountChange={setTopupAmount}
        selectedCrypto={selectedCrypto}
        onCryptoToggle={(crypto) => {
          if (selectedCrypto.includes(crypto)) {
            if (selectedCrypto.length > 1)
              setSelectedCrypto(selectedCrypto.filter((c) => c !== crypto));
          } else {
            setSelectedCrypto([...selectedCrypto, crypto]);
          }
        }}
        onTopup={handleTopup}
        loading={topupLoading}
      />
    </main>
  );
}
