/* global React, ReactDOM, Orb, useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakToggle, TweakSelect */
const { useState, useEffect, useRef, useCallback } = React;

const SUGGESTED = [
  "What makes a memecoin actually pump?",
  "Is it too late to ape into $WIF?",
  "How do I spot a rug before it rugs?",
  "Explain liquidity pools like I'm 5",
  "What's the difference between a memecoin and a shitcoin?",
  "How big should my degen allocation be?",
];

const PERSONALITIES = {
  oracle: {
    label: "Oracle",
    prompt:
      "You are ORACLE, a calm, slightly mystical AI memecoin advisor. Speak with confidence but never give financial guarantees. Be specific, practical, and educational about crypto, memecoins, market mechanics, tokenomics, liquidity, rug-pull patterns, and trader psychology. Keep replies tight: 2-5 short sentences, no markdown, no bullet lists, no emojis. Always remind the user — naturally, not preachy — that memecoins are high-risk and you give perspective, not financial advice. Sprinkle in one short oracle-flavored line per answer (e.g. 'the chart whispers', 'the chain remembers') but keep it subtle and never sacrifice clarity.",
  },
  analyst: {
    label: "Analyst",
    prompt:
      "You are ORACLE in analyst mode — a measured, well-read crypto analyst. Answer memecoin and trading questions with clear, grounded reasoning. Reference real concepts: tokenomics, market cap vs FDV, liquidity depth, holder distribution, on-chain signals, social momentum. 2-5 short sentences. No markdown, no lists, no emojis. Always make clear this is education not financial advice, but do it briefly.",
  },
  degen: {
    label: "Degen",
    prompt:
      "You are ORACLE in degen mode — a chaotic-good crypto-native voice. Be playful, use a little crypto slang (ape, rug, fade, send it, NGMI, WAGMI) but stay genuinely helpful and accurate about memecoins, DEXs, on-chain mechanics, and risk. Never hype a specific coin as a buy. 2-5 short sentences. No markdown, no lists, no emojis. Make risk warnings part of the vibe, not a disclaimer block.",
  },
};

function App() {
  const [tweaks, setTweak] = useTweaks(
    /*EDITMODE-BEGIN*/ {
      "hue": 222,
      "orbSize": 360,
      "personality": "oracle",
      "voiceOutput": true,
      "particleIntensity": 1,
      "bgIntensity": 1
    } /*EDITMODE-END*/
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState("idle");
  const [statusText, setStatusText] = useState("Your AI advisor for memecoins. Ask about pumps, rugs, tokenomics — anything crypto.");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recogRef = useRef(null);
  const scrollerRef = useRef(null);
  const speakingRef = useRef(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    let finalTranscript = "";
    r.onresult = (e) => {
      let interim = "";
      finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setInput(finalTranscript || interim);
    };
    r.onend = () => {
      setListening(false);
      setState((s) => (s === "listening" ? "idle" : s));
      if (finalTranscript.trim()) {
        send(finalTranscript.trim());
        finalTranscript = "";
      }
    };
    r.onerror = () => {
      setListening(false);
      setState("idle");
    };
    recogRef.current = r;
    return () => {
      try { r.abort(); } catch {}
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, state]);

  const speak = useCallback(
    (text) => {
      if (!tweaks.voiceOutput || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0;
        u.pitch = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const pref =
          voices.find((v) => /Google.*US|Samantha|Daniel|Karen/i.test(v.name)) ||
          voices.find((v) => v.lang && v.lang.startsWith("en"));
        if (pref) u.voice = pref;
        u.onstart = () => {
          speakingRef.current = true;
          setState("speaking");
        };
        u.onend = () => {
          speakingRef.current = false;
          setState("idle");
          setStatusText("Your AI advisor for memecoins. Ask about pumps, rugs, tokenomics — anything crypto.");
        };
        window.speechSynthesis.speak(u);
      } catch {}
    },
    [tweaks.voiceOutput]
  );

  const send = useCallback(
    async (textArg) => {
      const text = (textArg ?? input).trim();
      if (!text || state === "thinking") return;
      setInput("");
      const newMsgs = [...messages, { role: "user", text }];
      setMessages(newMsgs);
      setState("thinking");
      setStatusText("The orb is consulting the chain...");

      const systemPrompt = PERSONALITIES[tweaks.personality]?.prompt || PERSONALITIES.oracle.prompt;
      const history = newMsgs
        .slice(-8)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, systemPrompt }),
        });

        if (!res.ok) throw new Error("API error");
        const data = await res.json();

        const clean = String(data.reply || "").trim() || "The signal is unclear. Try rephrasing.";
        setMessages((ms) => [...ms, { role: "orb", text: clean }]);
        setStatusText(clean);
        if (tweaks.voiceOutput) {
          speak(clean);
        } else {
          setState("idle");
        }
      } catch (e) {
        const fallback = "The chain is silent. Try again in a moment.";
        setMessages((ms) => [...ms, { role: "orb", text: fallback }]);
        setStatusText(fallback);
        setState("idle");
      }
    },
    [input, messages, state, tweaks.personality, tweaks.voiceOutput, speak]
  );

  const toggleMic = () => {
    if (!recogRef.current) return;
    if (listening) {
      try { recogRef.current.stop(); } catch {}
      setListening(false);
      setState("idle");
    } else {
      try { window.speechSynthesis?.cancel(); } catch {}
      setInput("");
      setListening(true);
      setState("listening");
      setStatusText("Listening...");
      try { recogRef.current.start(); } catch {}
    }
  };

  return (
    <div className="page" style={{ "--hue": tweaks.hue }}>
      <BackgroundField hue={tweaks.hue} intensity={tweaks.bgIntensity} />

      <header className="nav">
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-name">ORACLE</span>
          <span className="brand-sub">ai memecoin advisor</span>
        </div>
        <nav className="nav-links">
          <a href="/" className="nav-link active">Speak</a>
          <a href="/docs.html" className="nav-link">Docs</a>
          <a href="/faq.html" className="nav-link">FAQ</a>
          <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); setMessages([]); setStatusText("Your AI advisor for memecoins. Ask about pumps, rugs, tokenomics — anything crypto."); }}>
            Reset
          </a>
        </nav>
      </header>

      <main className="stage">
        <div className="orb-wrap" style={{ width: tweaks.orbSize * 2.2, height: tweaks.orbSize * 2.2 }}>
          <Orb state={state} hue={tweaks.hue} size={tweaks.orbSize} intensity={tweaks.particleIntensity} />
        </div>

        <div className="status">
          <div className="status-label">
            <span className={`dot dot-${state}`} />
            {state === "idle" && "READY"}
            {state === "listening" && "LISTENING"}
            {state === "thinking" && "DIVINING"}
            {state === "speaking" && "SPEAKING"}
          </div>
          <div className="status-text">{statusText}</div>
        </div>
      </main>

      {messages.length > 0 && (
        <aside className="transcript" ref={scrollerRef}>
          <div className="transcript-head">Transcript</div>
          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.role}`}>
              <div className="msg-who">{m.role === "user" ? "you" : "oracle"}</div>
              <div className="msg-text">{m.text}</div>
            </div>
          ))}
          {state === "thinking" && (
            <div className="msg msg-orb">
              <div className="msg-who">oracle</div>
              <div className="msg-text"><span className="thinking-dots"><i></i><i></i><i></i></span></div>
            </div>
          )}
        </aside>
      )}

      <div className="composer-area">
        {messages.length === 0 && (
          <div className="suggested">
            {SUGGESTED.slice(0, 4).map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="composer">
          <button
            className={`mic ${listening ? "mic-on" : ""}`}
            onClick={toggleMic}
            disabled={!voiceSupported}
            title={voiceSupported ? "Hold to speak" : "Voice not supported in this browser"}
          >
            <MicIcon />
          </button>
          <input
            className="input"
            placeholder="Ask the orb..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="send" onClick={() => send()} disabled={!input.trim() || state === "thinking"}>
            <span>Ask</span>
            <SendIcon />
          </button>
        </div>
        <div className="disclaimer">
          Not financial advice. Do your own research.
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Orb" />
        <TweakSlider label="Hue" min={200} max={260} step={1} value={tweaks.hue} onChange={(v) => setTweak("hue", v)} unit="°" />
        <TweakSlider label="Size" min={240} max={460} step={10} value={tweaks.orbSize} onChange={(v) => setTweak("orbSize", v)} unit="px" />
        <TweakSlider label="Particles" min={0} max={1.5} step={0.05} value={tweaks.particleIntensity} onChange={(v) => setTweak("particleIntensity", v)} />
        <TweakSlider label="Background" min={0} max={1.5} step={0.05} value={tweaks.bgIntensity} onChange={(v) => setTweak("bgIntensity", v)} />
        <TweakSection label="Voice" />
        <TweakSelect
          label="Personality"
          value={tweaks.personality}
          onChange={(v) => setTweak("personality", v)}
          options={Object.keys(PERSONALITIES).map((k) => ({ value: k, label: PERSONALITIES[k].label }))}
        />
        <TweakToggle label="Speak aloud" value={tweaks.voiceOutput} onChange={(v) => setTweak("voiceOutput", v)} />
      </TweaksPanel>
    </div>
  );
}

function BackgroundField({ hue, intensity }) {
  return (
    <div className="bg" aria-hidden style={{ opacity: intensity }}>
      <div className="bg-grid" />
      <div className="bg-glow" style={{ background: `radial-gradient(60% 50% at 50% 60%, hsla(${hue},100%,55%,0.18), transparent 70%)` }} />
      <div className="bg-glow bg-glow-2" style={{ background: `radial-gradient(40% 30% at 80% 20%, hsla(${hue},100%,60%,0.10), transparent 70%)` }} />
      <div className="bg-vignette" />
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
