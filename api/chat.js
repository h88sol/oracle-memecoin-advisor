module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  let body = req.body;
  if (!body) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => { data += chunk; });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: "Invalid request body" });
    }
  }

  const { messages, systemPrompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt || "You are ORACLE, a calm AI memecoin advisor." }],
        },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Gemini API error" });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "The signal is unclear.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Handler error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
