// src/app/api/questions/import/route.ts
import { NextRequest, NextResponse } from "next/server";

interface ParsedQuestion {
  content: string;
  options: string[];
  answer: string;
}

// Parse questions from text content
function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // Split by question patterns (e.g., "1.", "2.", "Soal 1:", etc.)
  const questionBlocks = text.split(/(?=\d+\.\s+|Soal\s+\d+:)/i);
  
  for (const block of questionBlocks) {
    if (!block.trim()) continue;
    
    // Extract question content (everything before options)
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length < 3) continue; // Need at least question + 2 options
    
    // Find options pattern (A., B., C., etc. or A), B), etc.)
    const optionsMatch = block.match(/([A-E][\.\)])\s*([^\n]+)/gi);
    if (!optionsMatch || optionsMatch.length < 2) continue;
    
    const options: string[] = [];
    let answer = '';
    
    for (const match of optionsMatch) {
      const optionLine = match.trim();
      const optionLetterMatch = optionLine.match(/^([A-E])[\.\)]/i);
      if (optionLetterMatch) {
        const optionLetter = optionLetterMatch[1].toUpperCase();
        const optionText = optionLine.replace(/^[A-E][\.\)]\s*/i, '').trim();
        options.push(optionText);
        
        // Check if this option is marked as correct (look for *, **, (Jawaban), etc.)
        if (optionLine.match(/(\*{1,2}|\(Jawaban\)|\(correct\)|✓)/i)) {
          answer = optionLetter;
        }
      }
    }
    
    if (options.length < 2) continue;
    
    // Extract question content (before options start)
    let content = block.split(/[A-E][\.\)]/i)[0].trim();
    // Remove question number prefix
    content = content.replace(/^\d+\.\s*/i, '').replace(/^Soal\s+\d+:?/i, '').trim();
    
    // If no answer marked, try to find answer key section
    if (!answer) {
      const answerKeyMatch = block.match(/(?:Jawaban|Answer)[:\s]*([A-E])/i);
      if (answerKeyMatch) {
        answer = answerKeyMatch[1].toUpperCase();
      }
    }
    
    if (content && options.length >= 2 && answer) {
      questions.push({ content, options, answer });
    }
  }
  
  return questions;
}

// POST - Parse and import questions from file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const difficulty = formData.get('difficulty') as string || 'REGULER';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Only allow PDF and DOC/DOCX files
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and Word documents are allowed' },
        { status: 400 }
      );
    }
    
    let textContent = '';
    
    // For now, we'll handle text-based content
    // In a real implementation, you'd use a server-side library
    // For client-side parsing, we'll handle it in the component
    
    // Return success with file info - actual parsing will be done client-side
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully. Parsing will be done client-side.',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      difficulty
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
