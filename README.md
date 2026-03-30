# 📝 Sistem Ujian ANBK

Aplikasi ujian online berbasis web untuk sekolah, dibangun dengan **Next.js 14** dan **Supabase**.

---

## ✨ Fitur

- ✅ Ujian online dengan timer countdown
- 🛡️ Sistem anti-cheating (deteksi pindah tab / window blur)
- ⚠️ Peringatan bertahap (max 3 violations → auto submit)
- 💾 Resume ujian jika browser ditutup
- 🔒 Satu peserta hanya bisa ujian 1 kali
- 📊 Panel guru: kelola soal, rekap nilai, export CSV
- 🔑 Kunci jawaban (bisa dilihat setelah ujian)

---

## 🚀 Cara Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd anbk-exam
npm install
```

### 2. Setup Supabase

1. Buat akun di [supabase.com](https://supabase.com) (gratis)
2. Buat project baru
3. Buka **SQL Editor** → **New Query**
4. Copy-paste isi file `supabase-schema.sql` → Run
5. Buka **Project Settings** → **API**
6. Copy **Project URL** dan **anon public key**

### 3. Konfigurasi Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── page.tsx          # Halaman start (login siswa)
│   ├── exam/page.tsx     # Halaman ujian
│   ├── result/page.tsx   # Halaman hasil
│   ├── admin/page.tsx    # Panel guru
│   └── api/results/      # API routes
├── lib/
│   ├── constants.ts      # Soal & konfigurasi
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
└── types/index.ts        # TypeScript types
```

---

## 🔐 Akses Guru

Password default: **`112233`**

Untuk ganti password, edit konstanta `ADMIN_PASSWORD` di `src/lib/constants.ts`.

---

## ✏️ Kustomisasi

### Ganti Soal
Edit array `QUESTIONS` di `src/lib/constants.ts`.

### Ganti Durasi Ujian
Edit `duration_minutes` di `DEFAULT_CONFIG` di `src/lib/constants.ts`.

### Ganti KKM / Passing Grade
Edit konstanta `PASSING_GRADE` di `src/lib/constants.ts`.

### Ganti Max Violations
Edit `max_violations` di `DEFAULT_CONFIG` di `src/lib/constants.ts`.

---

## 🗄️ Database Schema

Lihat file `supabase-schema.sql` untuk schema lengkap. Tabel utama:

| Tabel | Deskripsi |
|-------|-----------|
| `exam_results` | Hasil ujian semua peserta |
| `questions` | Bank soal (opsional, default hardcoded) |
| `exam_config` | Konfigurasi ujian (opsional) |

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + REST API)
- **Plus Jakarta Sans** (font)

---

## 📦 Build Production

```bash
npm run build
npm start
```

---

## 📄 Lisensi

MIT — bebas digunakan untuk keperluan pendidikan.
