# Memecoin AI Advisor

_Started 2026-05-04 19:09 UTC_

---

## User

make me an website

its where its an ai, you can talk to and it gives you, memecoin advice, the traders ask you questions and you awnser. make an blue orb you can talk to and it awnsers you

## Assistant

I'll design an original interactive prototype for an AI memecoin advisor with a talking blue orb. Let me ask a few quick questions first to make sure I build the right thing.

_[tool: questions_v2]_

## User

Questions answered:
- vibe: blue and white
- interaction: the user can both talk to you and write 
- ai_real: it should be right awnsers not fake ones 
- orb_motion: Decide for me
- orb_style: 0
- name: dont know yet 
- extras: the orb is the focus and there should be a page docs and you know its should explain what it does 
- tone: good personality
- variations: Decide for me
- tweaks: decide for me

## Assistant

Got it. I'll build a polished blue-and-white AI orb site, real AI answers, with text + voice input, plus a docs page. Let me plan and start building.

_[tool: update_todos]_

_[tool: set_project_title]_

I'll name it **ORACLE** — fits the orb metaphor, blue/white aesthetic, and feels like advice/prophecy. Let me grab the tweaks panel starter and start building.

_[tool: copy_starter_component]_

Now let me build the main page. Plan:

**Aesthetic:** Pure blue (#0040ff family) + white. Inter for UI, Instrument Serif for the orb's voice/headlines. Lots of whitespace, soft animations, calm and oracle-like but not gimmicky.

**Page structure:**
- Top nav: ORACLE wordmark + link to docs
- Center: massive blue orb with radial gradient + animated layers (idle pulse, ripples on speak, particles)
- Below orb: status text ("Ready" / "Listening" / "Thinking" / orb's reply)
- Bottom: text input + mic button + suggested prompts
- Real AI via `window.claude.complete` with memecoin advisor system prompt
- Voice via Web Speech API (SpeechRecognition + speechSynthesis)

Let me write the components in two files: orb visuals + main app.

_[tool: write_file]_

Now the main app with chat, voice, real AI, tweaks, and a docs page.

_[tool: write_file]_

_[tool: write_file]_

Now the main HTML, the docs page, and let me check the tweaks-panel API.

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: grep]_

_[tool: snip]_

I need to fix a few API mismatches in app.jsx before continuing:
- `useTweaks` returns an array, not `{tweaks, setTweak}`
- `TweakSection` takes `label` not `title`
- `TweakSlider` uses `unit` not `suffix`
- `TweaksPanel` takes `title` prop — let me check; from source it accepts `title`. Good.
- `window.claude.complete` may not accept `system` — let me check signature; per system prompt it takes a string OR `{messages: [...]}`. I'll bake the system prompt into the first user message.

_[tool: str_replace_edit]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Built **ORACLE** — an AI memecoin advisor with a talking blue orb.

**Main page (`index.html`):**
- Big animated blue orb (canvas-rendered: radial gradient core, specular highlight, breathing halo, ripple rings, ambient particle swirl)
- Four reactive states — Ready / Listening / Divining / Speaking — each with distinct motion
- Voice in via Web Speech API (mic button, hold-to-talk) + voice out via speech synthesis
- Text input with Enter-to-send
- Real AI answers via `window.claude.complete` — three personalities (Oracle, Analyst, Degen)
- Floating transcript on the right once a conversation starts
- Suggested starter prompts on empty state
- Quiet disclaimer always visible

**Docs page (`docs.html`):** Explains what it does, the orb states, what to ask, with a risk callout and a CTA back to the orb.

**Tweaks:** hue, orb size, particle density, background intensity, personality, voice-on/off.

Voice recognition needs a Chromium-based browser + mic permission to work. If the browser doesn't support it, the mic button is disabled and text-only still works.

## Assistant

## User

Save this design as a PDF: index.html

## Assistant

## User

Save as standalone HTML: index.html

## Assistant

