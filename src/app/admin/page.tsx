"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  Settings,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Coins,
  FileText,
  History,
  X,
  Save,
  Eye,
  EyeOff,
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

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  // Настройки
  const [settings, setSettings] = useState({
    emailVerificationRequired: false,
    agreementText: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
      loadUsers();
      loadSettings();
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Load users error:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.settings) {
        setSettings({
          emailVerificationRequired: data.settings.email_verification_required === "1",
          agreementText: data.settings.user_agreement_text || "",
        });
      }
    } catch (error) {
      console.error("Load settings error:", error);
    }
  };

  const loadUserDetails = async (userId: number) => {
    try {
      const token = localStorage.getItem("token");

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
      console.error("Load user details error:", error);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    loadUserDetails(user.id);
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      alert("Настройки сохранены");
    } catch (error) {
      alert("Ошибка сохранения настроек");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Search error:", error);
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

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Хедер */}
      <header className="bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#a8d8ea] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#ffd700]" />
              <h1 className="text-xl font-bold text-white">Админ-панель</h1>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              router.push("/");
            }}
            className="text-[#a8d8ea]/60 hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Табы */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-[#c41e3a] text-white"
                : "glass text-[#a8d8ea] hover:bg-white/10"
            }`}
          >
            <Users className="w-5 h-5" />
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-[#c41e3a] text-white"
                : "glass text-[#a8d8ea] hover:bg-white/10"
            }`}
          >
            <Settings className="w-5 h-5" />
            Настройки
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Поиск */}
              <div className="card-festive rounded-xl p-4 mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Поиск по нику или email..."
                    className="input-magic flex-1 px-4 py-3 rounded-xl text-[#f0f8ff]"
                  />
                  <button
                    onClick={handleSearch}
                    className="btn-magic px-6 py-3 rounded-xl text-white flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Найти
                  </button>
                </div>
              </div>

              {/* Список пользователей */}
              <div className="card-festive rounded-3xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Пользователи ({users.length})
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[#a8d8ea]/60 text-left border-b border-white/10">
                        <th className="pb-3 pr-4">Пользователь</th>
                        <th className="pb-3 pr-4">Баланс</th>
                        <th className="pb-3 pr-4">Заказов</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => handleSelectUser(user)}
                        >
                          <td className="py-4 pr-4">
                            <div>
                              <p className="text-white font-semibold">
                                {user.nickname}
                              </p>
                              <p className="text-[#a8d8ea]/60 text-sm">
                                {user.email}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-[#ffd700] font-bold">
                              {user.balance}
                            </span>
                            <span className="text-[#a8d8ea]/60 ml-1">
                              Койнов
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#a8d8ea]">
                            {user.orders_count}
                          </td>
                          <td className="py-4">
                            <ChevronRight className="w-5 h-5 text-[#a8d8ea]/40" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card-festive rounded-3xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Настройки сайта
              </h2>

              <div className="space-y-6">
                {/* Верификация email */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <h3 className="text-white font-semibold">
                      Верификация email при регистрации
                    </h3>
                    <p className="text-[#a8d8ea]/60 text-sm">
                      Если включено, пользователи должны подтвердить email
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        emailVerificationRequired:
                          !settings.emailVerificationRequired,
                      })
                    }
                    className={`w-14 h-8 rounded-full transition-colors ${
                      settings.emailVerificationRequired
                        ? "bg-green-500"
                        : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white transition-transform ${
                        settings.emailVerificationRequired
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Текст соглашения */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Текст пользовательского соглашения
                  </label>
                  <textarea
                    value={settings.agreementText}
                    onChange={(e) =>
                      setSettings({ ...settings, agreementText: e.target.value })
                    }
                    rows={15}
                    className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] resize-none"
                    placeholder="Введите текст соглашения..."
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="btn-magic px-6 py-3 rounded-xl text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {settingsSaving ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Сохранить настройки
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модальное окно деталей пользователя */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-festive rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedUser.nickname}
                  </h2>
                  <p className="text-[#a8d8ea]/60">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-[#a8d8ea]/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Информация */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="glass-dark p-4 rounded-xl">
                  <p className="text-[#a8d8ea]/60 text-sm">Имя</p>
                  <p className="text-white">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div className="glass-dark p-4 rounded-xl">
                  <p className="text-[#a8d8ea]/60 text-sm">Баланс</p>
                  <p className="text-[#ffd700] font-bold text-xl">
                    {selectedUser.balance} Койнов
                  </p>
                </div>
                <div className="glass-dark p-4 rounded-xl">
                  <p className="text-[#a8d8ea]/60 text-sm">Дата регистрации</p>
                  <p className="text-white">
                    {formatDate(selectedUser.created_at)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
