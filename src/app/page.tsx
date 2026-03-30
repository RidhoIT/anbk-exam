"use client";

// src/app/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG, ADMIN_PASSWORD } from "@/lib/constants";
import { hasOngoingExam, loadExamState, saveExamState, clearExamState } from "@/lib/utils";

export default function StartPage() {
  const router = useRouter();
  const [nisn, setNisn] = useState("");
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasOngoing, setHasOngoing] = useState(false);

  // Admin login modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  // Alert modal
  const [alertMsg, setAlertMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const config = DEFAULT_CONFIG;

  useEffect(() => {
    setHasOngoing(hasOngoingExam());
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!nisn.trim() || !name.trim() || !cls.trim()) return;

    // Validate NISN (should be numeric and 10-12 digits)
    const nisnRegex = /^\d{10,12}$/;
    if (!nisnRegex.test(nisn.trim())) {
      setError("NISN harus terdiri dari 10-12 angka");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check ongoing exam for different student
      const saved = loadExamState();
      if (
        saved?.studentName &&
        saved?.studentClass &&
        (saved.studentName !== name.trim() ||
          saved.studentClass !== cls.trim())
      ) {
        setAlertMsg(
          `Masih ada ujian aktif atas nama <strong>${saved.studentName}</strong> - <strong>${saved.studentClass}</strong>.<br/>Selesaikan ujian tersebut terlebih dahulu.`
        );
        setShowAlert(true);
        setLoading(false);
        return;
      }

      // Check one-attempt policy (by NISN or name+class)
      const res = await fetch(
        `/api/results/check?nisn=${encodeURIComponent(nisn.trim())}&name=${encodeURIComponent(name.trim())}&class=${encodeURIComponent(cls.trim())}`
      );
      const json = await res.json();

      if (json.exists) {
        setAlertMsg(
          `<strong>${name.trim()}</strong> (NISN: ${nisn.trim()}) sudah mengikuti ujian ini.<br/><br/>Setiap peserta hanya diperbolehkan mengikuti ujian <strong>1 kali</strong>.`
        );
        setShowAlert(true);
        setLoading(false);
        return;
      }

      // Initialize exam state
      saveExamState({
        nisn: nisn.trim(),
        studentName: name.trim(),
        studentClass: cls.trim(),
        currentQuestion: 0,
        answers: {},
        doubtful: [],
        timeLeft: config.duration_minutes * 60,
        violations: 0,
        startedAt: new Date().toISOString(),
      });

      router.push("/exam");
    } catch (err) {
      setError("Gagal memulai ujian. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    router.push("/exam");
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setShowAdminModal(false);
      setAdminPassword("");
      router.push("/admin");
    } else {
      setAdminError("Password salah! Coba lagi.");
      setAdminPassword("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-700 mb-5 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 leading-tight mb-1">
            {config.exam_title}
          </h1>
          <p className="text-blue-600 font-semibold text-sm mb-0.5">{config.subject}</p>
          <p className="text-slate-500 text-sm">{config.academic_year}</p>

          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{config.duration_minutes} menit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>50 soal</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              NISN
            </label>
            <input
              type="text"
              value={nisn}
              onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
              required
              maxLength={12}
              placeholder="Masukkan NISN"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-slate-800 placeholder:text-slate-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Masukkan nama lengkap Anda"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Kelas
            </label>
            <input
              type="text"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              required
              placeholder="Contoh: XII IPA 1"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Warning box */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">⚠️ PERHATIAN ANTI-CHEATING</p>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  <li>• DILARANG pindah tab atau minimize browser</li>
                  <li>• Pelanggaran maksimal: <strong>3 kali</strong></li>
                  <li>• Peringatan countdown <strong>10 detik</strong>, lalu auto submit</li>
                  <li>• Lebih dari 3 pelanggaran: <strong>LANGSUNG SUBMIT</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memeriksa...
              </span>
            ) : (
              "MULAI UJIAN"
            )}
          </button>

          {hasOngoing && (
            <button
              type="button"
              onClick={handleContinue}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.01] shadow-md"
            >
              ▶️ LANJUTKAN UJIAN
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="w-full text-slate-500 font-semibold py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            🔐 Akses Guru
          </button>
        </form>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fadeIn">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-red-600 mb-3">⚠️ Akses Ditolak</h3>
              <p className="text-slate-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: alertMsg }} />
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">🔐 Login Guru</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Masukkan password untuk akses panel guru</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                placeholder="Password guru"
                autoFocus
                className={`w-full px-4 py-3 border-2 rounded-xl transition-colors ${adminError ? "border-red-400" : "border-slate-200 focus:border-blue-500"}`}
              />
              {adminError && (
                <p className="text-sm text-red-600">{adminError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAdminModal(false); setAdminPassword(""); setAdminError(""); }}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition-colors"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
