'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Coins, History, Loader, Plus, Save, Shield, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  nickname: string;
  first_name: string;
  last_name: string;
  balance: number;
  orders_count: number;
  created_at: string;
}

interface Order {
  id: number;
  order_number: string;
  service_name: string;
  status: string;
  created_at: string;
  video_url: string | null;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userTransactions, setUserTransactions] = useState<
    Array<{
      id: number;
      amount: number;
      status: string;
      created_at: string;
    }>
  >([]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin && userId) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId]);

  const checkAdminAccess = async () => {
    try {
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const response = await fetch('/api/admin/check');

      if (!response.ok) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Токен теперь в httpOnly cookie, отправляется автоматически
      // Загружаем данные пользователя
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const userRes = await fetch(`/api/admin/users/${userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user) {
          setUser(userData.user);
        } else {
          setLoading(false);
          return;
        }
      } else if (userRes.status === 404) {
        setLoading(false);
        return;
      }

      // Загружаем заказы
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const ordersRes = await fetch(`/api/admin/users/${userId}/orders`);
      const ordersData = await ordersRes.json();
      setUserOrders(ordersData.orders || []);

      // Загружаем транзакции
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const transRes = await fetch(`/api/admin/users/${userId}/transactions`);
      const transData = await transRes.json();
      setUserTransactions(transData.transactions || []);
    } catch (error) {
      console.error('Load user data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    setTopupLoading(true);
    try {
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const response = await fetch(`/api/admin/users/${userId}/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Баланс успешно пополнен на ${amount} Койнов`);
        setShowTopupModal(false);
        setTopupAmount('');
        // Обновляем данные пользователя
        loadUserData();
      } else {
        alert(data.error || 'Ошибка пополнения баланса');
      }
    } catch (error) {
      console.error('Topup error:', error);
      alert('Ошибка пополнения баланса');
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <Loader className="w-12 h-12 text-[#ffd700] animate-spin" />
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <header className="bg-black/30 border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-[#a8d8ea] hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#ffd700]" />
                <h1 className="text-xl font-bold text-white">Детали пользователя</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="card-festive rounded-3xl p-6 text-center">
            <p className="text-[#a8d8ea] text-lg">Пользователь не найден</p>
            <p className="text-[#a8d8ea]/60 mt-2">
              Пользователь с ID {userId} не существует или был удален
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Хедер */}
      <header className="bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#a8d8ea] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#ffd700]" />
              <h1 className="text-xl font-bold text-white">Детали пользователя</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-festive rounded-3xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{user.nickname}</h2>
              <p className="text-[#a8d8ea]/60">{user.email}</p>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="btn-magic px-4 py-2 rounded-xl text-white flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Пополнить баланс
            </button>
          </div>

          {/* Информация */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-[#a8d8ea]/60 text-sm">Имя</p>
              <p className="text-white">
                {user.first_name} {user.last_name}
              </p>
            </div>
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-[#a8d8ea]/60 text-sm">Баланс</p>
              <p className="text-[#ffd700] font-bold text-xl">{user.balance} Койнов</p>
            </div>
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-[#a8d8ea]/60 text-sm">Дата регистрации</p>
              <p className="text-white">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {/* Заказы */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Заказы ({userOrders.length})
            </h3>
            {userOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[#a8d8ea]/60 text-left text-sm border-b border-white/10">
                      <th className="pb-2 pr-4">Номер</th>
                      <th className="pb-2 pr-4">Название</th>
                      <th className="pb-2 pr-4">Статус</th>
                      <th className="pb-2">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-[#ffd700] font-mono text-sm">
                          {order.order_number}
                        </td>
                        <td className="py-3 pr-4 text-white">{order.service_name}</td>
                        <td className="py-3 pr-4 text-[#a8d8ea]">{order.status}</td>
                        <td className="py-3 text-[#a8d8ea]/60">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[#a8d8ea]/60">Заказов нет</p>
            )}
          </div>

          {/* Транзакции */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Coins className="w-5 h-5" />
              История пополнений ({userTransactions.length})
            </h3>
            {userTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[#a8d8ea]/60 text-left text-sm border-b border-white/10">
                      <th className="pb-2 pr-4">Сумма</th>
                      <th className="pb-2 pr-4">Статус</th>
                      <th className="pb-2">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTransactions.map((t) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-green-400 font-bold">+{t.amount} Койнов</td>
                        <td className="py-3 pr-4 text-[#a8d8ea]">{t.status}</td>
                        <td className="py-3 text-[#a8d8ea]/60">{formatDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[#a8d8ea]/60">Пополнений нет</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Модальное окно пополнения баланса */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-festive rounded-3xl p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Пополнить баланс</h3>
              <button
                onClick={() => setShowTopupModal(false)}
                className="text-[#a8d8ea]/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[#a8d8ea] text-sm mb-2">Сумма (Койнов)</label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min="1"
                step="1"
                placeholder="Введите сумму"
                className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="btn-magic flex-1 px-4 py-3 rounded-xl text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {topupLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Пополнить
                  </>
                )}
              </button>
              <button
                onClick={() => setShowTopupModal(false)}
                className="glass px-4 py-3 rounded-xl text-[#a8d8ea] hover:bg-white/10 transition-colors"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
