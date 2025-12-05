// Компонент модального окна пополнения баланса (CQ-004)
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader, X } from 'lucide-react';
import Modal from '@/components/Modal';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  selectedCrypto: string[];
  onCryptoToggle: (crypto: string) => void;
  onTopup: () => void;
  loading: boolean;
}

const CRYPTO_OPTIONS = ['USDT', 'BTC', 'ETH', 'TRX'];

export default function TopupModal({
  isOpen,
  onClose,
  amount,
  onAmountChange,
  selectedCrypto,
  onCryptoToggle,
  onTopup,
  loading,
}: TopupModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Пополнение баланса">
      <div className="space-y-6">
        <div>
          <label className="block text-[#a8d8ea] mb-2 text-sm font-semibold">Сумма пополнения</label>
          <div className="flex gap-2">
            {[10, 25, 50, 100].map((value) => (
              <button
                key={value}
                onClick={() => onAmountChange(value)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  amount === value
                    ? 'bg-[#ffd700] text-black'
                    : 'glass text-[#a8d8ea] hover:bg-white/10'
                }`}
              >
                ${value}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => onAmountChange(parseInt(e.target.value) || 1)}
            className="mt-3 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-[#a8d8ea]/50 focus:outline-none focus:ring-2 focus:ring-[#ffd700]"
            placeholder="Или введите свою сумму"
          />
        </div>

        <div>
          <label className="block text-[#a8d8ea] mb-3 text-sm font-semibold">Криптовалюта</label>
          <div className="flex flex-wrap gap-2">
            {CRYPTO_OPTIONS.map((crypto) => (
              <button
                key={crypto}
                onClick={() => onCryptoToggle(crypto)}
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
          <p className="text-[#a8d8ea]/90 text-xs mt-2">
            Выберите криптовалюты для оплаты (минимум одна)
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-[#a8d8ea]">К оплате</span>
            <span className="text-2xl font-bold text-[#ffd700]">${amount}</span>
          </div>
          <p className="text-[#a8d8ea]/90 text-sm mt-2">
            1 Койн = 1 USD. Оплата: {selectedCrypto.join(', ')}
          </p>
        </div>

        <button
          onClick={onTopup}
          disabled={loading || selectedCrypto.length === 0}
          className="btn-magic w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <Loader className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Coins className="w-6 h-6" />
              Перейти к оплате
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
