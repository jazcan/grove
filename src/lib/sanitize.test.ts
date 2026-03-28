import { describe, it, expect } from "vitest";
import { escapeHtml, plainTextFromInput } from "./sanitize";

describe("sanitize", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("strips tags for plain text fields", () => {
    expect(plainTextFromInput("<b>hello</b>", 20)).toBe("hello");
  });

  it("truncates to maxLen", () => {
    expect(plainTextFromInput("abcdefghij", 4)).toBe("abcd");
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeHtml(`a & b < c > d "e" 'f'`)).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;"
    );
  });
});
