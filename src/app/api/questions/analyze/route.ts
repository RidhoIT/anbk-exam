// src/app/api/questions/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use server-side env var (without NEXT_PUBLIC_) for API routes
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Use gemini-2.5-flash which has better quota availability
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface ParsedQuestion {
  content: string;
  options: string[];
  answer: string;
  questionNumber?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content provided" },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Create optimized prompt for question extraction
    const prompt = `You are an expert at extracting multiple choice questions from Indonesian educational text. Your task is to analyze the text and extract ALL questions with their options.

For each question, identify:
1. The question content (complete question text)
2. All options (A, B, C, D, E)
3. The correct answer (if marked, otherwise use your knowledge)
4. The question number (if visible in the text)

Return result as JSON array with this EXACT format:
[
  {
    "content": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
    "answer": "A",
    "questionNumber": 1
  }
]

CRITICAL RULES:
- Return ONLY valid JSON, NO explanations or markdown
- Each question MUST have 5 options (A-E)
- Answer must be A, B, C, D, or E
- If answer not marked, determine it yourself
- Clean formatting, remove URLs and image references
- Preserve question order from original text
- Include questionNumber if present in text

Text to analyze:
${text}

Return JSON:`;

    // Retry logic for rate limit handling
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Gemini API attempt ${attempt}/${maxRetries}`);

        const response = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.1, // Lower temperature for more consistent output
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          
          // Handle 429 Rate Limit with retry
          if (response.status === 429 && attempt < maxRetries) {
            const retryAfter = response.headers.get('Retry-After') || '3';
            const waitTime = parseInt(retryAfter) * 1000;
            console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          console.error("Gemini API error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorData.substring(0, 500)
          });

          if (response.status === 400) {
            return NextResponse.json(
              { error: "Invalid request. Please check your input format." },
              { status: 400 }
            );
          }

          if (response.status === 403) {
            return NextResponse.json(
              { error: "API key invalid or insufficient permissions." },
              { status: 403 }
            );
          }

          if (response.status === 429) {
            return NextResponse.json(
              { 
                error: "API rate limit exceeded. Please wait a moment and try again.",
                retryAfter: "Please wait 10-30 seconds before retrying"
              },
              { status: 429 }
            );
          }

          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Gemini API response:", {
          hasCandidates: !!data.candidates,
          candidateCount: data.candidates?.length || 0
        });

        // Extract response text
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!responseText) {
          console.error("Empty response from Gemini API", data);
          throw new Error("No response from AI");
        }

        // Parse JSON from response
        let jsonStr = responseText.trim();

        // Remove markdown code blocks
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/g, "").replace(/\s*```$/g, "");

        // Extract JSON array if mixed with other text
        const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        try {
          const questions: ParsedQuestion[] = JSON.parse(jsonStr);

          // Sort by questionNumber if available
          const sortedQuestions = questions.sort((a, b) => {
            if (a.questionNumber !== undefined && b.questionNumber !== undefined) {
              return a.questionNumber - b.questionNumber;
            }
            return 0;
          });

          // Validate questions
          const validatedQuestions = sortedQuestions.filter(q => {
            return q.content &&
                   Array.isArray(q.options) &&
                   q.options.length >= 2 &&
                   q.answer &&
                   /^[A-E]$/.test(q.answer);
          });

          return NextResponse.json({
            success: true,
            questions: validatedQuestions,
            totalQuestions: validatedQuestions.length
          });

        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Response text:", responseText.substring(0, 500));

          // Fallback to manual parser
          const fallbackQuestions = parseQuestionsManually(text);

          return NextResponse.json({
            success: true,
            questions: fallbackQuestions,
            totalQuestions: fallbackQuestions.length,
            note: "AI parsing failed, used fallback parser"
          });
        }

      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    console.error("All retries failed:", lastError);
    
    // Use fallback parser as last resort
    const fallbackQuestions = parseQuestionsManually(text);
    
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      totalQuestions: fallbackQuestions.length,
      note: "API unavailable, used fallback parser"
    });

  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

// Fallback manual parser
function parseQuestionsManually(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = text.split("\n").filter(line => line.trim());

  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: string[] = [];

  const optionPattern = /^([A-E])[\.\)]\s*(.+)/i;
  const questionNumberPattern = /^(?:soal|question|no\.?|nomor)?\s*(\d+)[\.\):]/i;

  for (const line of lines) {
    const trimmedLine = line.trim();

    const optionMatch = trimmedLine.match(optionPattern);

    if (optionMatch) {
      currentOptions.push(optionMatch[2].trim());
    } else if (trimmedLine.length > 10 && !trimmedLine.startsWith("http")) {
      // Check if this is a new question
      const numberMatch = trimmedLine.match(questionNumberPattern);
      
      if (currentQuestion && currentOptions.length > 0) {
        if (currentOptions.length >= 2) {
          questions.push({
            content: currentQuestion.content || "",
            options: currentOptions.slice(0, 5),
            answer: currentQuestion.answer || "A",
            questionNumber: currentQuestion.questionNumber
          });
        }
        currentOptions = [];
        currentQuestion = null;
      }

      if (trimmedLine.length > 20) {
        currentQuestion = { 
          content: trimmedLine,
          questionNumber: numberMatch ? parseInt(numberMatch[1]) : undefined
        };
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentOptions.length >= 2) {
    questions.push({
      content: currentQuestion.content || "",
      options: currentOptions.slice(0, 5),
      answer: currentQuestion.answer || "A",
      questionNumber: currentQuestion.questionNumber
    });
  }

  return questions;
}
