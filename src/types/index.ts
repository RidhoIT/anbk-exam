// src/types/index.ts

export interface Question {
  id?: string;
  content: string;
  image_url?: string | null;
  options: string[];
  answer: string; // "A" | "B" | "C" | "D" | "E"
  difficulty: "REGULER" | "HOTS";
  sort_order?: number;
}

export interface ExamResult {
  id?: string;
  nisn?: string;
  student_name: string;
  student_class: string;
  exam_title: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  answered: number;
  violations: number;
  answers: Record<number, string>; // { 0: "A", 1: "C", ... }
  time_taken: number; // seconds
  submitted_at?: string;
}

export interface ExamState {
  nisn: string;
  studentName: string;
  studentClass: string;
  currentQuestion: number;
  answers: Record<number, string>;
  doubtful: number[];
  timeLeft: number;
  violations: number;
  startedAt?: string;
}

export interface ExamConfig {
  exam_title: string;
  subject: string;
  academic_year: string;
  duration_minutes: number;
  max_violations: number;
  warning_countdown: number;
}

export type PageState =
  | "start"
  | "exam"
  | "warning"
  | "submitting"
  | "result"
  | "answerKey"
  | "admin";

export type AdminTab = "questions" | "results";

export type AnswerStatus = "unanswered" | "answered" | "doubtful";
