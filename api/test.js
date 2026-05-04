module.exports = async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.status(200).json({
    hasKey: !!key,
    keyPreview: key ? key.slice(0, 14) + "..." : "NOT SET",
    nodeVersion: process.version,
    hasFetch: typeof fetch !== "undefined",
  });
};
