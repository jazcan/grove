const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "get",
  "had",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "its",
  "looking",
  "me",
  "my",
  "need",
  "not",
  "of",
  "on",
  "or",
  "out",
  "see",
  "so",
  "some",
  "that",
  "the",
  "this",
  "to",
  "too",
  "want",
  "was",
  "we",
  "what",
  "when",
  "where",
  "who",
  "with",
  "would",
  "you",
  "your",
]);

export type IntentServiceMatchInput = {
  id: string;
  name: string;
  description: string;
  category: string;
  templateLabel: string;
  templateShort: string;
};

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return normalized
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function haystackFor(s: IntentServiceMatchInput): string {
  return [s.name, s.description, s.category, s.templateLabel, s.templateShort].join(" ");
}

/**
 * Scores active services against free-text intent (keyword overlap). Deterministic and offline.
 */
export function rankServicesByIntent(
  intent: string,
  services: IntentServiceMatchInput[]
): { service: IntentServiceMatchInput; score: number }[] {
  const tokens = tokenize(intent);
  if (!tokens.length) {
    return services.map((service) => ({ service, score: 0 }));
  }

  const scored = services.map((service) => {
    const h = haystackFor(service).toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (h.includes(t)) score += 1;
    }
    if (score > 0 && h.includes(intent.trim().toLowerCase())) {
      score += 2;
    }
    return { service, score };
  });

  scored.sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name));
  return scored;
}
