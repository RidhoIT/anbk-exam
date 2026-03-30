// src/app/api/results/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nisn = searchParams.get("nisn");
  const name = searchParams.get("name");
  const cls = searchParams.get("class");

  if (!nisn && (!name || !cls)) {
    return NextResponse.json({ exists: false });
  }

  // Check by NISN first (more reliable)
  if (nisn) {
    const { data, error } = await supabase
      .from("exam_results")
      .select("id")
      .eq("nisn", nisn)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
  }

  // Fallback: check by name and class
  const { data, error } = await supabase
    .from("exam_results")
    .select("id")
    .eq("student_name", name)
    .eq("student_class", cls)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
}
