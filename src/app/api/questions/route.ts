// src/app/api/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all active questions
export async function GET() {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST new question
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { content, image_url, options, answer, difficulty, sort_order } = body;

  if (!content || !options || !answer) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      content,
      image_url: image_url || null,
      options,
      answer,
      difficulty: difficulty || "REGULER",
      sort_order: sort_order || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// PUT update question
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Question ID is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE question
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const ids = searchParams.get("ids");

  // Bulk delete
  if (ids) {
    const idArray = ids.split(",");
    const { error } = await supabase
      .from("questions")
      .delete()
      .in("id", idArray);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: idArray.length });
  }

  // Single delete
  if (!id) {
    return NextResponse.json(
      { error: "Question ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
