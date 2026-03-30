"use client";

// src/app/result/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG, PASSING_GRADE } from "@/lib/constants";
import type { ExamResult, Question } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("examResult");
    if (!raw) {
      router.replace("/");
      return;
    }
    setResult(JSON.parse(raw));
  }, []);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/questions");
        const json = await res.json();
        if (json.data) {
          setQuestions(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch questions:", e);
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchQuestions();
  }, []);

  if (!result) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadingQuestions) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPass = (result.score ?? 0) >= PASSING_GRADE;
  const wrong = (result.answered ?? 0) - (result.correct_answers ?? 0);
  const config = DEFAULT_CONFIG;

  if (showAnswerKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800">🔑 Kunci Jawaban</h1>
              <button
                onClick={() => setShowAnswerKey(false)}
                className="px-5 py-2 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
              >
                ← Kembali
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const userAnswer = result.answers[idx];
                const isCorrect = userAnswer === q.answer;
                return (
                  <div
                    key={q.id || idx}
                    className={`p-5 rounded-xl border-2 animate-fadeIn ${
                      isCorrect
                        ? "border-emerald-400"
                        : userAnswer
                        ? "border-red-400"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-bold text-blue-700">Soal {idx + 1}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                          q.difficulty === "HOTS" ? "bg-red-500" : "bg-blue-500"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {isCorrect ? (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500 text-white">✓ BENAR</span>
                      ) : userAnswer ? (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white">✗ SALAH</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-400 text-white">- TIDAK DIJAWAB</span>
                      )}
                    </div>

                    <p className="text-slate-700 mb-3 text-sm">{q.content}</p>

                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isAnswer = letter === q.answer;
                        const isUser = letter === userAnswer;
                        return (
                          <div
                            key={letter}
                            className={`p-2.5 rounded-lg text-sm ${
                              isAnswer
                                ? "bg-emerald-100 border border-emerald-400"
                                : isUser
                                ? "bg-red-100 border border-red-400"
                                : "bg-slate-50"
                            }`}
                          >
                            <span className="font-semibold mr-1.5">{letter}.</span>
                            {opt}
                            {isAnswer && (
                              <span className="ml-2 text-emerald-600 font-bold">✓ JAWABAN BENAR</span>
                            )}
                            {isUser && !isAnswer && (
                              <span className="ml-2 text-red-600 font-bold">✗ JAWABAN ANDA</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-4 mt-3 text-xs text-slate-500">
                      <span>Jawaban Anda: <strong>{userAnswer || "Tidak dijawab"}</strong></span>
                      <span>Kunci: <strong className="text-emerald-600">{q.answer}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-lg ${
              isPass ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {isPass ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Ujian Selesai!</h1>
          <p className="text-slate-500 text-sm">{config.exam_title}</p>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">NISN</p>
            <p className="font-bold text-blue-700 font-mono">{result.nisn || "-"}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Nama</p>
            <p className="font-bold text-blue-700">{result.student_name}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Kelas</p>
            <p className="font-bold text-blue-700">{result.student_class}</p>
          </div>
        </div>

        {/* Score */}
        <div
          className={`rounded-2xl p-8 text-center mb-6 ${
            isPass
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : "bg-gradient-to-r from-red-500 to-orange-500"
          }`}
        >
          <div className="text-white text-7xl font-black mb-1">{(result.score ?? 0).toFixed(1)}</div>
          <div className="text-white/90 font-semibold">Nilai Akhir</div>
          <div
            className={`inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-bold ${
              isPass ? "bg-white/20 text-white" : "bg-white/20 text-white"
            }`}
          >
            {isPass ? "✓ LULUS" : "✗ TIDAK LULUS"} (KKM: {PASSING_GRADE})
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Dijawab", value: result.answered, color: "text-blue-600" },
            { label: "Benar", value: result.correct_answers, color: "text-emerald-600" },
            { label: "Salah", value: wrong, color: "text-red-500" },
            { label: "Kosong", value: result.total_questions - result.answered, color: "text-slate-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Violations */}
        {result.violations > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-4 mb-4">
            <p className="text-sm text-amber-800">
              ⚠️ Total Pelanggaran: <strong>{result.violations} kali</strong>
            </p>
          </div>
        )}

        <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-xl p-4 mb-6">
          <p className="text-sm font-semibold text-emerald-800">
            ✓ Hasil ujian telah tersimpan ke database
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              sessionStorage.removeItem("examResult");
              router.replace("/");
            }}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all"
          >
            ← KEMBALI KE DASHBOARD
          </button>
          <button
            onClick={() => setShowAnswerKey(true)}
            className="w-full border-2 border-blue-700 text-blue-700 font-bold py-3.5 rounded-xl hover:bg-blue-50 transition-all"
          >
            📋 LIHAT KUNCI JAWABAN
          </button>
        </div>
      </div>
    </div>
  );
}
