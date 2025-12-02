'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Coins,
  Download,
  ExternalLink,
  History,
  Loader,
  LogOut,
  Mail,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface SupportContacts {
  telegram: string;
  email: string;
}

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
  const [activeTab, setActiveTab] = useState<'orders' | 'balance' | 'support'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10);
  const [topupLoading, setTopupLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string[]>(['USDT', 'BTC', 'ETH', 'TRX']);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [supportContacts, setSupportContacts] = useState<SupportContacts>({
    telegram: '@support',
    email: 'support@example.com',
  });

  // Загрузка контактов поддержки
  useEffect(() => {
    fetch('/api/settings/support')
      .then((res) => res.json())
      .then((data) => {
        if (data.telegram && data.email) {
          setSupportContacts(data);
        }
      })
      .catch(() => {});
  }, []);

  // Проверка статуса генерации для pending заказов
  const checkPendingOrders = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const pendingOrders = orders.filter(
      (o) =>
        o.taskId &&
        (o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress')
    );

    if (pendingOrders.length === 0) return;

    setCheckingStatus(true);

    for (const order of pendingOrders) {
      try {
        const response = await fetch(`/api/check-status?taskId=${order.taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.isCompleted && data.videoUrl) {
          // Обновляем заказ в списке
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    status: 'completed',
                    statusDescription: 'Видео готово',
                    videoUrl: data.videoUrl,
                  }
                : o
            )
          );
        } else if (data.isFailed && !data.introReady) {
          // Если intro ещё не готов, не помечаем как ошибку - продолжаем ждать
          console.log('Personal failed but intro not ready, continuing...');
        } else if (data.isFailed) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    status: data.statusDescription || 'error',
                    statusDescription: data.error || 'Ошибка генерации',
                  }
                : o
            )
          );
        } else if (data.statusDescription) {
          // Обновляем статус
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    status: data.statusDescription,
                    statusDescription: data.statusDescription,
                  }
                : o
            )
          );
        }
      } catch (error) {
        console.error('Check status error:', error);
      }
    }

    setCheckingStatus(false);
  }, [orders]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadData(token);
  }, [router]);

  // Первоначальная проверка статуса после загрузки заказов
  useEffect(() => {
    if (!loading && orders.length > 0) {
      const hasPending = orders.some(
        (o) =>
          o.taskId &&
          (o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress')
      );
      if (hasPending) {
        checkPendingOrders();
      }
    }
  }, [loading, orders.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автоматическая проверка статуса каждые 10 секунд
  useEffect(() => {
    const hasPending = orders.some(
      (o) =>
        o.taskId &&
        (o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress')
    );

    if (!hasPending) return;

    const interval = setInterval(() => {
      checkPendingOrders();
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, [orders, checkPendingOrders]);

  const loadData = async (token: string) => {
    try {
      // Загружаем заказы
      const ordersRes = await fetch('/api/videos/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      if (ordersData.orders) {
        setOrders(ordersData.orders);
      }

      // Загружаем баланс
      const balanceRes = await fetch('/api/user/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const balanceData = await balanceRes.json();
      if (balanceData.balance !== undefined) {
        setUser((prev) => (prev ? { ...prev, balance: balanceData.balance } : null));
      }

      // Загружаем историю транзакций
      const transactionsRes = await fetch('/api/user/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const transactionsData = await transactionsRes.json();
      if (transactionsData.transactions) {
        setTransactions(transactionsData.transactions);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
    router.refresh();
  };

  const handleDownload = async (taskId: number, childName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/videos/download?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: topupAmount, paymentCurrency: selectedCrypto }),
      });

      const data = await response.json();

      if (data.invoiceUrl) {
        // Открываем страницу оплаты
        window.open(data.invoiceUrl, '_blank');
        setShowTopupModal(false);
      } else {
        alert(data.error || 'Ошибка создания платежа');
      }
    } catch (error) {
      console.error('Topup error:', error);
      alert('Ошибка создания платежа');
    } finally {
      setTopupLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending':
      case 'in queue':
      case 'in progress':
        return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'rejected with error':
      case 'rejected due to timeout':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#a8d8ea]" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'В очереди',
      'in queue': 'В очереди',
      'in progress': 'Генерируется',
      completed: 'Выполнено',
      'rejected with error': 'Ошибка',
      'rejected due to timeout': 'Таймаут',
    };
    return statusMap[status] || status;
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
          <button
            onClick={() => setActiveTab('support')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'support'
                ? 'bg-[#c41e3a] text-white'
                : 'glass text-[#a8d8ea] hover:bg-white/10'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Тикеты
          </button>
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
                {orders.some(
                  (o) =>
                    o.taskId &&
                    (o.status === 'pending' ||
                      o.status === 'in queue' ||
                      o.status === 'in progress')
                ) && (
                  <button
                    onClick={checkPendingOrders}
                    disabled={checkingStatus}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#a8d8ea] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                    {checkingStatus ? 'Проверяем...' : 'Проверить статус'}
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[#a8d8ea]/60 mb-4">У вас пока нет заказов</p>
                  <Link
                    href="/service/ded-moroz"
                    className="btn-magic px-6 py-3 rounded-xl text-white inline-flex items-center gap-2"
                  >
                    Создать первый заказ
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[#a8d8ea]/60 text-left border-b border-white/10">
                        <th className="pb-3 pr-4">Номер</th>
                        <th className="pb-3 pr-4">Название</th>
                        <th className="pb-3 pr-4">Статус</th>
                        <th className="pb-3 pr-4">Дата</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 pr-4 text-[#ffd700] font-mono text-sm">
                            {order.orderNumber}
                          </td>
                          <td className="py-4 pr-4">
                            <div>
                              <p className="text-white">{order.serviceName}</p>
                              <p className="text-[#a8d8ea]/60 text-sm">для {order.childName}</p>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <span className="text-[#a8d8ea]">{getStatusText(order.status)}</span>
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#a8d8ea]/60">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              {order.videoUrl && (
                                <>
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#a8d8ea] transition-colors"
                                    title="Смотреть"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDownload(order.taskId, order.childName)}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#a8d8ea] transition-colors"
                                    title="Скачать"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                                Ссылка
                                <ExternalLink className="w-4 h-4" />
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

          {activeTab === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card-festive rounded-3xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Техническая поддержка</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <a
                  href={`https://t.me/${supportContacts.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-dark p-6 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-full bg-[#0088cc] flex items-center justify-center">
                    <Send className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Telegram</h3>
                    <p className="text-[#a8d8ea]/60">{supportContacts.telegram}</p>
                  </div>
                </a>

                <a
                  href={`mailto:${supportContacts.email}`}
                  className="glass-dark p-6 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-full bg-[#c41e3a] flex items-center justify-center">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email</h3>
                    <p className="text-[#a8d8ea]/60">{supportContacts.email}</p>
                  </div>
                </a>
              </div>

              <div className="mt-6 p-4 bg-white/5 rounded-xl">
                <p className="text-[#a8d8ea]/80 text-sm">
                  Мы отвечаем на все обращения в течение 24 часов. Для более быстрого ответа
                  рекомендуем писать в Telegram.
                </p>
              </div>
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
      <AnimatePresence>
        {showTopupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTopupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-festive rounded-3xl p-6 md:p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gradient font-display">Пополнить баланс</h2>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="text-[#a8d8ea]/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-[#a8d8ea] mb-2 font-semibold">Сумма пополнения</label>
                <div className="flex gap-2 mb-4">
                  {[5, 10, 20, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount)}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                        topupAmount === amount
                          ? 'bg-[#ffd700] text-black'
                          : 'glass text-[#a8d8ea] hover:bg-white/10'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(parseInt(e.target.value) || 1)}
                  className="input-magic w-full px-5 py-4 rounded-xl text-[#f0f8ff] text-lg"
                />
              </div>

              <div className="mb-6">
                <label className="block text-[#a8d8ea] mb-2 font-semibold">Способ оплаты</label>
                <div className="grid grid-cols-4 gap-2">
                  {['USDT', 'BTC', 'ETH', 'TRX', 'USDC', 'ATOM', 'AVAX', 'LTC'].map((crypto) => (
                    <button
                      key={crypto}
                      onClick={() => {
                        if (selectedCrypto.includes(crypto)) {
                          if (selectedCrypto.length > 1) {
                            setSelectedCrypto(selectedCrypto.filter((c) => c !== crypto));
                          }
                        } else {
                          setSelectedCrypto([...selectedCrypto, crypto]);
                        }
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                        selectedCrypto.includes(crypto)
                          ? 'bg-[#ffd700] text-black'
                          : 'glass text-[#a8d8ea] hover:bg-white/10'
                      }`}
                    >
                      {crypto}
                    </button>
                  ))}
                </div>
                <p className="text-[#a8d8ea]/40 text-xs mt-2">
                  Выберите криптовалюты для оплаты (минимум одна)
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[#a8d8ea]">К оплате</span>
                  <span className="text-2xl font-bold text-[#ffd700]">${topupAmount}</span>
                </div>
                <p className="text-[#a8d8ea]/60 text-sm mt-2">
                  1 Койн = 1 USD. Оплата: {selectedCrypto.join(', ')}
                </p>
              </div>

              <button
                onClick={handleTopup}
                disabled={topupLoading}
                className="btn-magic w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {topupLoading ? (
                  <Loader className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-6 h-6" />
                    Перейти к оплате
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
