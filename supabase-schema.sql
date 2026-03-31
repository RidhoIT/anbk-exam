-- ============================================================
-- ANBK Exam System — Supabase Database Schema
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor:
-- https://app.supabase.com → SQL Editor → New Query
-- ============================================================


-- ── 1. TABLE: exam_results ───────────────────────────────────
-- Menyimpan semua hasil ujian peserta

CREATE TABLE IF NOT EXISTS exam_results (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn              TEXT,
  student_name      TEXT        NOT NULL,
  student_class     TEXT        NOT NULL,
  exam_title        TEXT        NOT NULL,
  score             NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  correct_answers   INTEGER     NOT NULL CHECK (correct_answers >= 0),
  total_questions   INTEGER     NOT NULL CHECK (total_questions > 0),
  answered          INTEGER     NOT NULL DEFAULT 0,
  violations        INTEGER     NOT NULL DEFAULT 0,
  answers           JSONB,
  -- contoh: {"0": "A", "1": "C", "2": "B", ...}
  time_taken        INTEGER,
  -- waktu pengerjaan dalam detik
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian cepat berdasarkan NISN
CREATE INDEX IF NOT EXISTS idx_exam_results_nisn
  ON exam_results (nisn);

-- Index untuk pencarian cepat berdasarkan nama & kelas
CREATE INDEX IF NOT EXISTS idx_exam_results_student
  ON exam_results (student_name, student_class);

-- Index untuk sorting berdasarkan waktu submit
CREATE INDEX IF NOT EXISTS idx_exam_results_submitted
  ON exam_results (submitted_at DESC);


-- ── 2. TABLE: questions (opsional) ──────────────────────────
-- Jika ingin menyimpan soal di database
-- (default: soal hardcoded di src/lib/constants.ts)

CREATE TABLE IF NOT EXISTS questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT        NOT NULL,
  image_url   TEXT,
  options     JSONB       NOT NULL,
  -- contoh: ["Option A", "Option B", "Option C", "Option D", "Option E"]
  answer      CHAR(1)     NOT NULL CHECK (answer IN ('A','B','C','D','E')),
  difficulty  TEXT        NOT NULL DEFAULT 'REGULER'
              CHECK (difficulty IN ('REGULER', 'HOTS')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk sorting soal
CREATE INDEX IF NOT EXISTS idx_questions_sort
  ON questions (sort_order ASC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ── 3. TABLE: exam_config (opsional) ────────────────────────
-- Konfigurasi ujian yang bisa diubah dari admin panel

CREATE TABLE IF NOT EXISTS exam_config (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_title          TEXT    NOT NULL DEFAULT 'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII',
  subject             TEXT    NOT NULL DEFAULT 'MATA PELAJARAN INFORMATIKA',
  academic_year       TEXT    NOT NULL DEFAULT 'TAHUN PELAJARAN 2025/2026',
  duration_minutes    INTEGER NOT NULL DEFAULT 90,
  max_violations      INTEGER NOT NULL DEFAULT 3,
  warning_countdown   INTEGER NOT NULL DEFAULT 10,
  passing_grade       INTEGER NOT NULL DEFAULT 70,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config
INSERT INTO exam_config (exam_title, subject, academic_year)
VALUES (
  'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII',
  'MATA PELAJARAN INFORMATIKA',
  'TAHUN PELAJARAN 2025/2026'
) ON CONFLICT DO NOTHING;


-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────

-- exam_results
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Izinkan semua orang INSERT (siswa submit hasil)
CREATE POLICY "Allow public insert exam_results"
  ON exam_results FOR INSERT TO anon
  WITH CHECK (true);

-- Izinkan semua orang SELECT (untuk cek one-attempt & admin panel)
CREATE POLICY "Allow public select exam_results"
  ON exam_results FOR SELECT TO anon
  USING (true);

-- Izinkan semua orang DELETE (untuk admin hapus hasil)
CREATE POLICY "Allow public delete exam_results"
  ON exam_results FOR DELETE TO anon
  USING (true);

-- questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active questions"
  ON questions FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Allow public manage questions"
  ON questions FOR ALL TO anon
  USING (true);

-- exam_config
ALTER TABLE exam_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read config"
  ON exam_config FOR SELECT TO anon
  USING (true);


-- ── 5. VIEWS (opsional) ──────────────────────────────────────

-- View statistik ringkasan per kelas
CREATE OR REPLACE VIEW class_summary AS
SELECT
  student_class,
  COUNT(*)                                    AS total_students,
  ROUND(AVG(score), 2)                        AS avg_score,
  MAX(score)                                  AS highest_score,
  MIN(score)                                  AS lowest_score,
  COUNT(*) FILTER (WHERE score >= 70)         AS pass_count,
  COUNT(*) FILTER (WHERE score < 70)          AS fail_count,
  ROUND(
    COUNT(*) FILTER (WHERE score >= 70)::NUMERIC
    / COUNT(*) * 100, 1
  )                                            AS pass_rate
FROM exam_results
GROUP BY student_class
ORDER BY student_class;

-- ── 6. SAMPLE DATA (opsional, hapus untuk produksi) ──────────

-- INSERT INTO exam_results (student_name, student_class, exam_title, score, correct_answers, total_questions, answered, violations, answers, time_taken)
-- VALUES
--   ('Budi Santoso',   'XII IPA 1', 'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII', 88.00, 44, 50, 50, 0, '{"0":"B","1":"B","2":"B"}', 3240),
--   ('Siti Rahayu',    'XII IPA 1', 'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII', 72.00, 36, 50, 48, 1, '{"0":"B","1":"B","2":"A"}', 4100),
--   ('Agus Purnomo',   'XII IPS 2', 'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII', 56.00, 28, 50, 45, 2, '{"0":"A","1":"C","2":"B"}', 5200);


-- ── 7. MIGRATION - Add NISN column (for existing databases) ──────────
-- Jalankan SQL di bawah ini jika Anda sudah memiliki database dan ingin menambahkan kolom NISN

-- Tambah kolom NISN jika belum ada
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'exam_results' AND column_name = 'nisn') THEN
    ALTER TABLE exam_results ADD COLUMN nisn TEXT;
  END IF;
END $$;

-- Buat index untuk NISN jika belum ada
CREATE INDEX IF NOT EXISTS idx_exam_results_nisn ON exam_results (nisn);
