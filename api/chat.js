const https = require("https");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function callAnthropic(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
    const request = https.request(options, (response) => {
      let raw = "";
      response.on("data", (chunk) => { raw += chunk; });
      response.on("end", () => {
        try { resolve({ status: response.statusCode, data: JSON.parse(raw) }); }
        catch (e) { reject(new Error("Failed to parse Anthropic response")); }
      });
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  let body;
  try { body = await parseBody(req); }
  catch { return res.status(400).json({ error: "Invalid JSON body" }); }

  const { messages, systemPrompt } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  try {
    const { status, data } = await callAnthropic({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      system: systemPrompt || "You are ORACLE, a calm AI memecoin advisor.",
      messages,
    }, apiKey);

    if (status !== 200) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Anthropic error" });
    }

    return res.status(200).json({ reply: data.content?.[0]?.text || "The signal is unclear." });
  } catch (err) {
    console.error("Request failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
