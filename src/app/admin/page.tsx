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
  Save,
  Eye,
  EyeOff,
  Loader,
  Shield,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  X,
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
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "finances">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topupModal, setTopupModal] = useState<{ userId: number; nickname: string } | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  // Финансы
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

  // Настройки
  const [settings, setSettings] = useState({
    emailVerificationRequired: false,
    agreementText: "",
    contactsText: "",
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
          contactsText: data.settings.contacts_text || "",
        });
      }
    } catch (error) {
      console.error("Load settings error:", error);
    }
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const handleTopup = async () => {
    if (!topupModal) return;
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      alert("Введите корректную сумму");
      return;
    }

    setTopupLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/users/${topupModal.userId}/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Баланс пользователя ${topupModal.nickname} успешно пополнен на ${amount} Койнов`);
        setTopupModal(null);
        setTopupAmount("");
        loadUsers();
      } else {
        alert(data.error || "Ошибка пополнения баланса");
      }
    } catch (error) {
      console.error("Topup error:", error);
      alert("Ошибка пополнения баланса");
    } finally {
      setTopupLoading(false);
    }
  };

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (dateFilter.start) params.append("startDate", dateFilter.start);
      if (dateFilter.end) params.append("endDate", dateFilter.end);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(
        `/api/admin/invoices?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Load invoices error:", error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "finances") {
      loadInvoices();
    }
  }, [activeTab, dateFilter, statusFilter]);

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
            onClick={() => setActiveTab("finances")}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "finances"
                ? "bg-[#c41e3a] text-white"
                : "glass text-[#a8d8ea] hover:bg-white/10"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Финансы
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
                        <th className="pb-3 pr-4">Действия</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td
                            className="py-4 pr-4 cursor-pointer"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <div>
                              <p className="text-white font-semibold">
                                {user.nickname}
                              </p>
                              <p className="text-[#a8d8ea]/60 text-sm">
                                {user.email}
                              </p>
                            </div>
                          </td>
                          <td
                            className="py-4 pr-4 cursor-pointer"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <span className="text-[#ffd700] font-bold">
                              {user.balance}
                            </span>
                            <span className="text-[#a8d8ea]/60 ml-1">
                              Койнов
                            </span>
                          </td>
                          <td
                            className="py-4 pr-4 text-[#a8d8ea] cursor-pointer"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            {user.orders_count}
                          </td>
                          <td className="py-4 pr-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTopupModal({ userId: user.id, nickname: user.nickname });
                              }}
                              className="btn-magic px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                              title="Пополнить баланс"
                            >
                              <Plus className="w-4 h-4" />
                              Пополнить
                            </button>
                          </td>
                          <td
                            className="py-4 cursor-pointer"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
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

          {activeTab === "finances" && (
            <motion.div
              key="finances"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Фильтры */}
              <div className="card-festive rounded-xl p-4 mb-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Период */}
                  <div>
                    <label className="block text-[#a8d8ea] text-sm mb-2">Начало периода</label>
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) =>
                        setDateFilter({ ...dateFilter, start: e.target.value })
                      }
                      className="input-magic w-full px-4 py-2 rounded-xl text-[#f0f8ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#a8d8ea] text-sm mb-2">Конец периода</label>
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) =>
                        setDateFilter({ ...dateFilter, end: e.target.value })
                      }
                      className="input-magic w-full px-4 py-2 rounded-xl text-[#f0f8ff]"
                    />
                  </div>
                  {/* Статус */}
                  <div>
                    <label className="block text-[#a8d8ea] text-sm mb-2">Статус оплаты</label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "all" | "completed" | "pending")
                      }
                      className="input-magic w-full px-4 py-2 rounded-xl text-[#f0f8ff]"
                    >
                      <option value="all">Все</option>
                      <option value="completed">Оплачен</option>
                      <option value="pending">Не оплачен</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Таблица инвойсов */}
              <div className="card-festive rounded-3xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Инвойсы ({invoices.length})
                </h2>

                {invoicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-8 h-8 text-[#ffd700] animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[#a8d8ea]/60 text-left border-b border-white/10">
                          <th className="pb-3 pr-4">Дата</th>
                          <th className="pb-3 pr-4">Время</th>
                          <th className="pb-3 pr-4">Ник</th>
                          <th className="pb-3 pr-4">Сумма</th>
                          <th className="pb-3 pr-4">Статус</th>
                          <th className="pb-3">Ссылка на инвойс</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length > 0 ? (
                          invoices.map((invoice: any) => {
                            const { date, time } = formatDateTime(invoice.created_at);
                            return (
                              <tr
                                key={invoice.id}
                                className="border-b border-white/5 hover:bg-white/5"
                              >
                                <td className="py-4 pr-4 text-white">{date}</td>
                                <td className="py-4 pr-4 text-[#a8d8ea]">{time}</td>
                                <td className="py-4 pr-4">
                                  <Link
                                    href={`/admin/users/${invoice.user_id}`}
                                    className="text-[#ffd700] hover:text-[#ffed4e] transition-colors font-semibold"
                                  >
                                    {invoice.nickname ||
                                     (invoice.first_name && invoice.last_name ? `${invoice.first_name} ${invoice.last_name}` : null) ||
                                     invoice.email ||
                                     `ID: ${invoice.user_id}`}
                                  </Link>
                                </td>
                                <td className="py-4 pr-4 text-[#ffd700] font-bold">
                                  {invoice.amount} Койнов
                                </td>
                                <td className="py-4 pr-4">
                                  <span
                                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                      invoice.status === "completed"
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-yellow-500/20 text-yellow-400"
                                    }`}
                                  >
                                    {invoice.status === "completed" ? "Оплачен" : "Не оплачен"}
                                  </span>
                                </td>
                                <td className="py-4">
                                  {invoice.invoice_url ? (
                                    <a
                                      href={invoice.invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#a8d8ea] hover:text-white transition-colors underline"
                                    >
                                      Открыть
                                    </a>
                                  ) : (
                                    <span className="text-[#a8d8ea]/40">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#a8d8ea]/60">
                              Инвойсов не найдено
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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

                {/* Контакты */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Контакты (поддерживается HTML)
                  </label>
                  <textarea
                    value={settings.contactsText}
                    onChange={(e) =>
                      setSettings({ ...settings, contactsText: e.target.value })
                    }
                    rows={10}
                    className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] resize-none"
                    placeholder="Введите контактную информацию (можно использовать HTML, например: &lt;a href=&quot;https://t.me/username&quot;&gt;Telegram&lt;/a&gt;)"
                  />
                  <p className="text-[#a8d8ea]/60 text-sm mt-2">
                    Поддерживается HTML разметка. Например: &lt;a href="https://t.me/username"&gt;Telegram&lt;/a&gt;
                  </p>
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

      {/* Модальное окно пополнения баланса */}
      {topupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-festive rounded-3xl p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Пополнить баланс: {topupModal.nickname}
              </h3>
              <button
                onClick={() => {
                  setTopupModal(null);
                  setTopupAmount("");
                }}
                className="text-[#a8d8ea]/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[#a8d8ea] text-sm mb-2">
                Сумма (Койнов)
              </label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min="1"
                step="1"
                placeholder="Введите сумму"
                className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff]"
                autoFocus
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
                onClick={() => {
                  setTopupModal(null);
                  setTopupAmount("");
                }}
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
