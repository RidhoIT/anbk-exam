-- ============================================================
-- FIX: Add DELETE policy for exam_results table
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor:
-- https://app.supabase.com → Database → [pilih database] → SQL Editor
-- ============================================================

-- Tambahkan policy DELETE untuk exam_results
CREATE POLICY "Allow public delete exam_results"
  ON exam_results FOR DELETE TO anon
  USING (true);

-- ============================================================
-- Verifikasi policy sudah ada
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'exam_results';
