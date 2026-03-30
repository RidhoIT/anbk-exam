// src/app/api/results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("exam_results")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    nisn,
    student_name,
    student_class,
    exam_title,
    score,
    correct_answers,
    total_questions,
    answered,
    violations,
    answers,
    time_taken,
  } = body;

  if (!student_name || !student_class) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("exam_results")
    .insert({
      nisn: nisn || null,
      student_name,
      student_class,
      exam_title,
      score,
      correct_answers,
      total_questions,
      answered,
      violations: violations || 0,
      answers,
      time_taken,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
