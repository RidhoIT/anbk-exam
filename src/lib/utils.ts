// src/lib/utils.ts

import type { ExamState, AnswerStatus } from "@/types";

const STORAGE_KEY = "anbk_exam_state";

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} jam ${m} menit ${s} detik`;
  return `${m} menit ${s} detik`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLong(isoString: string): string {
  return new Date(isoString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAnswerStatus(
  questionIndex: number,
  answers: Record<number, string>,
  doubtful: number[]
): AnswerStatus {
  if (doubtful.includes(questionIndex)) return "doubtful";
  if (answers[questionIndex]) return "answered";
  return "unanswered";
}

export function calculateScore(
  answers: Record<number, string>,
  correctAnswers: string[]
): number {
  let correct = 0;
  correctAnswers.forEach((ans, idx) => {
    if (answers[idx] === ans) correct++;
  });
  return (correct / correctAnswers.length) * 100;
}

export function saveExamState(state: ExamState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        doubtful: state.doubtful,
      })
    );
  } catch (e) {
    console.error("Failed to save exam state:", e);
  }
}

export function loadExamState(): ExamState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      ...data,
      doubtful: data.doubtful || [],
    };
  } catch {
    return null;
  }
}

export function clearExamState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear exam state:", e);
  }
}

export function hasOngoingExam(): boolean {
  const state = loadExamState();
  return !!(state?.nisn && state?.studentName && state?.studentClass && state?.timeLeft > 0);
}

export function exportToCSV(
  results: Array<{
    nisn?: string;
    student_name: string;
    student_class: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    violations: number;
    submitted_at: string;
  }>,
  filename: string
): void {
  const headers = [
    "No.",
    "NISN",
    "Nama Peserta",
    "Kelas",
    "Nilai",
    "Benar",
    "Total",
    "Status",
    "Pelanggaran",
    "Waktu Selesai",
  ];

  const rows = results.map((r, i) => [
    i + 1,
    `"${r.nisn || "-"}"`,
    `"${r.student_name}"`,
    `"${r.student_class}"`,
    r.score.toFixed(1),
    r.correct_answers,
    r.total_questions,
    r.score >= 70 ? "LULUS" : "TIDAK LULUS",
    r.violations || 0,
    `"${formatDate(r.submitted_at)}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
