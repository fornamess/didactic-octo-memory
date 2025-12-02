'use client';

import { useEffect, useRef, useState } from 'react';

export default function ExampleVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Загружаем видео только когда пользователь взаимодействует или элемент виден
  useEffect(() => {
    if (!shouldLoad) return;

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
  }, [shouldLoad]);

  // Intersection Observer - загружаем когда элемент попадает в viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            // Загружаем с небольшой задержкой после попадания в viewport
            setTimeout(() => {
              setShouldLoad(true);
            }, 500);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Начинаем загрузку за 100px до появления
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  // Загружаем при hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  };

  const handleClick = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

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
    <div
      ref={containerRef}
      className="relative aspect-video rounded-2xl overflow-hidden bg-black group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      {/* Видео - загружается только при взаимодействии */}
      {videoUrl && shouldLoad && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay={isHovered}
          loop
          muted
          playsInline
          preload="none"
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          style={{ display: showPlaceholder ? 'none' : 'block' }}
          key={videoUrl}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace('/api/videos/stream/', '/videos/')} type="video/mp4" />
        </video>
      )}

      {/* Заглушка */}
      {(showPlaceholder || isLoading || !shouldLoad) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a3a5c] to-[#0c1929] transition-opacity hover:opacity-90">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🎬</span>
            <p className="text-[#a8d8ea]">Пример готового видео</p>
            <p className="text-[#a8d8ea]/60 text-sm mt-2">
              {isLoading
                ? 'Загрузка...'
                : !shouldLoad
                ? 'Наведите курсор или кликните для просмотра'
                : 'Персонализированное видео от Деда Мороза'}
            </p>
            {!shouldLoad && (
              <p className="text-[#a8d8ea]/40 text-xs mt-2">💡 Видео загрузится автоматически</p>
            )}
          </div>
        </div>
      )}

      {/* Градиент поверх видео */}
      {!showPlaceholder && videoUrl && (
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
