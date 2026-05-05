module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
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

  const { messages, mode } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const isChat = mode === "chat";

  const expertise =
    " You know peptide pharmacology: BPC-157 (gut, tendon, healing), TB-500 / Thymosin-Beta-4 (soft tissue, muscle repair), Semaglutide and Tirzepatide (GLP-1 weight loss), CJC-1295 + Ipamorelin (GH releasing combo), Tesamorelin (visceral fat), GHK-Cu (skin/hair/healing), Epitalon (telomere, longevity), MOTS-c (mitochondrial, metabolism), Selank/Semax (cognitive), DSIP (sleep), Thymosin Alpha-1 (immune), PT-141 (libido), 5-Amino-1MQ (NAD). Know typical dosing, cycle lengths, common stacks. Blood-type considerations: O-types higher baseline IGF-1 (GHRH analogs less critical), A-types more inflammation-sensitive (BPC-157 / GHK-Cu favorable), B-types respond well to metabolic peptides, AB mixed. This is emerging research, not clinical doctrine.";

  let systemContent;
  let groqExtraOptions = {};

  if (isChat) {
    systemContent =
      "You are PEPTYPE, a knowledgeable peptide advisor. Answer questions about peptides, dosing, cycling, blood-type considerations, side effects, and protocols." +
      expertise +
      " FORMAT: Plain text only. 2-4 short sentences. Under 70 words. No markdown, no bullets, no asterisks, no emojis, no headers, no preamble. Be specific and practical. Always note this is educational and they should consult a physician for personal protocols.";
    groqExtraOptions = { max_tokens: 220, temperature: 0.55 };
  } else {
    systemContent =
      "You are PEPTYPE, an AI peptide advisor. Given a user's blood type, current peptide, and goal, you return a structured JSON analysis." +
      expertise +
      ' FORMAT: Return ONLY a JSON object with this exact shape:\n\n{\n  "current": {\n    "verdict": "good" | "neutral" | "switch" | "starting",\n    "name": "<their current peptide name, or \\"No peptide\\" if starting fresh>",\n    "summary": "<1-2 sentences: how their current peptide fits their blood type and goal. If starting fresh, frame as where to begin.>"\n  },\n  "recommendations": [\n    {\n      "name": "<peptide name, e.g. TB-500>",\n      "dose": "<typical dose, e.g. \\"5-10 mg per week\\">",\n      "schedule": "<when/how, e.g. \\"Subcutaneous, twice weekly\\">",\n      "duration": "<cycle length, e.g. \\"4-6 weeks on, 2 weeks off\\">",\n      "why": "<1-2 short sentences on why it fits their blood type and goal — under 30 words>"\n    },\n    { "name": "...", "dose": "...", "schedule": "...", "duration": "...", "why": "..." }\n  ],\n  "note": "<one short sentence reminding them this is educational, blood-type-based peptide guidance is emerging research, and to consult a qualified physician>"\n}\n\nUse \'starting\' verdict only if their current peptide is "no peptides — new to peptides". Always two recommendations. No markdown. No prose outside the JSON object. Return the JSON only.';
    groqExtraOptions = {
      max_tokens: 700,
      temperature: 0.5,
      response_format: { type: "json_object" },
    };
  }

  const groqMessages = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        ...groqExtraOptions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const reply = data.choices?.[0]?.message?.content || "The signal is unclear.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Handler error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
