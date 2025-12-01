"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  const [agreementText, setAgreementText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/agreement")
      .then((res) => res.json())
      .then((data) => {
        setAgreementText(data.text || "Текст соглашения не найден");
        setLoading(false);
      })
      .catch(() => {
        setAgreementText("Ошибка загрузки соглашения");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840] py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-festive rounded-3xl p-8 md:p-10"
        >
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/login"
              className="text-[#a8d8ea] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#ffd700]" />
              <h1 className="text-2xl md:text-3xl font-bold text-gradient font-display">
                Условия использования
              </h1>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-[#a8d8ea]/60 py-10">
              Загрузка...
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="text-[#a8d8ea]/90 whitespace-pre-wrap leading-relaxed">
                {agreementText}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <Link
              href="/login"
              className="btn-magic px-6 py-3 rounded-xl text-white inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Вернуться к регистрации
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
