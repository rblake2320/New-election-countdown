/**
 * Text that came from an external model or feed is untrusted content, not markup.
 * Opus's ET-23 fix renders it as text on the client; the server strips markup too so
 * no other consumer (API clients, exports, logs) ever receives raw HTML from an LLM.
 */
export const LLM_TEXT_MAX_CHARS = 8000;
export const LLM_PROVENANCE = "llm_generated_unverified" as const;

export function stripMarkup(input: unknown, max: number = LLM_TEXT_MAX_CHARS): string {
  if (typeof input !== "string") return "";
  let text = input
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ") // drop active content with its body
    .replace(/<[^>]*>/g, " ")                                            // any remaining tag
    .replace(/&lt;[^&]*&gt;/g, " ")                                      // entity-encoded tags
    .replace(/javascript:/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (text.length > max) text = text.slice(0, max - 1).trimEnd() + "…";
  return text;
}
