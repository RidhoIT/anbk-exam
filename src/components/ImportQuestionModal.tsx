// src/components/ImportQuestionModal.tsx
"use client";

import { useState, useRef } from "react";
import type { Question } from "@/types";
import Tesseract from "tesseract.js";

interface ParsedQuestion {
  content: string;
  options: string[];
  answer: string;
  questionNumber?: number;
}

interface ImportQuestionModalProps {
  onClose: () => void;
  onImport: (questions: Question[]) => void;
}

export default function ImportQuestionModal({ onClose, onImport }: ImportQuestionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<"REGULER" | "HOTS">("REGULER");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [textContent, setTextContent] = useState<string>("");
  const [showTextEdit, setShowTextEdit] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse PDF file - extract text content only
  async function parsePDF(file: File): Promise<string> {
    try {
      // Try to read as text first (works for some PDFs)
      const text = await file.text();

      // If contains readable text, return it
      if (text && text.trim().length > 100) {
        return text;
      }

      // Otherwise, inform user to use image upload or copy-paste
      throw new Error("PDF ini adalah hasil scan. Silakan upload sebagai gambar atau copy-paste teksnya.");
    } catch (error) {
      console.error("PDF parse error:", error);
      throw new Error("Gagal membaca PDF. Silakan copy-paste isi soal atau upload sebagai gambar (PNG/JPG).");
    }
  }

  // Parse DOC/DOCX file - extract text content
  async function parseDoc(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check if it's a valid DOCX (PK zip signature)
      if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
        // Try mammoth for DOCX
        try {
          const mammoth = await import("mammoth/mammoth.browser") as any;
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result && result.value && result.value.trim().length > 50) {
            return result.value;
          }
        } catch (mammothError) {
          console.error("Mammoth extraction failed:", mammothError);
        }

        // Fallback: manual XML extraction
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(uint8Array);
        const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatches && textMatches.length > 0) {
          const extracted = textMatches
            .map(m => m.replace(/<\/?w:t[^>]*>/g, ''))
            .join('\n');
          if (extracted.trim().length > 50) {
            return extracted;
          }
        }
      }

      // Try reading as plain text
      try {
        const text = await file.text();
        if (text && text.trim().length > 50) {
          return text;
        }
      } catch (e) {
        // Ignore
      }

      throw new Error("Tidak dapat mengekstrak teks dari file Word");
    } catch (error) {
      console.error("DOC parse error:", error);
      throw new Error("Gagal membaca file Word. Silakan copy-paste isi soal.");
    }
  }

  // Parse TXT file
  async function parseTxt(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(arrayBuffer);
  }

  // Convert file to image data URL for OCR
  async function fileToImageData(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  // Process image file with OCR - extract text only
  async function processImageWithOCR(file: File): Promise<string> {
    try {
      setLoading(true);
      setOcrProgress(0);

      const imageDataUrl = await fileToImageData(file);

      const { data: { text } } = await Tesseract.recognize(imageDataUrl, "eng+ind", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      return text;
    } catch (error) {
      console.error("Image OCR error:", error);
      throw new Error("Gagal melakukan OCR pada gambar");
    }
  }

  // Analyze text with Gemini AI
  async function analyzeWithGemini(text: string) {
    const response = await fetch("/api/questions/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal menganalisis soal");
    }

    return data.questions || [];
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg"];
    const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension)) {
      setError("Hanya file PDF, Word, Text, dan Gambar yang diperbolehkan");
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Ukuran file terlalu besar. Maksimal 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);
    setParsedQuestions([]);
    setShowTextEdit(false);
    setOcrProgress(0);

    try {
      let extractedText = "";
      const isTxtFile = selectedFile.type === "text/plain" || fileExtension === ".txt";
      const isImageFile = selectedFile.type.startsWith("image/") ||
        [".png", ".jpg", ".jpeg"].includes(fileExtension);

      // For TXT files, read directly
      if (isTxtFile) {
        extractedText = await parseTxt(selectedFile);
      }
      // For image files, use OCR
      else if (isImageFile) {
        extractedText = await processImageWithOCR(selectedFile);
      }
      // For PDF and DOCX, extract text
      else {
        try {
          if (selectedFile.type === "application/pdf" || fileExtension === ".pdf") {
            extractedText = await parsePDF(selectedFile);
          } else if (
            selectedFile.type === "application/msword" ||
            selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            fileExtension === ".doc" ||
            fileExtension === ".docx"
          ) {
            extractedText = await parseDoc(selectedFile);
          }
        } catch (parseError) {
          console.error("File parse error:", parseError);
          extractedText = "";
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        setError("Tidak dapat mengekstrak teks. Silakan copy-paste isi soal di bawah.");
        setShowTextEdit(true);
        setTextContent("");
        setLoading(false);
        return;
      }

      setTextContent(extractedText);
      setShowTextEdit(true);
      setLoading(false);

    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message || "Gagal memproses file. Silakan copy-paste isi soal.");
      setLoading(false);
      setShowTextEdit(true);
    }
  }

  async function handleAnalyzeWithAI() {
    if (!textContent.trim()) {
      setError("Tidak ada teks untuk dianalisis");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const questions = await analyzeWithGemini(textContent);

      if (questions.length === 0) {
        setError("Tidak dapat menemukan soal dalam teks. Pastikan format soal benar.");
      } else {
        setParsedQuestions(questions);
        setShowTextEdit(false);
      }
    } catch (err: any) {
      console.error("AI analysis error:", err);
      setError(err.message || "Gagal menganalisis soal dengan AI. Periksa koneksi internet atau coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (parsedQuestions.length === 0) return;

    setImporting(true);

    try {
      // Sort questions by questionNumber if available, otherwise by index
      const sortedQuestions = [...parsedQuestions].sort((a, b) => {
        if (a.questionNumber !== undefined && b.questionNumber !== undefined) {
          return a.questionNumber - b.questionNumber;
        }
        return 0;
      });

      const questionsToAdd: Question[] = sortedQuestions.map((q, index) => ({
        content: q.content,
        options: q.options,
        answer: q.answer,
        difficulty,
        sort_order: q.questionNumber !== undefined ? q.questionNumber - 1 : index,
      }));

      onImport(questionsToAdd);
    } catch (err: any) {
      console.error("Import error:", err);
      setError("Gagal menambahkan soal.");
    } finally {
      setImporting(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } } as any;
      handleFileSelect(event);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div className="bg-white rounded-2xl p-8 max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">📄 Import Soal dari Dokumen</h3>
            <p className="text-slate-500 text-sm mt-1">
              Upload file Word (.doc/.docx) atau file teks (.txt). Sistem akan menganalisis dan mengekstrak soal secara otomatis.
            </p>
            <p className="text-blue-600 text-xs mt-2 font-semibold">
              📌 Format yang didukung: DOC, DOCX, TXT
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            Tingkat Kesulitan
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "REGULER" | "HOTS")}
            className="px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 w-full md:w-auto"
          >
            <option value="REGULER">REGULER</option>
            <option value="HOTS">HOTS</option>
          </select>
        </div>

        {/* File Upload Section */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
            }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          {!file ? (
            <>
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-600 font-semibold mb-2">Drag & drop file di sini</p>
              <p className="text-slate-500 text-sm mb-4">atau klik untuk memilih file</p>
              <p className="text-slate-400 text-xs">Format: PDF, DOC, DOCX, TXT, PNG, JPG (Max 10MB)</p>
              <p className="text-emerald-600 text-xs font-semibold mt-2">
                💡 Tips: Untuk hasil OCR terbaik, gunakan gambar jelas dengan teks terbaca
              </p>
              <label
                htmlFor="file-upload"
                className="inline-block mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Pilih File
              </label>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-10 h-10 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-slate-700">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setParsedQuestions([]);
                  setTextContent("");
                  setError(null);
                  setShowTextEdit(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-slate-600 font-semibold">
                  {parsedQuestions.length > 0
                    ? "Menyimpan soal..."
                    : ocrProgress > 0
                      ? `OCR: ${ocrProgress}%`
                      : "Menganalisis soal dengan AI..."}
                </p>
                {ocrProgress > 0 && (
                  <div className="w-48 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold text-red-700 mb-1">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Text Edit Section */}
        {showTextEdit && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-700">📝 Paste / Edit Teks Soal</h4>
              <button
                onClick={() => setShowTextEdit(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sembunyikan
              </button>
            </div>

            {!textContent && (
              <div className="mb-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 font-semibold mb-2">📋 Cara menggunakan:</p>
                <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Buka file soal Anda (PDF/Word/Docs)</li>
                  <li>Select all (Ctrl+A) dan copy (Ctrl+C)</li>
                  <li>Paste (Ctrl+V) di kotak di bawah ini</li>
                  <li>Klik "Analisis Soal dengan AI"</li>
                </ol>
              </div>
            )}

            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full h-64 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-sm font-mono"
              placeholder="Paste teks soal di sini...

Contoh format:
Hasil pengukuran panjang dan lebar sebidang tanah adalah 12,23 m dan 14,3 m. Luas tanah menurut aturan angka penting adalah ….
A. 174,8890 m2
B. 174,889 m2
C. 174,89 m2
D. 174,8 m2
E. 175 m2"
            />
            <p className="text-xs text-slate-500 mt-2">
              💡 Tips: Pastikan soal diformat dengan jelas. AI akan lebih akurat jika soal memiliki nomor dan pilihan A-E.
            </p>
            <button
              onClick={handleAnalyzeWithAI}
              disabled={!textContent.trim() || loading}
              className={`mt-3 w-full py-3 rounded-xl font-bold text-white transition-colors ${!textContent.trim() || loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                }`}
            >
              🤖 Analisis Soal dengan AI
            </button>
          </div>
        )}

        {/* Preview Section */}
        {parsedQuestions.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-700">
                📋 Preview Soal ({parsedQuestions.length} soal ditemukan)
              </h4>
              <span className="text-sm text-slate-500">
                Tingkat kesulitan: <strong className="text-blue-600">{difficulty}</strong>
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto border-2 border-slate-200 rounded-xl p-4">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-700 text-sm">
                      Soal {q.questionNumber || idx + 1}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-blue-500">
                      {difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3 line-clamp-2">{q.content}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div
                          key={letter}
                          className={`text-xs p-2 rounded ${letter === q.answer
                              ? "bg-emerald-100 border border-emerald-400"
                              : "bg-white border border-slate-200"
                            }`}
                        >
                          <span className="font-semibold">{letter}.</span> {opt}
                          {letter === q.answer && (
                            <span className="ml-1 text-emerald-600 font-bold">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedQuestions.length === 0 || importing}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors ${parsedQuestions.length === 0 || importing
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600"
              }`}
          >
            {importing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menambahkan...
              </span>
            ) : (
              `Tambahkan ${parsedQuestions.length} Soal`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
