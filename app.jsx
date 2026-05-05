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

function WelcomeStep({ onStart }) {
  return (
    <div className="welcome">
      <div className="welcome-tag">// PEPTIDE ADVISOR</div>
      <h1 className="welcome-title">
        The right peptide for <span className="hl">your body</span>.
      </h1>
      <p className="welcome-lede">
        Three quick questions — your blood type, your current peptide (if any), and your goal —
        and we tell you whether what you're on fits, plus what you should consider next.
      </p>
      <button className="btn btn-primary btn-lg" onClick={onStart}>
        Start analysis →
      </button>
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

function ResultStep({ result, answers, onRestart }) {
  return (
    <div className="result">
      <div className="result-tag">// YOUR ANALYSIS</div>
      <h2 className="result-title">
        Based on your <span className="hl">{answers.bloodType}</span> blood type
      </h2>
      <div className="result-summary">
        <div className="result-chip"><strong>Goal:</strong> {answers.goal}</div>
        <div className="result-chip">
          <strong>Currently:</strong> {answers.peptide === "none" ? "Not on any peptide" : answers.peptide}
        </div>
      </div>
      <div className="result-body">{result}</div>
      <button className="btn btn-primary" onClick={onRestart}>
        Run another analysis
      </button>
      <p className="result-disclaimer">
        Educational only — not medical advice. Always consult a qualified physician before starting any peptide.
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
