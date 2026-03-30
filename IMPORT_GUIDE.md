# 📄 Panduan Import Soal dari File

## Fitur Import Soal dengan AI

Fitur ini memungkinkan Anda untuk mengimport soal pilihan ganda dari file dokumen menggunakan **Gemini AI** untuk analisis yang cerdas.

## 📁 Format File yang Didukung

- **PDF** (.pdf) - File PDF dengan teks yang dapat dipilih
- **Word** (.doc, .docx) - Dokumen Microsoft Word
- **Text** (.txt) - File teks biasa

## ✨ Cara Menggunakan

### Metode 1: Upload File

1. Buka **Panel Guru** → tab **Kelola Soal**
2. Klik tombol **"Import Soal (Docs)"**
3. Pilih tingkat kesulitan: **REGULER** atau **HOTS**
4. Upload file dengan cara:
   - Drag & drop file ke area upload, atau
   - Klik "Pilih File" untuk memilih dari komputer
5. Setelah file diproses, teks akan ditampilkan
6. Klik **"🤖 Analisis Soal dengan AI"**
7. Review soal yang ditemukan di preview
8. Klik **"Tambahkan X Soal"** untuk menyimpan

### Metode 2: Copy-Paste Teks

1. Buka **Panel Guru** → tab **Kelola Soal**
2. Klik tombol **"Import Soal (Docs)"**
3. Pilih tingkat kesulitan
4. Upload file apa saja (atau skip jika ingin paste manual)
5. Copy soal dari dokumen Anda
6. Paste teks soal ke area yang tersedia
7. Klik **"🤖 Analisis Soal dengan AI"**
8. Review dan tambahkan soal

## 📝 Format Soal yang Disarankan

Untuk hasil terbaik, format soal seperti berikut:

```
Hasil pengukuran panjang dan lebar sebidang tanah berbentuk empat persegi 
panjang adalah 12,23 m dan 14,3 m. Luas tanah menurut aturan angka penting 
adalah ….
A. 174,8890 m2
B. 174,889 m2
C. 174,89 m2
D. 174,8 m2
E. 175 m2

Sebuah partikel bergerak dengan vector posisi r = (2t² – t)i – (t³ + t)j 
dalam satuan SI. Besar kecepatan partikel pada t = 1 s adalah ….
A. 1 m/s
B. 3 m/s
C. 4 m/s
D. 5 m/s
E. 7 m/s
```

### Tips Format:

✅ **BAIK:**
- Setiap soal dipisahkan dengan baris kosong
- Pilihan jawaban dimulai dengan A., B., C., D., E.
- Soal memiliki nomor urut (1, 2, 3 atau Soal 1, Soal 2, dll)
- Jawaban yang benar ditandai dengan *, ✓, atau (Jawaban)

❌ **KURANG BAIK:**
- Semua soal dalam satu paragraf panjang
- Pilihan jawaban tanpa label A-E
- Format tidak konsisten

## 🤖 Bagaimana AI Bekerja?

1. **Ekstraksi Teks**: Sistem mengekstrak teks dari file Anda
2. **Analisis AI**: Gemini AI menganalisis struktur soal
3. **Identifikasi**: AI mengidentifikasi:
   - Pertanyaan utama
   - Pilihan jawaban (A-E)
   - Jawaban yang benar (jika ditandai)
4. **Validasi**: Sistem memvalidasi format soal
5. **Preview**: Anda melihat preview sebelum menyimpan

## ⚠️ Troubleshooting

### Error: "Gagal memproses file"
- Pastikan file tidak korup
- Untuk PDF, pastikan bukan PDF hasil scan (harus ada teks)
- Untuk Word, coba simpan sebagai .docx

### Error: "Tidak dapat menemukan soal"
- Pastikan format soal jelas dengan pilihan A-E
- Coba format ulang dokumen dengan format yang disarankan
- Gunakan metode copy-paste manual

### Error: "Gagal menganalisis dengan AI"
- Periksa koneksi internet
- Pastikan API key Gemini sudah dikonfigurasi
- Coba lagi dengan teks yang lebih pendek

### Soal yang ditemukan tidak akurat
- Edit manual teks di kotak preview sebelum analisis
- Pastikan format soal konsisten
- Tambahkan nomor dan label A-E yang jelas

## 🔧 Konfigurasi API Key

API Key Gemini sudah dikonfigurasi di `.env.local`:

```env
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyB_9Xf0KnQVSa7q3DHurScmwXrwlPtgpvY
```

## 📊 Batasan

- Ukuran file maksimal: **10 MB**
- Jumlah soal per import: **Tidak terbatas** (semua soal dalam file akan diproses)
- Format file: **PDF, DOC, DOCX, TXT**

## 💡 Tips Tambahan

1. **Untuk soal dengan gambar**: AI akan mengabaikan referensi gambar. Anda perlu menambahkan URL gambar manual setelah import.

2. **Untuk soal matematika/sains**: Format persamaan dengan jelas. AI akan mencoba memahami notasi matematika sederhana.

3. **Review selalu**: Selalu review hasil import sebelum menyimpan untuk memastikan akurasi.

4. **Batch import**: Untuk banyak soal, import bertahap (10-20 soal per batch) untuk hasil terbaik.

---

**Dibuat dengan ❤️ untuk ANBK Exam System**
