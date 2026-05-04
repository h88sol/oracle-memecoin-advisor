const sdk = require("@anthropic-ai/sdk");
const Anthropic = sdk.default || sdk;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt || "You are ORACLE, a calm AI memecoin advisor.",
      messages,
    });

    const reply = response.content[0]?.text || "The signal is unclear.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Anthropic API error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
