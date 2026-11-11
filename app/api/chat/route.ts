import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live AI is not configured yet. Add OPENAI_API_KEY in the Vercel project environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
    const agent = body.agent && typeof body.agent === "object" ? body.agent : {};
    if (!messages.length || messages.some((m: any) =>
      !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 12000
    )) {
      return NextResponse.json({ error: "Please send a valid conversation." }, { status: 400 });
    }

    const instructions = typeof agent.instruction === "string" ? agent.instruction.slice(0, 4000) : "";
    const agentName = typeof agent.name === "string" ? agent.name.slice(0, 40) : "DOMYX";
    const input = messages.map((m: any) => ({
      role: m.role,
      content: [{ type: "input_text", text: m.content }]
    }));

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: `You are ${agentName}, an AI assistant inside DOMYX AI. ${instructions} Be honest about uncertainty, never claim to have performed actions you have not performed, and keep answers clear and useful.`,
        input,
        max_output_tokens: 1400
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      const message = typeof data?.error?.message === "string" ? data.error.message : "The AI provider returned an error.";
      return NextResponse.json({ error: message }, { status: upstream.status === 429 ? 429 : 502 });
    }

    const reply = typeof data.output_text === "string" ? data.output_text :
      (data.output || []).flatMap((item: any) => item.content || [])
        .filter((part: any) => part.type === "output_text")
        .map((part: any) => part.text).join("\n");
    if (!reply) return NextResponse.json({ error: "The AI returned an empty response. Please try again." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The AI request timed out. Please try again."
      : "The AI service could not be reached. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
