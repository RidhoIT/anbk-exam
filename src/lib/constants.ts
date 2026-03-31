// src/lib/constants.ts

import type { ExamConfig } from "@/types";

export const ADMIN_PASSWORD = "112233";
export const PASSING_GRADE = 70;

export const DEFAULT_CONFIG: ExamConfig = {
  // exam_title: "ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII",
  exam_title: "PENILAIAN SUMATIF AKHIR JENJANG",
  subject: "MATA PELAJARAN INFORMATIKA",
  academic_year: "TAHUN PELAJARAN 2025/2026",
  duration_minutes: 90,
  max_violations: 3,
  warning_countdown: 10,
};

// Questions are now loaded from Supabase database
// See: /api/questions endpoint
