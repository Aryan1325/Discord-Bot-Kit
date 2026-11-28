import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEmojiInput, reactionKey } from "./emoji.js";

describe("parseEmojiInput", () => {
  it("parses custom emoji to their numeric ID", () => {
    assert.deepEqual(parseEmojiInput("<:gg:123456789012345678>"), { key: "123456789012345678", reactable: "<:gg:123456789012345678>" });
    assert.equal(parseEmojiInput("<a:dance:123456789012345678>")?.key, "123456789012345678");
  });
  it("parses unicode emoji, ignoring the variation selector", () => {
    assert.equal(parseEmojiInput("🎮")?.key, "🎮");
    assert.equal(parseEmojiInput("❤️")?.key, parseEmojiInput("❤")?.key);
    assert.equal(parseEmojiInput("1️⃣")?.key, "1⃣");
    assert.equal(parseEmojiInput("🇮🇳")?.key, "🇮🇳");
  });
  it("rejects text, empty and oversized input", () => {
    for (const bad of ["", "   ", "hello", "<:x:abc>", "🎮".repeat(20)]) assert.equal(parseEmojiInput(bad), null, bad);
  });
});

describe("reactionKey", () => {
  it("matches what parseEmojiInput stores", () => {
    assert.equal(reactionKey({ id: "123456789012345678", name: "gg" }), "123456789012345678");
    assert.equal(reactionKey({ id: null, name: "❤️" }), parseEmojiInput("❤")?.key);
    assert.equal(reactionKey({ id: null, name: null }), null);
  });
});
