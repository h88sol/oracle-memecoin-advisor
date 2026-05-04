const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: systemPrompt || "You are ORACLE, a calm AI memecoin advisor.",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    const reply = response.content[0]?.text || "The signal is unclear.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Anthropic API error:", error);
    return res.status(500).json({ error: "AI service unavailable" });
  }
};
