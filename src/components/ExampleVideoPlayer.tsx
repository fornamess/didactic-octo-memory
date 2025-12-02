'use client';

import { useEffect, useRef, useState } from 'react';

export default function ExampleVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем случайное видео при монтировании (не блокируем рендеринг)
  useEffect(() => {
    // Небольшая задержка для приоритизации критического контента
    const timer = setTimeout(() => {
      const loadRandomVideo = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/videos/example/random');
          const data = await response.json();
          if (data.success && data.videoUrl) {
            setVideoUrl(data.videoUrl);
          } else {
            setVideoUrl('/api/videos/stream/final/final_2.mp4');
          }
        } catch (error) {
          console.error('Error loading random example video:', error);
          setVideoUrl('/api/videos/stream/final/final_2.mp4');
        } finally {
          setIsLoading(false);
        }
      };

      loadRandomVideo();
    }, 100); // Небольшая задержка для приоритизации критического контента

    return () => clearTimeout(timer);
  }, []);

  const handleVideoLoaded = () => {
    setShowPlaceholder(false);
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setShowPlaceholder(true);
    setIsLoading(false);
    if (videoUrl !== '/api/videos/stream/final/final_2.mp4') {
      setVideoUrl('/api/videos/stream/final/final_2.mp4');
    }
  };

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
      {/* Видео */}
      {videoUrl && !isLoading && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          style={{ display: showPlaceholder ? 'none' : 'block' }}
          key={videoUrl}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace('/api/videos/stream/', '/videos/')} type="video/mp4" />
        </video>
      )}

      {/* Заглушка если видео не загрузилось или загружается */}
      {(showPlaceholder || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a3a5c] to-[#0c1929]">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🎬</span>
            <p className="text-[#a8d8ea]">Пример готового видео</p>
            <p className="text-[#a8d8ea]/60 text-sm mt-2">
              {isLoading ? 'Загрузка...' : 'Персонализированное видео от Деда Мороза'}
            </p>
          </div>
        </div>
      )}

      {/* Градиент поверх видео */}
      {!showPlaceholder && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <p className="text-white text-sm font-semibold drop-shadow-lg">Пример готового видео</p>
          </div>
        </>
      )}
    </div>
  );
}
