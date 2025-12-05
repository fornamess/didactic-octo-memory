"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Loader } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

export default function ContactsPage() {
  const [contactsText, setContactsText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/contacts")
      .then((res) => res.json())
      .then((data) => {
        if (data.contacts_text) {
          setContactsText(data.contacts_text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <Loader className="w-12 h-12 text-[#ffd700] animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Хедер */}
      <header className="bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[#a8d8ea] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#ffd700]" />
            <h1 className="text-xl font-bold text-white">Контакты</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-festive rounded-3xl p-6"
        >
          <div
            className="prose prose-invert max-w-none text-[#f0f8ff]"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(contactsText || "<p>Контактная информация будет добавлена в ближайшее время.</p>", {
                ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                ALLOW_DATA_ATTR: false
              })
            }}
          />
        </motion.div>
      </div>
    </main>
  );
}
