"use client";

// src/app/exam/page.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG } from "@/lib/constants";
import {
  loadExamState,
  saveExamState,
  clearExamState,
  formatTime,
  getAnswerStatus,
} from "@/lib/utils";
import type { ExamResult, Question } from "@/types";

export default function ExamPage() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningCountdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to hold latest values for use in callbacks
  const studentNameRef = useRef("");
  const studentClassRef = useRef("");
  const studentNisnRef = useRef("");
  const answersRef = useRef<Record<number, string>>({});
  const timeLeftRef = useRef(0);
  const violationsRef = useRef(0);
  const questionsRef = useRef<Question[]>([]);

  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentNisn, setStudentNisn] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [doubtful, setDoubtful] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_CONFIG.duration_minutes * 60);
  const [violations, setViolations] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const [page, setPage] = useState<"exam" | "warning" | "submitting">("exam");
  const [warningCountdown, setWarningCountdown] = useState(DEFAULT_CONFIG.warning_countdown);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ref to track if already submitted (prevents duplicate submissions)
  const hasSubmittedRef = useRef(false);
  // Ref to prevent multiple violation triggers at once
  const isHandlingViolationRef = useRef(false);

  // Confirm submit dialog
  const [showConfirm, setShowConfirm] = useState(false);

  const config = DEFAULT_CONFIG;

  // Load state from localStorage
  useEffect(() => {
    const state = loadExamState();
    if (!state || !state.studentName) {
      router.replace("/");
      return;
    }
    setStudentNisn(state.nisn || "");
    studentNisnRef.current = state.nisn || "";
    setStudentName(state.studentName);
    studentNameRef.current = state.studentName;
    setStudentClass(state.studentClass);
    studentClassRef.current = state.studentClass;
    setCurrentQuestion(state.currentQuestion || 0);
    setAnswers(state.answers || {});
    answersRef.current = state.answers || {};
    setDoubtful(state.doubtful || []);
    setTimeLeft(state.timeLeft || config.duration_minutes * 60);
    timeLeftRef.current = state.timeLeft || config.duration_minutes * 60;
    setViolations(state.violations || 0);
    violationsRef.current = state.violations || 0;
  }, []);

  // Fetch questions from database
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/questions");
        const json = await res.json();
        if (json.data) {
          setQuestions(json.data);
          questionsRef.current = json.data;
        }
      } catch (e) {
        console.error("Failed to fetch questions:", e);
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchQuestions();
  }, []);

  // Redirect if questions failed to load
  useEffect(() => {
    if (!loadingQuestions && questions.length === 0 && studentName) {
      console.error("No questions loaded, redirecting to home");
      router.replace("/");
    }
  }, [loadingQuestions, questions.length, studentName, router]);

  // Save state on changes
  const saveState = useCallback(() => {
    if (!studentName) return;
    saveExamState({
      nisn: studentNisn,
      studentName,
      studentClass,
      currentQuestion,
      answers,
      doubtful,
      timeLeft,
      violations,
    });
  }, [studentNisn, studentName, studentClass, currentQuestion, answers, doubtful, timeLeft, violations]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  // Keep refs updated when state changes
  useEffect(() => {
    studentNameRef.current = studentName;
    studentClassRef.current = studentClass;
    studentNisnRef.current = studentNisn;
    answersRef.current = answers;
    timeLeftRef.current = timeLeft;
    violationsRef.current = violations;
    questionsRef.current = questions;
  }, [studentName, studentClass, studentNisn, answers, timeLeft, violations, questions]);

  // Timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (page === "exam" && studentName) {
      startTimer();
    }
    return () => {
      // Only stop main timer, not warning timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [page, studentName]);

  // Anti-cheat
  const triggerViolation = useCallback(() => {
    // Prevent multiple violation triggers at once
    if (isHandlingViolationRef.current) {
      console.log("Already handling violation, ignoring");
      return;
    }
    
    isHandlingViolationRef.current = true;
    
    setViolations((prev) => {
      const newViolations = prev + 1;
      
      // Update the ref immediately to ensure latest value is captured
      violationsRef.current = newViolations;
      console.log(`Violation triggered! Count: ${newViolations}/${config.max_violations}`);
      
      if (newViolations >= config.max_violations) {
        console.log(`Max violations reached (${newViolations}). Submitting...`);
        // Clear all timers before submitting
        stopTimer();
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (warningCountdownRef.current) clearInterval(warningCountdownRef.current);
        // Don't reset isHandlingViolationRef here - it will be reset after navigation
        // Pass violations directly to handleSubmit to ensure correct value
        handleSubmit(true, newViolations);
        return newViolations;
      }
      setPage("warning");
      setWarningCountdown(config.warning_countdown);

      console.log(`Warning page set, countdown will start from ${config.warning_countdown}`);

      return newViolations;
    });
  }, [config.max_violations, config.warning_countdown]);

  // Warning countdown effect - runs only when on warning page
  useEffect(() => {
    if (page !== "warning") return;

    console.log(`Warning page mounted, starting countdown from ${warningCountdown}`);

    const countdownInterval = setInterval(() => {
      setWarningCountdown((prev) => {
        const next = prev - 1;
        console.log(`Countdown tick: ${prev} → ${next}`);
        return next;
      });
    }, 1000);

    return () => {
      console.log("Cleaning up countdown interval");
      clearInterval(countdownInterval);
    };
  }, [page]);

  // Auto-submit when countdown reaches 0
  useEffect(() => {
    if (page !== "warning") return;
    if (warningCountdown <= 0) {
      console.log(`Countdown reached 0, submitting...`);
      isHandlingViolationRef.current = false;
      handleSubmit(true, violations);
    }
  }, [warningCountdown, page]);

  useEffect(() => {
    if (!studentName) return;

    const onVisibilityChange = () => {
      if (document.hidden && page === "exam") {
        console.log("Visibility change detected - tab hidden");
        triggerViolation();
      }
    };

    const onBlur = () => {
      if (page === "exam") {
        console.log("Blur event detected - window lost focus");
        triggerViolation();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [page, studentName, triggerViolation]);

  function returnToExam() {
    isHandlingViolationRef.current = false;
    setWarningCountdown(config.warning_countdown);
    setPage("exam");
    startTimer();
  }

  async function handleSubmit(forced = false, explicitViolations?: number) {
    // Prevent multiple submissions - check ref first (most reliable)
    if (hasSubmittedRef.current) {
      console.log("Already submitted, ignoring duplicate call");
      return;
    }

    // Also check state as secondary guard
    if (isSubmitting) {
      console.log("Already submitting, ignoring duplicate call");
      return;
    }

    // Set both guards immediately
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    stopTimer();
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (warningCountdownRef.current) clearInterval(warningCountdownRef.current);

    // Use refs to get the latest values
    const currentStudentName = studentNameRef.current;
    const currentStudentClass = studentClassRef.current;
    const currentStudentNisn = studentNisnRef.current;
    const currentAnswers = answersRef.current;
    const currentTimeLeft = timeLeftRef.current;
    // Use explicit violations if provided, otherwise use ref
    const currentViolations = explicitViolations !== undefined ? explicitViolations : violationsRef.current;
    const currentQuestions = questionsRef.current;

    console.log("handleSubmit called. Violations:", currentViolations, explicitViolations !== undefined ? "(explicit)" : "(from ref)");

    // Validate student data before submitting
    if (!currentStudentName || !currentStudentClass) {
      console.error("Cannot submit: Missing student data", {
        studentName: currentStudentName,
        studentClass: currentStudentClass,
      });
      // Try to recover from localStorage
      const state = loadExamState();
      if (state?.studentName && state?.studentClass) {
        studentNameRef.current = state.studentName;
        studentClassRef.current = state.studentClass;
        studentNisnRef.current = state.nisn || "";
      } else {
        // Cannot recover, redirect to home
        hasSubmittedRef.current = false;
        setIsSubmitting(false);
        router.replace("/");
        return;
      }
    }

    setPage("submitting");

    // Calculate score
    let correct = 0;
    currentQuestions.forEach((q, i) => {
      if (currentAnswers[i] === q.answer) correct++;
    });
    const score = currentQuestions.length > 0 ? (correct / currentQuestions.length) * 100 : 0;
    const answered = Object.keys(currentAnswers).length;
    const timeTaken = config.duration_minutes * 60 - currentTimeLeft;

    const result: ExamResult = {
      nisn: studentNisnRef.current,
      student_name: studentNameRef.current,
      student_class: studentClassRef.current,
      exam_title: config.exam_title,
      score: parseFloat(score.toFixed(2)),
      correct_answers: correct,
      total_questions: currentQuestions.length,
      answered,
      violations: currentViolations,
      answers: currentAnswers,
      time_taken: timeTaken,
    };

    console.log("=== SUBMITTING EXAM ===");
    console.log("Violations:", currentViolations);
    console.log("Result:", result);

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Submit error:", errorData);
      } else {
        console.log("Exam submitted successfully");
      }
    } catch (e) {
      console.error("Failed to submit:", e);
    } finally {
      // Keep hasSubmittedRef as true to prevent any future submissions
      // Only reset isSubmitting state
      setIsSubmitting(false);
    }

    // Save result for result page
    sessionStorage.setItem("examResult", JSON.stringify(result));
    clearExamState();
    router.replace("/result");
  }

  function selectAnswer(letter: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: letter }));
  }

  function toggleDoubtful() {
    setDoubtful((prev) =>
      prev.includes(currentQuestion)
        ? prev.filter((i) => i !== currentQuestion)
        : [...prev, currentQuestion]
    );
  }

  const answeredCount = Object.keys(answers).length;
  const unanswered = questions.length - answeredCount;
  const question = questions[currentQuestion];

  // Show loading state while fetching questions
  if (loadingQuestions) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center animate-fadeIn w-full max-w-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 sm:mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Memuat Soal...</h2>
          <p className="text-slate-500 text-sm">Soal ujian sedang dimuat dari database</p>
        </div>
      </div>
    );
  }

  // ── WARNING PAGE ──────────────────────────────────────────────────
  if (page === "warning") {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center p-4 sm:p-6 animate-warningPulse"
        style={{ backgroundColor: "#dc2626" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 max-w-lg w-full text-center animate-fadeIn mx-4">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-red-600 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-600 mb-2">⚠️ PERINGATAN!</h1>
          <p className="text-base sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">JANGAN PINDAH TAB!</p>

          <div className="mb-4 sm:mb-6">
            <div
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-red-600 leading-none animate-countdownBounce"
              style={{ textShadow: "0 0 20px rgba(220,38,38,0.4)" }}
            >
              {warningCountdown}
            </div>
            <p className="text-slate-600 text-sm sm:text-base mt-2">detik untuk kembali</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="font-bold text-slate-800 text-sm sm:text-base">
              Pelanggaran ke-{violations} dari {config.max_violations}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {violations >= config.max_violations - 1
                ? "PERINGATAN TERAKHIR! Pelanggaran lagi = langsung submit!"
                : `Sisa ${config.max_violations - violations} pelanggaran lagi`}
            </p>
          </div>

          <button
            onClick={returnToExam}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 sm:py-4 rounded-xl transition-all transform hover:scale-[1.02] text-base sm:text-lg shadow-lg"
          >
            KEMBALI KE UJIAN
          </button>

          <p className="text-xs text-slate-500 mt-3 sm:mt-4">
            Jika tidak klik tombol dalam {config.warning_countdown} detik, ujian otomatis disubmit
          </p>
        </div>
      </div>
    );
  }

  // ── SUBMITTING PAGE ───────────────────────────────────────────────
  if (page === "submitting") {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center animate-fadeIn w-full max-w-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 sm:mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Menyimpan Hasil...</h2>
          <p className="text-slate-500 text-sm">Data ujian sedang disimpan ke database</p>
        </div>
      </div>
    );
  }

  // ── EXAM PAGE ─────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-blue-700 shadow-md px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex justify-between items-center flex-shrink-0">
        <div className="text-white min-w-0 flex-1">
          <h2 className="font-bold text-xs sm:text-sm truncate">{config.exam_title}</h2>
          <p className="text-blue-200 text-[10px] sm:text-xs mt-0.5 truncate hidden sm:block">
            {studentName} {studentNisn && `(${studentNisn})`} — {studentClass}
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-3 sm:ml-4">
          <p className="text-blue-200 text-[10px] sm:text-xs mb-0.5">Sisa Waktu</p>
          <p
            className={`font-mono font-bold text-lg sm:text-xl ${
              timeLeft <= 300 ? "text-red-300 animate-countdownBounce" : "text-white"
            }`}
          >
            {formatTime(timeLeft)}
          </p>
          <p className="text-blue-200 text-[10px] sm:text-xs mt-0.5">
            Pelanggaran: {violations}/{config.max_violations}
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hidden on mobile, shown on md+ */}
        <div className="hidden md:block w-56 bg-white border-r border-slate-200 p-3 sm:p-4 overflow-y-auto flex-shrink-0">
          {/* Legend */}
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 mb-2">Status Jawaban</p>
            {[
              { color: "bg-blue-700", label: `Dijawab: ${answeredCount}` },
              { color: "bg-slate-200", label: `Belum: ${unanswered}` },
              { color: "bg-red-500", label: `Ragu: ${doubtful.length}` },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
                <div className={`w-4 h-4 rounded ${color}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-600 mb-2">Nomor Soal</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_, idx) => {
                const status = getAnswerStatus(idx, answers, doubtful);
                const isActive = idx === currentQuestion;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`sidebar-num w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-all
                      ${isActive ? "ring-2 ring-offset-1 ring-blue-400" : ""}
                      ${status === "answered" ? "bg-blue-700 text-white" : ""}
                      ${status === "doubtful" ? "bg-red-500 text-white" : ""}
                      ${status === "unanswered" ? "bg-slate-200 text-slate-600" : ""}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Mobile question navigator */}
          <div className="md:hidden bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Soal {currentQuestion + 1}/{questions.length}</span>
              <span className="text-xs text-slate-500">{answeredCount} dijawab</span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {questions.map((_, idx) => {
                const status = getAnswerStatus(idx, answers, doubtful);
                const isActive = idx === currentQuestion;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`flex-shrink-0 w-8 h-8 rounded text-xs font-bold transition-all
                      ${isActive ? "ring-2 ring-offset-1 ring-blue-400" : ""}
                      ${status === "answered" ? "bg-blue-700 text-white" : ""}
                      ${status === "doubtful" ? "bg-red-500 text-white" : ""}
                      ${status === "unanswered" ? "bg-slate-200 text-slate-600" : ""}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8 mb-4 animate-fadeIn">
              {/* Question header */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                    question.difficulty === "HOTS" ? "bg-red-500" : "bg-blue-500"
                  }`}
                >
                  {question.difficulty}
                </span>
                <span className="font-bold text-slate-700">
                  Soal {currentQuestion + 1} dari {questions.length}
                </span>
              </div>

              {/* Question content */}
              <p className="text-slate-800 text-base leading-relaxed mb-5">
                {question.content}
              </p>

              {question.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={question.image_url}
                  alt="Gambar soal"
                  className="mb-5 rounded-xl max-w-full border border-slate-200 shadow-sm"
                  loading="lazy"
                />
              )}

              {/* Options */}
              <div className="space-y-2.5">
                {question.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = answers[currentQuestion] === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => selectAnswer(letter)}
                      className={`option-btn w-full text-left px-5 py-3.5 rounded-xl border-2 transition-all
                        ${isSelected
                          ? "border-blue-600 bg-blue-50 shadow-sm"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                    >
                      <span className="font-bold text-blue-600 mr-3">{letter}.</span>
                      <span className="text-slate-700">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Doubtful */}
              <label className="flex items-center gap-2 mt-5 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={doubtful.includes(currentQuestion)}
                  onChange={toggleDoubtful}
                  className="w-4 h-4 accent-red-500 rounded"
                />
                <span className="text-sm font-semibold text-slate-600">
                  Tandai Ragu-ragu
                </span>
              </label>
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                disabled={currentQuestion === 0}
                className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 bg-white border-2 border-slate-200 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Sebelumnya
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex-1 px-3 sm:px-7 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md text-xs sm:text-sm"
                >
                  SELESAI
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
                  className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all text-xs sm:text-sm"
                >
                  Selanjutnya →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fadeIn mx-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-3">Konfirmasi Submit</h3>
            {unanswered > 0 && (
              <p className="text-slate-600 text-sm mb-2">
                Anda masih memiliki <strong className="text-red-600">{unanswered} soal</strong> yang belum dijawab.
              </p>
            )}
            <p className="text-slate-600 text-sm sm:text-base mb-6">Apakah Anda yakin ingin menyelesaikan ujian?</p>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 font-semibold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit(); }}
                className="flex-1 py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors text-xs sm:text-sm"
              >
                Ya, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
