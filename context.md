# ANBK Exam System — Project Context

## Overview

Sistem Ujian ANBK (Asesmen Nasional Berbasis Komputer) adalah aplikasi ujian online berbasis web yang dibangun dengan **Next.js 14 (App Router)** dan **Supabase** sebagai backend/database. Sistem ini dirancang untuk sekolah/institusi pendidikan untuk mengelola dan mengeksekusi ujian secara digital.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Custom password-based admin auth |
| State | React useState/useContext |
| Storage | Supabase DB + localStorage (resume exam) |

---

## Features

### Siswa (Student)
- Halaman start: input nama & kelas
- Anti-cheat: deteksi tab switching / window blur
- Timer countdown (90 menit default)
- Sistem peringatan (max 3 violations → auto submit)
- Navigasi soal dengan sidebar nomor
- Tandai soal ragu-ragu
- Submit manual atau otomatis
- Halaman hasil dengan skor, statistik, dan detail jawaban
- Resume ujian jika browser ditutup (via localStorage)
- Blokir peserta yang sudah pernah ujian

### Guru (Admin)
- Login dengan password (default: `112233`)
- Kelola soal: tambah, edit, hapus, reorder, set difficulty
- Support gambar per soal (via URL)
- Rekap nilai semua peserta
- Statistik: total, rata-rata, lulus/tidak lulus
- Detail jawaban per peserta
- Export CSV

---

## Project Structure

```
anbk-exam/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Start page (student login)
│   │   ├── exam/
│   │   │   └── page.tsx            # Exam page
│   │   ├── result/
│   │   │   └── page.tsx            # Result page
│   │   └── admin/
│   │       └── page.tsx            # Admin panel
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Timer.tsx
│   │   ├── exam/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── QuestionSidebar.tsx
│   │   │   ├── WarningOverlay.tsx
│   │   │   └── ExamHeader.tsx
│   │   └── admin/
│   │       ├── QuestionEditor.tsx
│   │       └── ResultsTable.tsx
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── constants.ts            # App constants
│   │   └── utils.ts                # Helper functions
│   ├── hooks/
│   │   ├── useExam.ts              # Exam state management
│   │   ├── useTimer.ts             # Timer logic
│   │   └── useAntiCheat.ts         # Anti-cheat detection
│   └── types/
│       └── index.ts                # TypeScript types
├── context.md                      # This file
├── .env.local                      # Environment variables
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Database Schema

### Table: `exam_results`
Menyimpan hasil ujian setiap peserta.

```sql
CREATE TABLE exam_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name  TEXT NOT NULL,
  student_class TEXT NOT NULL,
  exam_title    TEXT NOT NULL,
  score         NUMERIC(5,2) NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answered      INTEGER NOT NULL,
  violations    INTEGER DEFAULT 0,
  answers       JSONB,           -- { "0": "A", "1": "C", ... }
  time_taken    INTEGER,         -- seconds
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_exam_results_student 
  ON exam_results(student_name, student_class);

-- RLS Policy: allow public insert (students submit), restrict read to admin
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON exam_results
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON exam_results
  FOR SELECT TO anon USING (true);
```

### Table: `questions`
Menyimpan bank soal (opsional — bisa juga hardcoded di frontend).

```sql
CREATE TABLE questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  image_url   TEXT,
  options     JSONB NOT NULL,    -- ["Option A", "Option B", ...]
  answer      CHAR(1) NOT NULL,  -- "A", "B", "C", "D", "E"
  difficulty  TEXT DEFAULT 'REGULER', -- 'REGULER' | 'HOTS'
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active questions" ON questions
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated manage" ON questions
  FOR ALL TO anon USING (true);
```

### Table: `exam_config` (opsional)
Menyimpan konfigurasi ujian yang bisa diubah admin.

```sql
CREATE TABLE exam_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_title      TEXT DEFAULT 'ASESMEN SUMATIF AKHIR SEMESTER GENAP KELAS XII',
  subject         TEXT DEFAULT 'MATA PELAJARAN INFORMATIKA',
  academic_year   TEXT DEFAULT 'TAHUN PELAJARAN 2025/2026',
  duration_minutes INTEGER DEFAULT 90,
  max_violations  INTEGER DEFAULT 3,
  warning_countdown INTEGER DEFAULT 10,
  admin_password  TEXT DEFAULT '112233',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Key Business Logic

### Anti-Cheat System
1. `visibilitychange` event → tab switch detected
2. `window blur` event → window focus lost
3. Per violation: tampilkan warning overlay + countdown 10 detik
4. Jika countdown habis → auto submit
5. Jika violations >= 3 → langsung submit
6. Kembali ke exam dalam countdown → lanjutkan ujian normal

### Scoring
```
score = (correct_answers / total_questions) * 100
passing_grade = 70
```

### Resume Exam
- State disimpan ke `localStorage` setiap perubahan
- Key: `examState`
- Data: nama, kelas, jawaban, waktu tersisa, violations
- Saat start: cek apakah ada ongoing exam di localStorage

### One-Attempt Policy
- Sebelum start ujian, query `exam_results` berdasarkan `student_name` + `student_class`
- Jika ada record → tolak akses

---

## API Routes (Next.js)

### POST `/api/results`
Submit exam result ke Supabase.

### GET `/api/results`
Ambil semua results (admin only, validasi password via header).

### GET `/api/questions`
Ambil daftar soal aktif.

### POST `/api/questions`
Tambah/edit soal (admin only).

### DELETE `/api/questions/[id]`
Hapus soal (admin only).

---

## Constants

```typescript
export const DURATION_MINUTES = 90;
export const MAX_VIOLATIONS = 3;
export const WARNING_COUNTDOWN = 10;
export const ADMIN_PASSWORD = '112233';
export const PASSING_GRADE = 70;
```

---

## Data Flow

```
Student fills form
    ↓
Check one-attempt policy (query Supabase)
    ↓
Start exam → start timer → save to localStorage
    ↓
Anti-cheat monitors tab/focus
    ↓
Student answers questions
    ↓
Submit (manual / timer / violation)
    ↓
POST /api/results → Supabase
    ↓
Show result page
    ↓
Clear localStorage
```

---

## Notes for Developers

1. **Questions** saat ini hardcoded di `src/lib/constants.ts`. Untuk produksi, pindahkan ke tabel `questions` di Supabase dan fetch via API.
2. **Admin password** disimpan sebagai plaintext di constants. Untuk produksi, gunakan environment variable dan hash.
3. **localStorage** digunakan untuk resume exam — tidak ada server-side session.
4. **RLS (Row Level Security)** Supabase diaktifkan. Policy mengizinkan public INSERT dan SELECT untuk kemudahan. Di produksi, batasi dengan auth token.
5. Komponen Timer menggunakan `setInterval` di client side — pastikan cleanup di `useEffect`.
