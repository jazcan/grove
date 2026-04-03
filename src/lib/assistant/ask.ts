import type { AssistantContextPacket } from "@/lib/assistant/context-service";

/**
 * Rules-first Ask: no LLM required. Optional rephrase can wrap this later.
 */
export function buildDeterministicAssistantReply(
  question: string,
  ctx: AssistantContextPacket
): string {
  const q = question.trim().toLowerCase();
  if (!q) {
    return "Ask about today’s schedule, payments, customers, or setup — I use your live dashboard data.";
  }

  if (q.includes("setup") || q.includes("onboarding") || q.includes("publish")) {
    if (!ctx.setup.needsSetup) {
      return "Your setup looks complete: you have services, availability, and a published profile.";
    }
    const parts: string[] = [];
    if (!ctx.setup.hasIdentity) parts.push("confirm your display name and username");
    if (!ctx.setup.hasServices) parts.push("add at least one active service");
    if (!ctx.setup.hasAvailability) parts.push("set weekly availability");
    if (!ctx.setup.isPublished) parts.push("publish your public profile");
    return `Setup still needs: ${parts.join("; ")}. I linked actions in Suggestions when they apply.`;
  }

  if (q.includes("today") || q.includes("schedule") || q.includes("booking")) {
    if (ctx.todayBookings.length === 0) {
      return `No bookings on your calendar today (${ctx.timezone}). Check Bookings for other days.`;
    }
    const lines = ctx.todayBookings.slice(0, 6).map((b) => {
      const t = new Date(b.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return `• ${t} — ${b.customerName} · ${b.serviceName} (${b.status})`;
    });
    return `Today you have ${ctx.todayBookings.length} booking(s):\n${lines.join("\n")}`;
  }

  if (q.includes("pay") || q.includes("unpaid") || q.includes("owe")) {
    if (ctx.unpaidCompletedSample.length === 0) {
      return "No completed visits are waiting on payment in the sample I checked (older unpaid completions).";
    }
    return `You have at least ${ctx.unpaidCompletedSample.length} completed booking(s) still marked unpaid or partially paid. Open Bookings and pick the visit to update payment.`;
  }

  if (q.includes("customer") || q.includes("client")) {
    if (ctx.lapsedCustomerCount > 0) {
      return `About ${ctx.lapsedCustomerCount} account-ready customers haven’t booked in 90+ days — see Suggestions for a follow-up idea.`;
    }
    return "No lapsed-customer pattern jumped out from the current rules. Your customer list in Customers has full history.";
  }

  if (q.includes("help") || q.includes("what can you do")) {
    return "I summarize today’s visits, surface operational suggestions (setup, openings, follow-ups, payments, quiet services), and keep a short activity log — all from your real Handshake data.";
  }

  return "I don’t have a canned answer for that yet. Try asking about today’s bookings, setup, payments, or customers — or use the Suggestions cards for next steps.";
}

export async function maybeRephraseAssistantReply(deterministic: string): Promise<string> {
  const enabled =
    process.env.ASSISTANT_OPENAI_REPHRASE === "true" && !!process.env.OPENAI_API_KEY?.trim();
  if (!enabled) return deterministic;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ASSISTANT_OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Rewrite the assistant message in clear, concise English for a small-business provider. Do not add new facts or numbers. If the input is already good, return it unchanged.",
          },
          { role: "user", content: deterministic },
        ],
      }),
    });
    if (!res.ok) return deterministic;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text || deterministic;
  } catch {
    return deterministic;
  }
}
