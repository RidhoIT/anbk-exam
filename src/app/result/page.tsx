"use client";

// src/app/result/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG, PASSING_GRADE } from "@/lib/constants";
import type { ExamResult, Question } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("examResult");
    if (!raw) {
      router.replace("/");
      return;
    }
    setResult(JSON.parse(raw));
    setLoading(false);
  }, []);

  if (!result || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPass = (result.score ?? 0) >= PASSING_GRADE;
  const wrong = (result.answered ?? 0) - (result.correct_answers ?? 0);
  const config = DEFAULT_CONFIG;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-2xl animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-3 sm:mb-5 shadow-lg ${
              isPass ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {isPass ? (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-1">Ujian Selesai!</h1>
          <p className="text-slate-500 text-xs sm:text-sm">{config.exam_title}</p>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-blue-50 rounded-xl p-2 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">NISN</p>
            <p className="font-bold text-blue-700 font-mono text-xs sm:text-sm">{result.nisn || "-"}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">Nama</p>
            <p className="font-bold text-blue-700 text-xs sm:text-sm truncate">{result.student_name}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">Kelas</p>
            <p className="font-bold text-blue-700 text-xs sm:text-sm">{result.student_class}</p>
          </div>
        </div>

        {/* Score */}
        <div
          className={`rounded-2xl p-6 sm:p-8 text-center mb-4 sm:mb-6 ${
            isPass
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : "bg-gradient-to-r from-red-500 to-orange-500"
          }`}
        >
          <div className="text-white text-5xl sm:text-6xl md:text-7xl font-black mb-1">{(result.score ?? 0).toFixed(1)}</div>
          <div className="text-white/90 font-semibold text-sm sm:text-base">Nilai Akhir</div>
          <div
            className={`inline-block mt-2 sm:mt-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${
              isPass ? "bg-white/20 text-white" : "bg-white/20 text-white"
            }`}
          >
            {isPass ? "✓ LULUS" : "✗ TIDAK LULUS"} (KKM: {PASSING_GRADE})
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: "Dijawab", value: result.answered, color: "text-blue-600" },
            { label: "Benar", value: result.correct_answers, color: "text-emerald-600" },
            { label: "Salah", value: wrong, color: "text-red-500" },
            { label: "Kosong", value: result.total_questions - result.answered, color: "text-slate-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-2 sm:p-3 text-center">
              <div className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Violations */}
        {result.violations > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-3 sm:p-4 mb-4">
            <p className="text-xs sm:text-sm text-amber-800">
              ⚠️ Total Pelanggaran: <strong>{result.violations} kali</strong>
            </p>
          </div>
        )}

        <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm font-semibold text-emerald-800">
            ✓ Hasil ujian telah tersimpan ke database
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2 sm:space-y-3">
          <button
            onClick={() => {
              sessionStorage.removeItem("examResult");
              router.replace("/");
            }}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 sm:py-3.5 rounded-xl transition-all text-sm sm:text-base"
          >
            ← KEMBALI KE DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
