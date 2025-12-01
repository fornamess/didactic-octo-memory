"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Snowflake {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  symbol: string;
  drift: number;
}

const snowSymbols = ["❄", "❅", "❆", "✻", "✼", "❉"];

// Функция для генерации детерминированного псевдослучайного числа
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export default function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const flakes: Snowflake[] = [];
    for (let i = 0; i < 40; i++) {
      const seed = i + 1;
      flakes.push({
        id: i,
        x: seededRandom(seed * 1) * 100,
        size: seededRandom(seed * 2) * 1.2 + 0.5,
        duration: seededRandom(seed * 3) * 10 + 10,
        delay: seededRandom(seed * 4) * 10,
        opacity: seededRandom(seed * 5) * 0.5 + 0.3,
        symbol: snowSymbols[Math.floor(seededRandom(seed * 6) * snowSymbols.length)],
        drift: (seededRandom(seed * 7) - 0.5) * 15,
      });
    }
    setSnowflakes(flakes);
  }, []);

  // Не рендерим на сервере
  if (!isClient) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="snowflake"
          initial={{
            x: `${flake.x}vw`,
            y: "-5vh",
            rotate: 0
          }}
          animate={{
            y: "105vh",
            rotate: 360,
            x: [
              `${flake.x}vw`,
              `${flake.x + flake.drift}vw`,
              `${flake.x}vw`,
            ]
          }}
          transition={{
            duration: flake.duration,
            repeat: Infinity,
            delay: flake.delay,
            ease: "linear",
            x: {
              duration: flake.duration / 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          style={{
            fontSize: `${flake.size}rem`,
            opacity: flake.opacity,
          }}
        >
          {flake.symbol}
        </motion.div>
      ))}
    </div>
  );
}
