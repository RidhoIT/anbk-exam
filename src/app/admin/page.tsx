"use client";

// src/app/admin/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG, PASSING_GRADE } from "@/lib/constants";
import { formatDate, formatDateLong, formatDuration, exportToCSV } from "@/lib/utils";
import type { Question, ExamResult } from "@/types";
import ImportQuestionModal from "@/components/ImportQuestionModal";

type AdminTab = "questions" | "results";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Question editor state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Result detail modal
  const [detailResult, setDetailResult] = useState<ExamResult | null>(null);

  const config = DEFAULT_CONFIG;

  useEffect(() => {
    fetchResults();
    fetchQuestions();
  }, []);

  async function fetchResults() {
    setLoadingResults(true);
    try {
      const res = await fetch("/api/results");
      const json = await res.json();
      if (json.data) setResults(json.data);
    } catch (e) {
      console.error("Failed to fetch results:", e);
    } finally {
      setLoadingResults(false);
    }
  }

  async function fetchQuestions() {
    setLoadingQuestions(true);
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

  async function handleAddQuestion(q: Question) {
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      const json = await res.json();
      if (json.data) {
        setQuestions((prev) => [...prev, json.data]);
        setShowAddModal(false);
      }
    } catch (e) {
      console.error("Failed to add question:", e);
    }
  }

  async function handleImportQuestions(questions: Question[]) {
    try {
      const addedQuestions: Question[] = [];
      
      for (const q of questions) {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        const json = await res.json();
        if (json.data) {
          addedQuestions.push(json.data);
        }
      }
      
      if (addedQuestions.length > 0) {
        setQuestions((prev) => [...prev, ...addedQuestions]);
        setShowImportModal(false);
      }
    } catch (e) {
      console.error("Failed to import questions:", e);
    }
  }

  async function handleUpdateQuestion(q: Question) {
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      const json = await res.json();
      if (json.data) {
        setQuestions((prev) => prev.map((item) => (item.id === q.id ? json.data : item)));
      }
    } catch (e) {
      console.error("Failed to update question:", e);
    }
  }

  async function handleDeleteQuestion(id: string, index: number) {
    try {
      const res = await fetch(`/api/questions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
        setShowDeleteConfirm(null);
      }
    } catch (e) {
      console.error("Failed to delete question:", e);
    }
  }

  function handleExportCSV() {
    const filename = `Rekap_Nilai_${config.exam_title.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.csv`;
    exportToCSV(results as any[], filename);
  }

  const totalResults = results.length;
  const avgScore = totalResults > 0
    ? (results.reduce((s, r) => s + r.score, 0) / totalResults).toFixed(1)
    : "0";
  const passCount = results.filter((r) => r.score >= PASSING_GRADE).length;
  const passRate = totalResults > 0
    ? ((passCount / totalResults) * 100).toFixed(1)
    : "0";

  const sortedResults = [...results].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">👨‍🏫 Panel Guru</h1>
              <p className="text-slate-500 text-sm mt-1">Kelola ujian dan lihat hasil peserta</p>
            </div>
            <button
              onClick={() => router.replace("/")}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
            >
              ← Keluar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
            {(["questions", "results"] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  activeTab === tab
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "questions"
                  ? `📝 Kelola Soal (${questions.length})`
                  : `📊 Rekap Nilai (${results.length})`}
              </button>
            ))}
          </div>

         {/* ── QUESTIONS TAB ── */}
{activeTab === "questions" && (
  <div>
    {/* HEADER */}
    <div className="flex justify-between items-center mb-6">
      
      {/* LEFT INFO */}
      <p className="text-slate-600 text-sm">
        Total soal: <strong>{questions.length}</strong>
      </p>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-3">

        {/* IMPORT DOCS */}
        <button
          onClick={() => setShowImportModal(true)}
          title="Import soal dari Word / Google Docs"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          {/* ICON DOCS / WORD */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V9z"/>
          </svg>

          Import Soal (Docs)
        </button>

        {/* TAMBAH SOAL */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>

          Tambah Soal
        </button>

      </div>
    </div>

    {/* LIST SOAL */}
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <QuestionItem
          key={q.id || idx}
          q={q}
          idx={idx}
          total={questions.length}
          isEditing={editingIdx === idx}

          onEdit={() =>
            setEditingIdx(editingIdx === idx ? null : idx)
          }

          onDelete={() =>
            setShowDeleteConfirm(idx)
          }

          onMove={(dir) => {
            const newArr = [...questions];
            const target = idx + dir;

            if (target < 0 || target >= newArr.length) return;

            [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
            setQuestions(newArr);
          }}

          onChange={(updated) => {
            const newArr = [...questions];
            newArr[idx] = updated;
            setQuestions(newArr);
          }}

          onUpdate={handleUpdateQuestion}
        />
      ))}
    </div>
  </div>
)}
          
          

          {/* ── RESULTS TAB ── */}
          {activeTab === "results" && (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Peserta", value: totalResults, gradient: "from-blue-700 to-blue-500" },
                  { label: "Nilai Rata-rata", value: avgScore, gradient: "from-sky-600 to-blue-500" },
                  { label: "Lulus (≥70)", value: passCount, gradient: "from-emerald-600 to-teal-500" },
                  { label: "% Kelulusan", value: `${passRate}%`, gradient: "from-amber-500 to-orange-400" },
                ].map(({ label, value, gradient }) => (
                  <div key={label} className={`bg-gradient-to-r ${gradient} rounded-xl p-5`}>
                    <p className="text-white/80 text-xs font-semibold mb-1">{label}</p>
                    <p className="text-white text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              {loadingResults ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : totalResults === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-semibold text-lg">Belum ada hasil ujian</p>
                  <p className="text-sm mt-1">Hasil ujian peserta akan muncul di sini</p>
                </div>
              ) : (
                <>
                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
                          <th className="px-4 py-3 text-left font-semibold">No</th>
                          <th className="px-4 py-3 text-left font-semibold">Nama Peserta</th>
                          <th className="px-4 py-3 text-left font-semibold">Kelas</th>
                          <th className="px-4 py-3 text-center font-semibold">Nilai</th>
                          <th className="px-4 py-3 text-center font-semibold">Benar / Total</th>
                          <th className="px-4 py-3 text-center font-semibold">Status</th>
                          <th className="px-4 py-3 text-center font-semibold">Pelanggaran</th>
                          <th className="px-4 py-3 text-center font-semibold">Waktu</th>
                          <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedResults.map((r, i) => {
                          const isPass = r.score >= PASSING_GRADE;
                          return (
                            <tr
                              key={r.id || i}
                              className={`border-b border-slate-100 transition-colors hover:bg-blue-50 ${
                                i % 2 === 0 ? "bg-slate-50" : "bg-white"
                              }`}
                            >
                              <td className="px-4 py-3 font-bold text-blue-700 text-center">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{r.student_name}</div>
                                {r.nisn && (
                                  <div className="text-xs text-slate-500 font-mono">{r.nisn}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">{r.student_class}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-sm min-w-[60px] ${
                                  isPass 
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm" 
                                    : "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm"
                                }`}>
                                  {r.score.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-slate-700 font-semibold">
                                  {r.correct_answers}
                                </span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-slate-500">{r.total_questions}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                                  isPass 
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                    : "bg-red-100 text-red-700 border border-red-200"
                                }`}>
                                  {isPass ? (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      LULUS
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                      TIDAK LULUS
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {r.violations > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {r.violations}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs text-slate-500">
                                  {r.submitted_at ? formatDate(r.submitted_at) : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setDetailResult(r)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Detail
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-800 mb-3">Hapus Soal?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus <strong>Soal {showDeleteConfirm + 1}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const qToDelete = questions[showDeleteConfirm!];
                  handleDeleteQuestion(qToDelete.id!, showDeleteConfirm!);
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddQuestion}
        />
      )}

      {/* Import Question Modal */}
      {showImportModal && (
        <ImportQuestionModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportQuestions}
        />
      )}

      {/* Detail Result Modal */}
      {detailResult && (
        <ResultDetailModal
          result={detailResult}
          questions={questions}
          onClose={() => setDetailResult(null)}
        />
      )}
    </div>
  );
}

// ── Question Item Component ──────────────────────────────────────────────

function QuestionItem({
  q, idx, total, isEditing, onEdit, onDelete, onMove, onChange, onUpdate,
}: {
  q: Question;
  idx: number;
  total: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: number) => void;
  onChange: (updated: Question) => void;
  onUpdate: (updated: Question) => void;
}) {
  const [localQ, setLocalQ] = useState<Question>({ ...q });

  useEffect(() => {
    setLocalQ({ ...q });
  }, [q]);

  function save() {
    const updated = { ...localQ, id: q.id };
    onUpdate(updated);
    onChange(updated);
    onEdit();
  }

  return (
    <div className="border-2 border-slate-200 rounded-xl p-5 animate-slideIn">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-700">Soal {idx + 1}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
              q.difficulty === "HOTS" ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            {q.difficulty}
          </span>
          {!isEditing && (
            <span className="text-sm text-slate-500 truncate max-w-xs">{q.content.slice(0, 60)}...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {idx > 0 && (
            <button onClick={() => onMove(-1)} className="p-1.5 rounded hover:bg-slate-100" title="Ke atas">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {idx < total - 1 && (
            <button onClick={() => onMove(1)} className="p-1.5 rounded hover:bg-slate-100" title="Ke bawah">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={onEdit}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isEditing ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {isEditing ? "Tutup" : "Edit"}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Tingkat Kesulitan</label>
            <select
              value={localQ.difficulty}
              onChange={(e) => setLocalQ({ ...localQ, difficulty: e.target.value as "REGULER" | "HOTS" })}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-blue-500"
            >
              <option value="REGULER">REGULER</option>
              <option value="HOTS">HOTS</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Pertanyaan</label>
            <textarea
              value={localQ.content}
              onChange={(e) => setLocalQ({ ...localQ, content: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">URL Gambar (opsional)</label>
            <input
              type="text"
              value={localQ.image_url || ""}
              onChange={(e) => setLocalQ({ ...localQ, image_url: e.target.value || undefined })}
              placeholder="https://..."
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">
              Pilihan Jawaban
              <span className="text-slate-400 ml-1 font-normal">(pilih radio = kunci jawaban)</span>
            </label>
            <div className="space-y-2">
              {localQ.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={letter} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`answer-${idx}`}
                      checked={localQ.answer === letter}
                      onChange={() => setLocalQ({ ...localQ, answer: letter })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="font-bold text-blue-600 w-6">{letter}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...localQ.options];
                        newOpts[i] = e.target.value;
                        setLocalQ({ ...localQ, options: newOpts });
                      }}
                      className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={save}
              className="px-5 py-2 bg-blue-700 text-white rounded-xl font-semibold text-sm hover:bg-blue-800"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Question Modal ───────────────────────────────────────────────────

function AddQuestionModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (q: Question) => void;
}) {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"REGULER" | "HOTS">("REGULER");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState(["", "", "", "", ""]);
  const [answer, setAnswer] = useState("A");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || options.some((o) => !o.trim())) return;
    onAdd({
      content: content.trim(),
      difficulty,
      image_url: imageUrl.trim() || undefined,
      options: options.map((o) => o.trim()),
      answer,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <h3 className="text-2xl font-bold text-slate-800 mb-6">➕ Tambah Soal Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">Tingkat Kesulitan</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "REGULER" | "HOTS")}
              className="px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500"
            >
              <option value="REGULER">REGULER</option>
              <option value="HOTS">HOTS</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">Pertanyaan</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              placeholder="Tulis pertanyaan di sini..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">URL Gambar (opsional)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Pilihan Jawaban <span className="text-slate-400 font-normal">(radio = kunci jawaban)</span>
            </label>
            <div className="space-y-2.5">
              {["A", "B", "C", "D", "E"].map((letter, i) => (
                <div key={letter} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="newAnswer"
                    value={letter}
                    checked={answer === letter}
                    onChange={() => setAnswer(letter)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="font-bold text-blue-600 w-6">{letter}.</span>
                  <input
                    type="text"
                    value={options[i]}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    required
                    placeholder={`Pilihan ${letter}`}
                    className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
            >
              Tambah Soal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Result Detail Modal ──────────────────────────────────────────────────

function ResultDetailModal({
  result, questions, onClose,
}: {
  result: ExamResult;
  questions: Question[];
  onClose: () => void;
}) {
  const answers = result.answers || {};

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-6 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl my-8 animate-fadeIn">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">📋 Detail Hasil Ujian</h2>
            <p className="text-slate-500 text-sm mt-1">
              {result.student_name} {result.nisn && `(${result.nisn})`} — {result.student_class}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Nilai", value: result.score.toFixed(1), color: result.score >= PASSING_GRADE ? "text-emerald-600" : "text-red-500" },
            { label: "Benar/Total", value: `${result.correct_answers}/${result.total_questions}`, color: "text-blue-700" },
            { label: "Waktu", value: formatDuration(result.time_taken || 0), color: "text-slate-700" },
            { label: "Pelanggaran", value: result.violations || 0, color: result.violations > 0 ? "text-red-500" : "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <h3 className="font-bold text-slate-700 mb-4">📝 Detail Jawaban</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.answer;
            return (
              <div
                key={q.id || i}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect ? "border-emerald-400" : userAnswer ? "border-red-400" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-blue-700 text-sm">Soal {i + 1}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${
                    isCorrect ? "bg-emerald-500" : userAnswer ? "bg-red-500" : "bg-slate-400"
                  }`}>
                    {isCorrect ? "✓ BENAR" : userAnswer ? "✗ SALAH" : "- KOSONG"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{q.content}</p>
                <div className="grid grid-cols-1 gap-1">
                  {q.options.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isAns = letter === q.answer;
                    const isUser = letter === userAnswer;
                    return (
                      <div
                        key={letter}
                        className={`p-2 rounded text-xs ${
                          isAns ? "bg-emerald-100 border border-emerald-400" : isUser ? "bg-red-100 border border-red-400" : "bg-slate-50"
                        }`}
                      >
                        <span className="font-semibold">{letter}.</span> {opt}
                        {isAns && <span className="ml-2 text-emerald-600 font-bold">✓</span>}
                        {isUser && !isAns && <span className="ml-2 text-red-600 font-bold">✗</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
