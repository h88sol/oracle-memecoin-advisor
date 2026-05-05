/* global React, ReactDOM, Orb, useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakSelect */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const BLOOD_TYPES = [
  { value: "O+", label: "O+", desc: "Universal donor" },
  { value: "O-", label: "O-", desc: "Universal donor (Rh-)" },
  { value: "A+", label: "A+", desc: "Most common type" },
  { value: "A-", label: "A-", desc: "" },
  { value: "B+", label: "B+", desc: "" },
  { value: "B-", label: "B-", desc: "" },
  { value: "AB+", label: "AB+", desc: "Universal recipient" },
  { value: "AB-", label: "AB-", desc: "Rare type" },
];

const PEPTIDES = [
  { value: "BPC-157", label: "BPC-157", desc: "Tendon, gut, healing" },
  { value: "TB-500", label: "TB-500", desc: "Soft tissue repair" },
  { value: "Semaglutide", label: "Semaglutide", desc: "Weight loss (GLP-1)" },
  { value: "Tirzepatide", label: "Tirzepatide", desc: "Weight loss (dual)" },
  { value: "CJC-1295", label: "CJC-1295", desc: "GH releasing" },
  { value: "Ipamorelin", label: "Ipamorelin", desc: "GH pulse" },
  { value: "Tesamorelin", label: "Tesamorelin", desc: "Visceral fat" },
  { value: "GHK-Cu", label: "GHK-Cu", desc: "Skin, hair, healing" },
  { value: "Epitalon", label: "Epitalon", desc: "Longevity, telomeres" },
  { value: "MOTS-c", label: "MOTS-c", desc: "Metabolism, mitochondria" },
  { value: "Selank", label: "Selank", desc: "Anxiety, focus" },
  { value: "none", label: "Not on any", desc: "Just exploring" },
];

const GOALS = [
  { value: "Recovery & Healing", label: "Recovery & Healing", desc: "Tendon, ligament, soft-tissue injury" },
  { value: "Sleep & Hormones", label: "Sleep & Hormones", desc: "Deep sleep, GH restoration" },
  { value: "Body Composition", label: "Body Composition", desc: "Reduce fat, improve lipids" },
  { value: "Cognitive Performance", label: "Cognitive Performance", desc: "Focus, memory, mood" },
  { value: "Longevity & Anti-Aging", label: "Longevity & Anti-Aging", desc: "Cellular repair, telomeres, skin" },
  { value: "Strength & Performance", label: "Strength & Performance", desc: "Lean mass, output, recovery" },
];

const TOTAL_STEPS = 3;

function App() {
  const [tweaks, setTweak] = useTweaks(
    /*EDITMODE-BEGIN*/ {
      "hue": 222,
      "orbSize": 280,
      "particleIntensity": 1,
      "bgIntensity": 1
    } /*EDITMODE-END*/
  );

  const [step, setStep] = useState(0); // 0 = welcome, 1-3 = questions, 4 = result
  const [answers, setAnswers] = useState({ bloodType: null, peptide: null, goal: null });
  const [orbState, setOrbState] = useState("idle");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startQuiz = () => setStep(1);

  const select = (key, value) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const next = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // last step → generate analysis
    setLoading(true);
    setError(null);
    setOrbState("thinking");

    const userMessage =
      `Blood type: ${answers.bloodType}. ` +
      `Currently using: ${answers.peptide === "none" ? "no peptides — new to peptides" : answers.peptide}. ` +
      `Goal: ${answers.goal}.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analysis",
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (!res.ok) throw new Error("api error");
      const data = await res.json();
      const reply = String(data.reply || "").trim();
      if (!reply) throw new Error("empty reply");
      setResult(reply);
      setStep(4);
    } catch (e) {
      setError("Couldn't reach the analyzer. Try again in a moment.");
    } finally {
      setLoading(false);
      setOrbState("idle");
    }
  }, [step, answers]);

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const restart = () => {
    setStep(0);
    setAnswers({ bloodType: null, peptide: null, goal: null });
    setResult(null);
    setError(null);
  };

  const stepValid = useMemo(() => {
    if (step === 1) return !!answers.bloodType;
    if (step === 2) return !!answers.peptide;
    if (step === 3) return !!answers.goal;
    return false;
  }, [step, answers]);

  return (
    <div className="page" style={{ "--hue": tweaks.hue }}>
      <BackgroundField hue={tweaks.hue} intensity={tweaks.bgIntensity} />

      <header className="nav">
        <a href="/" className="brand" aria-label="Restart">
          <div className="brand-dot" />
          <span className="brand-name">OCEAN</span>
          <span className="brand-sub">peptide advisor</span>
        </a>
        <nav className="nav-links">
          <a href="/" className="nav-link active">Analyze</a>
          <a href="/docs.html" className="nav-link">Docs</a>
          <a href="/faq.html" className="nav-link">FAQ</a>
          {step !== 0 && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); restart(); }}>
              Restart
            </a>
          )}
        </nav>
      </header>

      <main className="quiz-stage">
        <div className="quiz-orb">
          <Orb state={orbState} hue={tweaks.hue} size={tweaks.orbSize} intensity={tweaks.particleIntensity} />
        </div>

        <div className="quiz-content">
          {step === 0 && <WelcomeStep onStart={startQuiz} />}

          {step >= 1 && step <= 3 && (
            <>
              <ProgressDots step={step} total={TOTAL_STEPS} />
              {step === 1 && (
                <QuestionStep
                  stepNum={1}
                  totalSteps={TOTAL_STEPS}
                  title={<>What's your <span className="hl">blood type</span>?</>}
                  subtitle="Used to match peptides to your physiology."
                  options={BLOOD_TYPES}
                  selected={answers.bloodType}
                  onSelect={(v) => select("bloodType", v)}
                  cols={4}
                />
              )}
              {step === 2 && (
                <QuestionStep
                  stepNum={2}
                  totalSteps={TOTAL_STEPS}
                  title={<>Are you currently on a <span className="hl">peptide</span>?</>}
                  subtitle="We'll check if it fits your blood type and goal."
                  options={PEPTIDES}
                  selected={answers.peptide}
                  onSelect={(v) => select("peptide", v)}
                  cols={3}
                />
              )}
              {step === 3 && (
                <QuestionStep
                  stepNum={3}
                  totalSteps={TOTAL_STEPS}
                  title={<>What do you want to <span className="hl">improve</span>?</>}
                  subtitle="Pick the area you want to prioritize."
                  options={GOALS}
                  selected={answers.goal}
                  onSelect={(v) => select("goal", v)}
                  cols={2}
                />
              )}
            </>
          )}

          {step === 4 && <ResultStep result={result} answers={answers} onRestart={restart} />}
        </div>
      </main>

      {step >= 1 && step <= 3 && (
        <footer className="quiz-footer">
          {error && <div className="quiz-error">{error}</div>}
          <div className="quiz-buttons">
            <button className="btn btn-back" onClick={back} disabled={step === 1 || loading}>
              Back
            </button>
            <button className="btn btn-primary" onClick={next} disabled={!stepValid || loading}>
              {loading ? "Analyzing..." : step === TOTAL_STEPS ? "Get analysis" : "Continue"}
            </button>
          </div>
          <div className="screen-counter">
            Screen 0{step}/0{TOTAL_STEPS + 1}
          </div>
        </footer>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Orb" />
        <TweakSlider label="Hue" min={200} max={260} step={1} value={tweaks.hue} onChange={(v) => setTweak("hue", v)} unit="°" />
        <TweakSlider label="Size" min={200} max={420} step={10} value={tweaks.orbSize} onChange={(v) => setTweak("orbSize", v)} unit="px" />
        <TweakSlider label="Particles" min={0} max={1.5} step={0.05} value={tweaks.particleIntensity} onChange={(v) => setTweak("particleIntensity", v)} />
        <TweakSlider label="Background" min={0} max={1.5} step={0.05} value={tweaks.bgIntensity} onChange={(v) => setTweak("bgIntensity", v)} />
      </TweaksPanel>
    </div>
  );
}

const STARTER_QUESTIONS = [
  "Why should I check my blood type before peptides?",
  "What's the safest peptide for beginners?",
  "How long should I cycle a peptide?",
  "What's the difference between BPC-157 and TB-500?",
  "Are GLP-1 peptides like Semaglutide safe long-term?",
];

const FEATURED_PEPTIDES = [
  "BPC-157", "TB-500", "Semaglutide", "Tirzepatide", "CJC-1295", "Ipamorelin",
  "Tesamorelin", "GHK-Cu", "Epitalon", "MOTS-c", "Selank", "Semax", "PT-141",
  "Thymosin α-1", "DSIP", "5-Amino-1MQ",
];

function WelcomeStep({ onStart }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const askChat = async (question) => {
    const q = (question ?? chatInput).trim();
    if (!q || chatLoading) return;
    setChatInput("");
    const next = [...chatMessages, { role: "user", text: q }];
    setChatMessages(next);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: next.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      if (!res.ok) throw new Error("api");
      const data = await res.json();
      const reply = String(data.reply || "").trim() || "I couldn't pull that up. Try rephrasing.";
      setChatMessages((m) => [...m, { role: "orb", text: reply }]);
    } catch {
      setChatMessages((m) => [...m, { role: "orb", text: "Connection failed. Try again in a moment." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-tag">// PEPTIDE ADVISOR · BLOOD-TYPE MATCHED</div>
      <h1 className="welcome-title">
        The right peptide for <span className="hl">your body</span>.
      </h1>
      <p className="welcome-lede">
        Three quick questions — your blood type, your current peptide (if any), and your goal —
        and the orb tells you whether what you're on fits, plus what to consider next.
      </p>

      <div className="welcome-row">
        <div className="welcome-cta">
          <button className="btn btn-primary" onClick={onStart}>
            Start analysis →
          </button>
        </div>

        <div className="ask-orb">
          <div className="ask-orb-head">
            <span className="ask-orb-dot" />
            <span className="ask-orb-title">Ask the orb</span>
          </div>

          {chatMessages.length === 0 && !chatLoading && (
            <div className="ask-orb-suggest">
              {STARTER_QUESTIONS.map((q) => (
                <button key={q} className="ask-chip" onClick={() => askChat(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {(chatMessages.length > 0 || chatLoading) && (
            <div className="ask-orb-thread" ref={chatScrollRef}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`ask-msg ask-msg-${m.role}`}>
                  <div className="ask-who">{m.role === "user" ? "you" : "ocean"}</div>
                  <div className="ask-text">{m.text}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="ask-msg ask-msg-orb">
                  <div className="ask-who">ocean</div>
                  <div className="ask-text"><span className="thinking-dots"><i></i><i></i><i></i></span></div>
                </div>
              )}
            </div>
          )}

          <div className="ask-orb-input">
            <input
              type="text"
              placeholder="Ask anything about peptides..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askChat();
                }
              }}
              disabled={chatLoading}
            />
            <button
              className="ask-send"
              onClick={() => askChat()}
              disabled={!chatInput.trim() || chatLoading}
              aria-label="Send"
            >→</button>
          </div>
        </div>
      </div>

      <div className="featured-peptides" aria-hidden="true">
        <div className="featured-label">// IN THE LIBRARY</div>
        <div className="featured-track">
          {[...FEATURED_PEPTIDES, ...FEATURED_PEPTIDES].map((p, i) => (
            <span key={i} className="peptide-pill">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ step, total }) {
  return (
    <div className="progress-dots">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`progress-dot ${i + 1 <= step ? "active" : ""}`} />
      ))}
    </div>
  );
}

function QuestionStep({ stepNum, totalSteps, title, subtitle, options, selected, onSelect, cols }) {
  return (
    <div className="question">
      <div className="question-num">QUESTION 0{stepNum} / 0{totalSteps}</div>
      <h2 className="question-title">{title}</h2>
      <p className="question-subtitle">{subtitle}</p>
      <div className={`option-grid cols-${cols}`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${selected === opt.value ? "selected" : ""}`}
            onClick={() => onSelect(opt.value)}
          >
            <div className="option-label">{opt.label}</div>
            {opt.desc && <div className="option-desc">{opt.desc}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function verdictMeta(v) {
  if (v === "good") return { label: "Good fit", tone: "good" };
  if (v === "neutral") return { label: "Neutral fit", tone: "neutral" };
  if (v === "switch") return { label: "Consider switching", tone: "switch" };
  if (v === "starting") return { label: "Starting fresh", tone: "neutral" };
  return { label: v || "—", tone: "neutral" };
}

// Curated reference links — Wikipedia where it exists, otherwise PubMed search.
// Source: peer-reviewed encyclopaedic overviews so users can verify mechanism + research.
const PEPTIDE_REFERENCES = {
  "bpc-157": { url: "https://en.wikipedia.org/wiki/BPC_157", source: "Wikipedia" },
  "tb-500": { url: "https://en.wikipedia.org/wiki/Thymosin_beta-4", source: "Wikipedia (Thymosin β-4)" },
  "thymosin beta-4": { url: "https://en.wikipedia.org/wiki/Thymosin_beta-4", source: "Wikipedia" },
  "thymosin β-4": { url: "https://en.wikipedia.org/wiki/Thymosin_beta-4", source: "Wikipedia" },
  "semaglutide": { url: "https://en.wikipedia.org/wiki/Semaglutide", source: "Wikipedia" },
  "tirzepatide": { url: "https://en.wikipedia.org/wiki/Tirzepatide", source: "Wikipedia" },
  "cjc-1295": { url: "https://en.wikipedia.org/wiki/CJC-1295", source: "Wikipedia" },
  "ipamorelin": { url: "https://en.wikipedia.org/wiki/Ipamorelin", source: "Wikipedia" },
  "tesamorelin": { url: "https://en.wikipedia.org/wiki/Tesamorelin", source: "Wikipedia" },
  "ghk-cu": { url: "https://en.wikipedia.org/wiki/GHK-Cu", source: "Wikipedia" },
  "epitalon": { url: "https://en.wikipedia.org/wiki/Epitalon", source: "Wikipedia" },
  "mots-c": { url: "https://en.wikipedia.org/wiki/MOTS-c", source: "Wikipedia" },
  "selank": { url: "https://en.wikipedia.org/wiki/Selank", source: "Wikipedia" },
  "semax": { url: "https://en.wikipedia.org/wiki/Semax", source: "Wikipedia" },
  "dsip": { url: "https://en.wikipedia.org/wiki/Delta_sleep-inducing_peptide", source: "Wikipedia" },
  "thymosin alpha-1": { url: "https://en.wikipedia.org/wiki/Thymalfasin", source: "Wikipedia (Thymalfasin)" },
  "thymosin α-1": { url: "https://en.wikipedia.org/wiki/Thymalfasin", source: "Wikipedia" },
  "thymalfasin": { url: "https://en.wikipedia.org/wiki/Thymalfasin", source: "Wikipedia" },
  "pt-141": { url: "https://en.wikipedia.org/wiki/Bremelanotide", source: "Wikipedia (Bremelanotide)" },
  "bremelanotide": { url: "https://en.wikipedia.org/wiki/Bremelanotide", source: "Wikipedia" },
  "5-amino-1mq": { url: "https://pubmed.ncbi.nlm.nih.gov/?term=5-amino-1mq", source: "PubMed" },
};

function peptideReference(name) {
  if (!name) return null;
  const lower = String(name).toLowerCase().trim();
  if (PEPTIDE_REFERENCES[lower]) return PEPTIDE_REFERENCES[lower];
  // Stacks like "CJC-1295 + Ipamorelin" — link to the first peptide
  const first = lower.split(/[+,/]/)[0].trim();
  if (PEPTIDE_REFERENCES[first]) return PEPTIDE_REFERENCES[first];
  // Fallback: PubMed search
  return {
    url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(name)}`,
    source: "PubMed",
  };
}

function ResultStep({ result, answers, onRestart }) {
  let parsed = null;
  try {
    parsed = typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    parsed = null;
  }

  if (!parsed || !parsed.recommendations) {
    return (
      <div className="result">
        <div className="result-tag">// YOUR ANALYSIS</div>
        <h2 className="result-title">
          Based on your <span className="hl">{answers.bloodType}</span> blood type
        </h2>
        <div className="result-body">{String(result || "No analysis returned. Try again.")}</div>
        <button className="btn btn-primary" onClick={onRestart}>Run another analysis</button>
      </div>
    );
  }

  const v = verdictMeta(parsed.current?.verdict);

  return (
    <div className="result">
      <div className="result-tag">// YOUR ANALYSIS</div>
      <h2 className="result-title">
        Based on your <span className="hl">{answers.bloodType}</span> blood type
      </h2>

      <div className="current-card">
        <div className="current-meta">
          <span className="current-label">Currently</span>
          <span className="current-name">{parsed.current?.name || answers.peptide}</span>
          <span className={`verdict-pill verdict-${v.tone}`}>{v.label}</span>
        </div>
        {parsed.current?.summary && <p className="current-summary">{parsed.current.summary}</p>}
      </div>

      <div className="rec-grid">
        {parsed.recommendations.slice(0, 2).map((rec, i) => {
          const ref = peptideReference(rec.name);
          return (
            <div key={i} className="rec-card">
              <div className="rec-num">RECOMMENDED 0{i + 1}</div>
              <div className="rec-name">{rec.name}</div>
              <div className="rec-stats">
                {rec.dose && (
                  <div className="rec-stat">
                    <div className="rec-stat-label">Dose</div>
                    <div className="rec-stat-value">{rec.dose}</div>
                  </div>
                )}
                {rec.schedule && (
                  <div className="rec-stat">
                    <div className="rec-stat-label">Schedule</div>
                    <div className="rec-stat-value">{rec.schedule}</div>
                  </div>
                )}
                {rec.duration && (
                  <div className="rec-stat">
                    <div className="rec-stat-label">Cycle</div>
                    <div className="rec-stat-value">{rec.duration}</div>
                  </div>
                )}
              </div>
              {rec.why && <div className="rec-why">{rec.why}</div>}
              {ref && (
                <a className="rec-link" href={ref.url} target="_blank" rel="noopener noreferrer">
                  Read more on {ref.source} →
                </a>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-restart" onClick={onRestart}>
        Run another analysis
      </button>
      <p className="result-disclaimer">
        {parsed.note || "Educational only — not medical advice. Always consult a qualified physician before starting any peptide."}
      </p>
    </div>
  );
}

function BackgroundField({ hue, intensity }) {
  return (
    <div className="bg" aria-hidden style={{ opacity: intensity }}>
      <div className="bg-grid" />
      <div className="bg-glow" style={{ background: `radial-gradient(60% 50% at 25% 50%, hsla(${hue},100%,55%,0.18), transparent 70%)` }} />
      <div className="bg-glow bg-glow-2" style={{ background: `radial-gradient(40% 30% at 80% 20%, hsla(${hue},100%,60%,0.10), transparent 70%)` }} />
      <div className="bg-vignette" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
