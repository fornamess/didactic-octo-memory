'use client';

import Modal from '@/components/Modal';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Clock,
  Coins,
  Gift,
  Image as ImageIcon,
  Play,
  ShoppingCart,
  Sparkles,
  Star,
  Upload,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const COMMENT_SUGGESTIONS = [
  'занимается спортом и любит футбол',
  'отлично учится в школе',
  'помогает маме по дому',
  'любит читать книги',
  'рисует красивые картины',
  'играет на музыкальном инструменте',
  'заботится о младших',
  'всегда делится с друзьями',
];

export default function DedMorozServicePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [user, setUser] = useState<{
    id: number;
    email: string;
    nickname: string;
    balance: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exampleVideoUrl, setExampleVideoUrl] = useState<string | null>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  const [formData, setFormData] = useState({
    childName: '',
    childAge: '' as string | number,
    photo1: null as File | null,
    photo1Preview: '',
    photo1Comment: '',
    photo2: null as File | null,
    photo2Preview: '',
    photo2Comment: '',
  });

  useEffect(() => {
    // Инициализируем пользователя синхронно из localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));

      // Обновляем баланс асинхронно с задержкой (не блокирует рендеринг)
      // Токен теперь в httpOnly cookie, отправляется автоматически
      const timeoutId = setTimeout(() => {
        fetch('/api/user/balance')
          .then((res) => res.json())
          .then((data) => {
            if (data.balance !== undefined) {
              setUser((prev) => {
                // Обновляем только если баланс действительно изменился
                if (prev && prev.balance !== data.balance) {
                  return { ...prev, balance: data.balance };
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // НЕ загружаем видео сразу - только при взаимодействии
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, photoNum: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем размер (макс 5 МБ)
    if (file.size > 5 * 1024 * 1024) {
      setError('Максимальный размер файла: 5 МБ');
      return;
    }

    // Проверяем тип
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Допустимые форматы: JPEG, JPG, PNG');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (photoNum === 1) {
        setFormData({
          ...formData,
          photo1: file,
          photo1Preview: reader.result as string,
        });
      } else {
        setFormData({
          ...formData,
          photo2: file,
          photo2Preview: reader.result as string,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOrder = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowOrderForm(true);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.childName.trim()) {
      setError('Введите имя ребёнка');
      return;
    }
    if (formData.childAge && (Number(formData.childAge) < 1 || Number(formData.childAge) > 18)) {
      setError('Возраст ребёнка должен быть от 1 до 18 лет');
      return;
    }
    if (!formData.photo1 || !formData.photo2) {
      setError('Загрузите оба фото');
      return;
    }
    if (!formData.photo1Comment.trim() || !formData.photo2Comment.trim()) {
      setError('Заполните комментарии к обоим фото');
      return;
    }

    // БЕСПЛАТНО - проверка баланса не нужна

    setLoading(true);

    try {
      // Конвертируем фото в base64
      const photo1Base64 = formData.photo1Preview;
      const photo2Base64 = formData.photo2Preview;

      // Токен теперь в httpOnly cookie, отправляется автоматически
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childName: formData.childName,
          childAge: formData.childAge ? Number(formData.childAge) : undefined,
          photo1: photo1Base64,
          photo1Comment: formData.photo1Comment,
          photo2: photo2Base64,
          photo2Comment: formData.photo2Comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании заказа');
      }

      // Обновляем баланс
      if (user && data.balance !== undefined) {
        setUser({ ...user, balance: data.balance });
        localStorage.setItem('user', JSON.stringify({ ...user, balance: data.balance }));
      }

      setSuccess(
        `Заказ #${data.orderNumber} создан! Видео будет готово в течение нескольких минут. Вы можете отслеживать статус в личном кабинете.`
      );
      setShowOrderForm(false);

      // Редирект в профиль через 2 секунды
      setTimeout(() => {
        // Используем router.push с refresh для обновления данных
        router.push('/profile');
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const toggleVideo = () => {
    // Загружаем видео при первом клике
    if (!shouldLoadVideo) {
      setShouldLoadVideo(true);
      // Загружаем URL видео
      fetch('/api/videos/example/random')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.videoUrl) {
            setExampleVideoUrl(data.videoUrl);
          } else {
            setExampleVideoUrl('/api/videos/stream/final/final_2.mp4');
          }
        })
        .catch(() => {
          setExampleVideoUrl('/api/videos/stream/final/final_2.mp4');
        });
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoHover = () => {
    if (!shouldLoadVideo) {
      setShouldLoadVideo(true);
      // Загружаем URL видео при hover
      fetch('/api/videos/example/random')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.videoUrl) {
            setExampleVideoUrl(data.videoUrl);
          } else {
            setExampleVideoUrl('/api/videos/stream/final/final_2.mp4');
          }
        })
        .catch(() => {
          setExampleVideoUrl('/api/videos/stream/final/final_2.mp4');
        });
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 3.3) % 100}%`,
              top: `${(i * 5) % 80}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Хедер */}
      <header className="relative z-10 pt-4 sm:pt-6 pb-4">
        <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-[#a8d8ea] hover:text-white transition-colors flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">На главную</span>
            <span className="sm:hidden">Назад</span>
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="glass px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[#f0f8ff] hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
            >
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffd700]" />
              <span className="font-bold text-[#ffd700]">{user.balance}</span>
              <span className="text-[#a8d8ea]/90 hidden sm:inline">Койнов</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-magic px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Войти</span>
              <span className="sm:hidden">Вход</span>
            </Link>
          )}
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        {/* Заголовок услуги */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <span className="text-5xl sm:text-7xl mb-2 sm:mb-4 block">🎅</span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gradient font-display mb-2 sm:mb-3 px-2">
            Видео-поздравление от Деда Мороза
          </h1>
          <p className="text-base sm:text-xl text-[#a8d8ea] px-2">
            Персонализированное видео для вашего ребёнка
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 max-w-6xl mx-auto">
          {/* Видео-превью */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card-festive rounded-2xl sm:rounded-3xl p-4 sm:p-6 overflow-hidden order-2 lg:order-1"
          >
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-[#c41e3a]" />
              Пример готового видео
            </h2>

            <div
              className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 cursor-pointer"
              onMouseEnter={handleVideoHover}
            >
              {shouldLoadVideo && exampleVideoUrl ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  preload="none"
                  key={exampleVideoUrl}
                >
                  <source src={exampleVideoUrl} type="video/mp4" />
                  <source
                    src={exampleVideoUrl.replace('/api/videos/stream/', '/videos/')}
                    type="video/mp4"
                  />
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a3a5c] to-[#0c1929]">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">🎬</span>
                    <p className="text-[#a8d8ea]">Пример готового видео</p>
                    <p className="text-[#a8d8ea]/90 text-sm mt-2">
                      Наведите курсор или кликните для просмотра
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={toggleVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                aria-label={isPlaying ? 'Приостановить видео' : 'Воспроизвести видео'}
              >
                {isPlaying ? (
                  <span className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="w-4 h-12 bg-white rounded mx-1"></span>
                    <span className="w-4 h-12 bg-white rounded mx-1"></span>
                  </span>
                ) : (
                  <Play className="w-16 h-16 text-white" />
                )}
              </button>
            </div>
          </motion.div>

          {/* Информация и заказ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card-festive rounded-2xl sm:rounded-3xl p-4 sm:p-6 order-1 lg:order-2"
          >
            {/* Цена */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-white/10 gap-4">
              <div>
                <p className="text-[#a8d8ea]/90 text-xs sm:text-sm line-through">
                  Стоимость: 5 Койнов
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-[#0d4f2b]" />
                  <span className="text-2xl sm:text-4xl font-bold text-[#0d4f2b]">БЕСПЛАТНО</span>
                  <span className="text-xs sm:text-sm bg-[#c41e3a] text-white px-2 py-1 rounded-lg">
                    Акция!
                  </span>
                </div>
              </div>
              <motion.button
                onClick={handleOrder}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-magic px-4 sm:px-6 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold text-white flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                Заказать
              </motion.button>
            </div>

            {/* Описание */}
            <div className="space-y-3 sm:space-y-4 text-[#a8d8ea]">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-[#c41e3a]" />
                Что вы получите
              </h3>

              <p className="text-sm sm:text-base leading-relaxed">
                Уникальное видео длиной <strong>2 минуты</strong>, в котором настоящий Дед Мороз
                обратится к вашему ребёнку по имени!
              </p>

              <ul className="space-y-2 sm:space-y-3">
                <li className="flex items-start gap-2 sm:gap-3">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#0d4f2b] mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    Дедушка Мороз назовёт имя вашего ребёнка и поздравит с Новым Годом
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#0d4f2b] mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    Покажет и прокомментирует загруженные вами фотографии
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#0d4f2b] mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    Расскажет про Год Лошади 2026 и пожелает удачи
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#0d4f2b] mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    Видео будет доступно для скачивания в личном кабинете
                  </span>
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3 sm:pt-4 text-xs sm:text-sm text-[#a8d8ea]/90">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  ~2 минуты
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                  HD качество
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />2 ваших фото
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Уведомления */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl max-w-md text-center z-50 mx-4"
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" aria-hidden="true" />
              <p className="text-sm sm:text-base">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Форма заказа (модальное окно) */}
        <AnimatePresence>
          {showOrderForm && (
            <Modal
              isOpen={showOrderForm}
              onClose={() => setShowOrderForm(false)}
              title="Оформление заказа"
              className="max-h-[90vh] flex flex-col"
            >
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2 min-h-0">
                <form onSubmit={handleSubmitOrder} className="space-y-4 sm:space-y-6">
                  {/* Имя ребёнка */}
                  <div>
                    <label className="block text-[#a8d8ea] mb-2 font-semibold text-sm sm:text-base">
                      Имя ребёнка
                    </label>
                    <input
                      type="text"
                      value={formData.childName}
                      onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                      placeholder="Как зовут ребёнка?"
                      required
                      className="input-magic w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-[#f0f8ff] text-base sm:text-lg"
                    />
                  </div>

                  {/* Возраст ребёнка */}
                  <div>
                    <label className="block text-[#a8d8ea] mb-2 font-semibold text-sm sm:text-base">
                      Возраст ребёнка{' '}
                      <span className="text-[#a8d8ea]/90 text-xs sm:text-sm">(необязательно)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={formData.childAge}
                      onChange={(e) => setFormData({ ...formData, childAge: e.target.value || '' })}
                      placeholder="Сколько лет ребёнку?"
                      className="input-magic w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-[#f0f8ff] text-base sm:text-lg"
                    />
                    <p className="text-[#a8d8ea]/90 text-xs sm:text-sm mt-1">
                      Укажите возраст, чтобы Дед Мороз обратился к ребёнку более персонально
                    </p>
                  </div>

                  {/* Фото 1 */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-[#a8d8ea] font-semibold text-sm sm:text-base">
                      Фото №1
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        {formData.photo1Preview ? (
                          <div className="relative aspect-video rounded-xl overflow-hidden">
                            <img
                              src={formData.photo1Preview}
                              alt="Фото 1 - загруженное пользователем изображение"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  photo1: null,
                                  photo1Preview: '',
                                })
                              }
                              className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                              aria-label="Удалить фото 1"
                            >
                              <X className="w-4 h-4 text-white" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <label className="block aspect-video rounded-xl border-2 border-dashed border-[#a8d8ea]/30 hover:border-[#a8d8ea]/60 cursor-pointer transition-colors">
                            <div className="h-full flex flex-col items-center justify-center text-[#a8d8ea]/90">
                              <Upload className="w-8 h-8 mb-2" />
                              <span className="text-sm">Загрузить фото</span>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={(e) => handlePhotoChange(e, 1)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <div>
                        <label className="block text-[#a8d8ea] mb-1 text-sm">
                          Комментарий к фото
                        </label>
                        <textarea
                          value={formData.photo1Comment}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              photo1Comment: e.target.value,
                            })
                          }
                          placeholder="Опишите, что на фото (например: занимается спортом и любит футбол)"
                          rows={3}
                          className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] resize-none"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {COMMENT_SUGGESTIONS.slice(0, 3).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setFormData({ ...formData, photo1Comment: s })}
                              className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[#a8d8ea]"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Фото 2 */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-[#a8d8ea] font-semibold text-sm sm:text-base">
                      Фото №2
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        {formData.photo2Preview ? (
                          <div className="relative aspect-video rounded-xl overflow-hidden">
                            <img
                              src={formData.photo2Preview}
                              alt="Фото 2 - загруженное пользователем изображение"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  photo2: null,
                                  photo2Preview: '',
                                })
                              }
                              className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                              aria-label="Удалить фото 2"
                            >
                              <X className="w-4 h-4 text-white" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <label className="block aspect-video rounded-xl border-2 border-dashed border-[#a8d8ea]/30 hover:border-[#a8d8ea]/60 cursor-pointer transition-colors">
                            <div className="h-full flex flex-col items-center justify-center text-[#a8d8ea]/90">
                              <Upload className="w-8 h-8 mb-2" />
                              <span className="text-sm">Загрузить фото</span>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={(e) => handlePhotoChange(e, 2)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <div>
                        <label className="block text-[#a8d8ea] mb-1 text-sm">
                          Комментарий к фото
                        </label>
                        <textarea
                          value={formData.photo2Comment}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              photo2Comment: e.target.value,
                            })
                          }
                          placeholder="Опишите, что на фото (например: отлично учится в школе)"
                          rows={3}
                          className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] resize-none"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {COMMENT_SUGGESTIONS.slice(3, 6).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setFormData({ ...formData, photo2Comment: s })}
                              className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[#a8d8ea]"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ошибка */}
                  {error && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                      className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200"
                    >
                      ⚠️ {error}
                    </div>
                  )}
                </form>
              </div>

              {/* Итого и кнопка - фиксированные снизу */}
              <div className="flex-shrink-0 pt-3 sm:pt-4 border-t border-white/10 mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                <div className="bg-[#0d4f2b]/20 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[#0d4f2b] text-base sm:text-lg font-bold flex items-center justify-center gap-2">
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                    Это бесплатно! 🎁
                  </p>
                  <p className="text-[#a8d8ea]/60 text-xs sm:text-sm mt-1">
                    Акция на новогодние праздники
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-magic w-full py-4 sm:py-5 rounded-xl text-base sm:text-xl font-bold text-white flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                      <span>Создание видео...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Получить бесплатно</span>
                    </>
                  )}
                </motion.button>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
