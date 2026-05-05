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

  const { messages, systemPrompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const baseSystem = systemPrompt ||
    "You are OCEAN, an AI peptide advisor that personalizes recommendations to a user's blood type, current peptide use, and goals. You are knowledgeable, practical, and educational — never giving medical advice.";
  const expertise =
    " You know peptide pharmacology cold: BPC-157 (gut, tendon, soft-tissue healing), TB-500 / Thymosin-Beta-4 (soft tissue, muscle repair), Semaglutide and Tirzepatide (GLP-1/dual incretin weight loss), CJC-1295 + Ipamorelin (GH releasing combo), Tesamorelin (visceral fat), GHK-Cu (skin/hair/healing), Epitalon (telomere, longevity), MOTS-c (mitochondrial, metabolism), Selank/Semax (cognitive/anxiolytic), DSIP (sleep), Thymosin Alpha-1 (immune), PT-141 (libido), 5-Amino-1MQ (NAD/metabolism). Know typical dosing ranges, cycle lengths, common stacks, and side-effect profiles. Blood-type considerations in peptide therapy are an emerging area — touch on plausible mechanisms (e.g., O-types tend to have higher IGF-1 baselines so GHRH analogs may be less needed; A-types can be more sensitive to inflammation, making BPC-157 favorable; B-types often respond well to metabolic peptides; AB is mixed) but be honest that this is preliminary, not established clinical practice.";
  const format =
    " FORMAT: Plain text only. Structure your response in 3 short paragraphs separated by blank lines:\n\n1. CURRENT PEPTIDE: brief verdict (good fit / neutral / consider switching) and why, given their blood type and goal. If they said 'no peptides', skip the verdict and instead give a short 'where to start' framing.\n\n2. RECOMMENDED #1: name a peptide that fits their goal and blood-type profile. Include typical dose range and a one-sentence reason why it suits them.\n\n3. RECOMMENDED #2: a second option with the same format. End with a single short note that this is educational, blood-type-based peptide guidance is emerging research, and they should consult a qualified physician.\n\nNo markdown, no bullet points, no asterisks, no emojis, no headers like 'Current peptide:' — write it as flowing paragraphs. Under 200 words total.";

  const groqMessages = [
    { role: "system", content: baseSystem + expertise + format },
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
        max_tokens: 380,
        temperature: 0.55,
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
