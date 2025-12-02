export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#ffd700]/30 border-t-[#ffd700] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#a8d8ea] text-lg">Загрузка...</p>
      </div>
    </div>
  );
}
