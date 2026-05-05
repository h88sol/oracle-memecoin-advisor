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

  const baseSystem = systemPrompt || "You are OCEAN, a calm AI advisor specialized in tech coins. You also know memecoins.";
  const expertise =
    " You specialize in tech coins — crypto projects with real utility and engineering substance: AI tokens, DePIN, L2s, zk, RWA, oracles, infrastructure, modular blockchains, governance, restaking. You are also fully fluent in memecoins and the wider crypto market and can compare tech coins vs memecoins when asked. Cover tokenomics, FDV vs market cap, vesting and unlock cliffs, holder distribution, team credibility and dox status, dev activity, on-chain product metrics (TVL, fee revenue, active users, volume), smart-contract and bridge risk, narrative cycles, DEXs (Uniswap, Raydium, pump.fun) and CEX listings. When the user asks how to avoid a rug or scam, give 2-3 concrete checks: locked LP, holder concentration (top 10 wallets), dev-wallet behavior, mint authority, contract verification, vesting cliffs, social red flags. Be specific. Reference real tools (DexScreener, DefiLlama, RugCheck, Birdeye, GMGN, Etherscan, Solscan, Token Unlocks) when useful.";
  const format =
    " FORMAT: Plain text only. 2-3 short sentences. Under 60 words. No markdown, no bullet points, no asterisks, no emojis, no headers, no preamble. Do not repeat the question. Get straight to the point.";

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
        max_tokens: 160,
        temperature: 0.6,
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
