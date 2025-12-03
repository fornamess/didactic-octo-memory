"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  History,
  X,
  Loader,
  Shield,
} from "lucide-react";

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
  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin && userId) {
      loadUserData();
    }
  }, [isAdmin, userId]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Загружаем данные пользователя
      const userRes = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user) {
          setUser(userData.user);
        }
      }

      // Загружаем заказы
      const ordersRes = await fetch(`/api/admin/users/${userId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      setUserOrders(ordersData.orders || []);

      // Загружаем транзакции
      const transRes = await fetch(`/api/admin/users/${userId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const transData = await transRes.json();
      setUserTransactions(transData.transactions || []);
    } catch (error) {
      console.error("Load user data error:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <Loader className="w-12 h-12 text-[#ffd700] animate-spin" />
      </main>
    );
  }

  if (!isAdmin || !user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Хедер */}
      <header className="bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-[#a8d8ea] hover:text-white transition-colors"
            >
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
              <h2 className="text-2xl font-bold text-white">
                {user.nickname}
              </h2>
              <p className="text-[#a8d8ea]/60">{user.email}</p>
            </div>
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
              <p className="text-[#ffd700] font-bold text-xl">
                {user.balance} Койнов
              </p>
            </div>
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-[#a8d8ea]/60 text-sm">Дата регистрации</p>
              <p className="text-white">
                {formatDate(user.created_at)}
              </p>
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
                      <tr
                        key={order.id}
                        className="border-b border-white/5"
                      >
                        <td className="py-3 pr-4 text-[#ffd700] font-mono text-sm">
                          {order.order_number}
                        </td>
                        <td className="py-3 pr-4 text-white">
                          {order.service_name}
                        </td>
                        <td className="py-3 pr-4 text-[#a8d8ea]">
                          {order.status}
                        </td>
                        <td className="py-3 text-[#a8d8ea]/60">
                          {formatDate(order.created_at)}
                        </td>
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
                    {userTransactions.map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-green-400 font-bold">
                          +{t.amount} Койнов
                        </td>
                        <td className="py-3 pr-4 text-[#a8d8ea]">
                          {t.status}
                        </td>
                        <td className="py-3 text-[#a8d8ea]/60">
                          {formatDate(t.created_at)}
                        </td>
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
    </main>
  );
}
