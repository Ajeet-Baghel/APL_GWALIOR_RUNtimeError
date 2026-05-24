import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const teams = {
  India: {
    rating: 92,
    players: [
      ["R. Sharma", "Opener", 88],
      ["S. Gill", "Opener", 84],
      ["V. Kohli", "Anchor", 94],
      ["S. Yadav", "Finisher", 90],
      ["H. Pandya", "All-rounder", 86],
      ["R. Jadeja", "All-rounder", 85],
      ["J. Bumrah", "Pacer", 96],
    ],
  },
  Australia: {
    rating: 90,
    players: [
      ["T. Head", "Opener", 92],
      ["M. Marsh", "All-rounder", 86],
      ["S. Smith", "Anchor", 89],
      ["G. Maxwell", "Finisher", 91],
      ["P. Cummins", "Pacer", 91],
      ["M. Starc", "Pacer", 90],
    ],
  },
  England: {
    rating: 87,
    players: [
      ["J. Buttler", "Finisher", 91],
      ["P. Salt", "Opener", 87],
      ["H. Brook", "Middle Order", 86],
      ["S. Curran", "All-rounder", 84],
      ["A. Rashid", "Spinner", 86],
    ],
  },
  "South Africa": {
    rating: 88,
    players: [
      ["Q. de Kock", "Opener", 88],
      ["A. Markram", "Anchor", 84],
      ["H. Klaasen", "Finisher", 92],
      ["K. Rabada", "Pacer", 90],
      ["T. Shamsi", "Spinner", 83],
    ],
  },
};

const formats = ["T20", "ODI", "Test"];
const pitches = ["Balanced", "Flat batting deck", "Dry and turning", "Green seamer", "Slow two-paced"];
const weatherOptions = ["Clear", "Humid", "Dew expected", "Overcast", "Light rain threat"];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const initialEvent = "Match intelligence ready. Ask the Captain Agent for the next move.";
const agentMeta = [
  ["Weather Agent", "Awaiting live sync", "cloud", "weather"],
  ["Stats Agent", "Awaiting live sync", "chart", "cricket"],
  ["Pitch Agent", "Surface mapped", "pitch"],
  ["Strategy Agent", "API ready", "target", "strategy"],
];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function buildAnalysis(inputs) {
  const own = teams[inputs.team];
  const opponent = teams[inputs.opponent];
  const battingRoleRank = {
    Opener: 1,
    Anchor: 2,
    "Middle Order": 3,
    Finisher: 4,
    "All-rounder": 5,
    Spinner: 6,
    Pacer: 7,
  };
  const battingBias = inputs.pitch === "Flat batting deck" ? 6 : inputs.pitch === "Green seamer" ? -5 : 0;
  const chaseBias = inputs.weather === "Dew expected" ? 9 : inputs.weather === "Overcast" ? -3 : 0;
  const formatBias = inputs.format === "T20" ? 3 : inputs.format === "Test" ? -2 : 0;
  const probability = clamp(
    Math.round(50 + (own.rating - opponent.rating) * 2.1 + battingBias + chaseBias + formatBias),
    28,
    84,
  );
  const tossDecision = inputs.weather === "Dew expected"
    ? "Bowl first: dew improves the chase"
    : inputs.weather === "Overcast" || inputs.pitch === "Green seamer"
      ? "Bowl first: attack with the new ball"
      : "Bat first: set scoreboard pressure";
  const bowling = inputs.pitch === "Dry and turning"
    ? "Use spin from over 5. Jadeja through the middle; hold Bumrah for 18 and 20."
    : inputs.pitch === "Green seamer" || inputs.weather === "Overcast"
      ? "Three-over opening burst for Bumrah. Keep two slips early and attack the top order."
      : "Bumrah at 1, 6, 18 and 20. Rotate pace-off overs through the middle.";
  const field = inputs.pitch === "Dry and turning"
    ? "Long-on, deep midwicket and slip for the spinner; tempt the lofted shot."
    : inputs.format === "T20"
      ? "Protect square boundaries with deep point and cow corner; mid-off inside for pressure."
      : "Attacking ring with catching cover; adjust to defensive sweepers after powerplay.";
  const commentary = inputs.weather === "Dew expected"
    ? "The lights are on, dew is settling, and the chase just became a far more inviting proposition."
    : inputs.pitch === "Green seamer"
      ? "That surface has a vivid green tint. The captain will want the new ball speaking immediately."
      : "The crowd is ready and the surface promises a tactical contest between intent and control.";
  const fantasyPicks = [...own.players, ...opponent.players]
    .map((player) => ({ name: player[0], role: player[1], rating: player[2] }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  return {
    probability,
    tossDecision,
    bowling,
    field,
    commentary,
    projectedScore: inputs.format === "T20" ? `${162 + battingBias}-${182 + battingBias}` : inputs.format === "ODI" ? `${274 + battingBias * 2}-${302 + battingBias * 2}` : "First innings 340+",
    order: [...own.players]
      .sort((a, b) => battingRoleRank[a[1]] - battingRoleRank[b[1]] || b[2] - a[2])
      .slice(0, 6),
    fantasyPicks,
  };
}

function Gauge({ probability, team }) {
  return (
    <div className="gauge-wrap">
      <div className="gauge" style={{ "--value": `${probability}%` }}>
        <div className="gauge-inner">
          <strong>{probability}%</strong>
          <span>Win Chance</span>
        </div>
      </div>
      <div>
        <p className="tag green">AI MATCH PREDICTOR</p>
        <h2>{team} favored</h2>
        <p className="muted">Based on pitch, weather, recent form and matchup simulation.</p>
      </div>
    </div>
  );
}

function AgentCard({ name, status, type }) {
  return (
    <div className="agent-card">
      <span className={`agent-icon ${type}`} aria-hidden="true" />
      <div>
        <strong>{name}</strong>
        <p>{status}</p>
      </div>
      <span className="live-dot" />
    </div>
  );
}

async function fetchApi(path, options) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Backend request failed.");
  }
  return body;
}

function App() {
  const [activeView, setActiveView] = useState("Dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const [inputs, setInputs] = useState({
    team: "India",
    opponent: "Australia",
    format: "T20",
    pitch: "Dry and turning",
    weather: "Dew expected",
  });
  const [event, setEvent] = useState(initialEvent);
  const [voiceQuestion, setVoiceQuestion] = useState("Who should bowl the next over?");
  const [voiceStatus, setVoiceStatus] = useState("Ready to listen");
  const [providerStatus, setProviderStatus] = useState({
    weather: "Awaiting live sync",
    cricket: "Awaiting live sync",
    strategy: "Checking API...",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [simulation, setSimulation] = useState({ overs: 0, runs: 0, wickets: 0 });
  const recognitionRef = useRef(null);
  const analysis = useMemo(() => buildAnalysis(inputs), [inputs]);
  const voiceContextRef = useRef({ analysis, inputs });
  const dreamTeam = useMemo(() => {
    const allPlayers = [...teams[inputs.team].players, ...teams[inputs.opponent].players];
    return allPlayers
      .map(([name, role, rating]) => ({ name, role, rating }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 11);
  }, [inputs.team, inputs.opponent]);

  useEffect(() => {
    voiceContextRef.current = { analysis, inputs };
  }, [analysis, inputs]);

  useEffect(() => {
    fetchApi("/health")
      .then(() => setProviderStatus((current) => ({ ...current, strategy: "API online" })))
      .catch(() => setProviderStatus((current) => ({ ...current, strategy: "Local fallback" })));
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Microphone recognition unavailable; type a question instead");
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening...");
    };
    recognition.onresult = (result) => {
      const transcript = result.results[0][0].transcript;
      setVoiceQuestion(transcript);
      answerCaptainQuestion(transcript);
    };
    recognition.onerror = (result) => {
      setVoiceStatus(result.error === "not-allowed" ? "Microphone permission denied" : "Could not hear that; try again");
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function setField(field, value) {
    setInputs((current) => {
      const updated = { ...current, [field]: value };
      if (field === "team" && updated.opponent === value) {
        updated.opponent = Object.keys(teams).find((team) => team !== value);
      }
      if (field === "opponent" && updated.team === value) {
        updated.team = Object.keys(teams).find((team) => team !== value);
      }
      return updated;
    });
  }

  function simulateOver() {
    const runs = Math.floor(Math.random() * 13) + 2;
    const wicket = Math.random() > 0.62 ? 1 : 0;
    setSimulation((current) => ({
      overs: current.overs + 1,
      runs: current.runs + runs,
      wickets: current.wickets + wicket,
    }));
    const possibilities = [
      `WICKET! ${inputs.opponent} lose a batter to a slower ball. Strategy Agent recommends keeping the attacking field.`,
      `A tight four-run over shifts ${inputs.team}'s probability to ${clamp(analysis.probability + 3, 30, 88)}%. Captain Agent says: continue with the matchup.`,
      `Boundary through cover. Weather Agent flags increasing dew; switch to yorkers and protect the straight boundary.`,
      `Two dot balls create pressure. Commentary Agent: "A hush, then a roar - the plan is landing perfectly."`,
    ];
    setEvent(possibilities[Math.floor(Math.random() * possibilities.length)]);
  }

  function speakAnswer(answer) {
    if (!window.speechSynthesis) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(answer.replace("Captain Agent: ", ""));
    utterance.lang = "en-IN";
    utterance.rate = 0.98;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function buildLocalAnswer(question) {
    const current = voiceContextRef.current;
    const normalized = question.toLowerCase();
    let answer;

    if (normalized.includes("bowl") || normalized.includes("bowler") || normalized.includes("over")) {
      answer = current.analysis.bowling;
    } else if (normalized.includes("toss") || normalized.includes("bat first") || normalized.includes("field first")) {
      answer = current.analysis.tossDecision;
    } else if (normalized.includes("win") || normalized.includes("chance") || normalized.includes("probability")) {
      answer = `${current.inputs.team} has a ${current.analysis.probability} percent winning chance in the current conditions.`;
    } else if (normalized.includes("field") || normalized.includes("placement")) {
      answer = current.analysis.field;
    } else if (normalized.includes("dream") || normalized.includes("fantasy") || normalized.includes("captain")) {
      answer = `Choose ${current.analysis.fantasyPicks[0].name} as captain and ${current.analysis.fantasyPicks[1].name} as vice captain.`;
    } else if (normalized.includes("score") || normalized.includes("total") || normalized.includes("target")) {
      answer = `The projected score is ${current.analysis.projectedScore}.`;
    } else {
      answer = `${current.analysis.tossDecision}. ${current.analysis.bowling}`;
    }

    return answer;
  }

  async function answerCaptainQuestion(question) {
    const requestText = question.trim();
    if (!requestText) {
      setVoiceStatus("Type a question first");
      return;
    }

    const current = voiceContextRef.current;
    setIsAsking(true);
    setVoiceStatus("Captain Agent is thinking...");
    try {
      const result = await fetchApi("/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: requestText, match: current.inputs }),
      });
      const response = `Captain Agent: ${result.text}`;
      setProviderStatus((status) => ({ ...status, strategy: "Gemini connected" }));
      setVoiceStatus("Live AI answer delivered");
      setEvent(response);
      speakAnswer(response);
    } catch (error) {
      const response = `Captain Agent (local fallback): ${buildLocalAnswer(requestText)}`;
      setProviderStatus((status) => ({ ...status, strategy: "Local fallback" }));
      setVoiceStatus(`Live AI unavailable: ${error.message}`);
      setEvent(response);
      speakAnswer(response);
    } finally {
      setIsAsking(false);
    }
  }

  function startVoiceAssistant() {
    if (!voiceSupported) {
      answerCaptainQuestion(voiceQuestion);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    recognitionRef.current.start();
  }

  function resetSimulation() {
    setSimulation({ overs: 0, runs: 0, wickets: 0 });
    setEvent("Simulation reset. Captain Agent is ready for a new match scenario.");
  }

  async function syncLiveData() {
    setActiveView("Live Match");
    setIsSyncing(true);
    setProviderStatus((current) => ({ ...current, weather: "Syncing...", cricket: "Syncing..." }));
    try {
      const [weather, cricket] = await Promise.all([
        fetchApi("/weather?city=Mumbai"),
        fetchApi("/cricket/live"),
      ]);
      const venue = weather.name || weather.location?.name || "Mumbai";
      const temperature = weather.main?.temp ?? weather.current?.temp_c;
      const weatherSummary = temperature == null ? `${venue} conditions received` : `${venue}: ${temperature} C`;
      setProviderStatus((current) => ({
        ...current,
        weather: weatherSummary,
        cricket: cricket ? "Feed connected" : "No live matches",
      }));
      setEvent(`Live data synced. Weather at ${weatherSummary}. Cricket provider response received.`);
    } catch (error) {
      setProviderStatus((current) => ({ ...current, weather: "Sync failed", cricket: "Sync failed" }));
      setEvent(`Live data could not be refreshed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  function openView(view) {
    setActiveView(view);
    setProfileOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CA</span>
          <div>
            <strong>CricAgent <em>AI</em></strong>
            <p>Captain Command Center</p>
          </div>
        </div>
        <nav className="nav-links" aria-label="Primary">
          {["Dashboard", "Live Match", "Simulator", "Dream Team"].map((view) => (
            <button
              className={activeView === view ? "active" : ""}
              key={view}
              onClick={() => openView(view)}
              type="button"
            >
              {view}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="pulse" disabled={isSyncing} onClick={syncLiveData} type="button"><i /> {isSyncing ? "SYNCING" : "LIVE DATA"}</button>
          <div className="profile-wrap">
            <button
              aria-expanded={profileOpen}
              aria-label="Captain profile"
              className="avatar"
              onClick={() => setProfileOpen((current) => !current)}
              type="button"
            >
              VK
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <strong>Virat Kohli</strong>
                <span>Captain Analyst Profile</span>
                <button onClick={() => openView("Dream Team")} type="button">Open Dream Team</button>
                <button onClick={() => openView("Dashboard")} type="button">Match Dashboard</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">NEXT-GEN CRICKET INTELLIGENCE</p>
            <h1>Lead Like a <span>Legend.</span><br />Decide Like an AI.</h1>
            <p className="lead">Real-time strategy, multi-agent reasoning, and predictive insights to win the match before the first ball.</p>
          </div>
          <aside className="command-card">
            <div className="panel-title">
              <div><span className="captain-icon" /> Captain Agent</div>
              <small>{isListening ? "LISTENING" : "ONLINE"}</small>
            </div>
            <form className="voice-form" onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
                answerCaptainQuestion(voiceQuestion);
            }}>
              <input
                aria-label="Ask Captain Agent"
                className="question"
                onChange={(changeEvent) => setVoiceQuestion(changeEvent.target.value)}
                value={voiceQuestion}
              />
              <div className="voice-actions">
                <button className={`voice-button${isListening ? " listening" : ""}`} onClick={startVoiceAssistant} type="button">
                  <span className="mic" /> {isListening ? "Stop listening" : "Speak"}
                </button>
                <button className="send-button" disabled={isAsking} type="submit">{isAsking ? "Thinking..." : "Ask"}</button>
              </div>
            </form>
            <p className="voice-status">{voiceStatus}</p>
          </aside>
        </section>

        {activeView === "Dashboard" && (
          <>
            <section className="workspace">
              <article className="control-panel">
                <div className="section-heading">
                  <h3>Match Setup</h3>
                  <span>AUTO ANALYZE</span>
                </div>
                <div className="inputs-grid">
                  <Select label="Your Team" value={inputs.team} options={Object.keys(teams)} onChange={(value) => setField("team", value)} />
                  <Select label="Opponent" value={inputs.opponent} options={Object.keys(teams)} onChange={(value) => setField("opponent", value)} />
                  <Select label="Match Format" value={inputs.format} options={formats} onChange={(value) => setField("format", value)} />
                  <Select label="Pitch Condition" value={inputs.pitch} options={pitches} onChange={(value) => setField("pitch", value)} />
                  <Select label="Weather" value={inputs.weather} options={weatherOptions} onChange={(value) => setField("weather", value)} />
                </div>
                <div className="agent-grid">
                  {agentMeta.map(([name, status, type, provider]) => (
                    <AgentCard key={name} name={name} status={provider ? providerStatus[provider] : status} type={type} />
                  ))}
                </div>
              </article>

              <article className="insights-panel">
                <Gauge probability={analysis.probability} team={inputs.team} />
                <div className="recommendations">
                  <Insight title="Toss Decision" text={analysis.tossDecision} accent="coin" />
                  <Insight title="Bowling Rotation" text={analysis.bowling} accent="ball" />
                  <Insight title="Field Setup" text={analysis.field} accent="field" />
                </div>
              </article>
            </section>

            <section className="bottom-grid">
              <BattingOrder analysis={analysis} />
              <Commentary event={event} defaultCommentary={analysis.commentary} onSimulate={simulateOver} providerStatus={providerStatus} />
            </section>
          </>
        )}
        {activeView === "Live Match" && (
          <section className="feature-grid">
            <article className="match-card">
              <div className="section-heading">
                <h3>Live Match Center</h3>
                <span>DEMO FEED</span>
              </div>
              <div className="scoreboard">
                <div><strong>{inputs.team}</strong><p>{simulation.runs}/{simulation.wickets}</p><small>{simulation.overs}.0 overs</small></div>
                <b>VS</b>
                <div><strong>{inputs.opponent}</strong><p>Yet to bat</p><small>{inputs.format}</small></div>
              </div>
              <button className="primary-action" onClick={simulateOver}>Receive Next Over</button>
            </article>
            <Commentary event={event} defaultCommentary={analysis.commentary} onSimulate={simulateOver} providerStatus={providerStatus} />
          </section>
        )}
        {activeView === "Simulator" && (
          <section className="feature-grid">
            <article className="match-card simulator">
              <div className="section-heading">
                <h3>Match Simulator</h3>
                <span>{inputs.format} MODEL</span>
              </div>
              <Gauge probability={analysis.probability} team={inputs.team} />
              <div className="simulation-score">
                <strong>{inputs.team} {simulation.runs}/{simulation.wickets}</strong>
                <span>after {simulation.overs}.0 overs</span>
              </div>
              <div className="action-row">
                <button className="primary-action" onClick={simulateOver}>Simulate Over</button>
                <button className="secondary-action" onClick={resetSimulation}>Reset</button>
              </div>
            </article>
            <article className="insights-panel tactics-card">
              <div className="section-heading"><h3>Simulation Tactics</h3><span>AGENT OUTPUT</span></div>
              <Insight title="Projected Total" text={analysis.projectedScore} accent="coin" />
              <Insight title="Bowling Plan" text={analysis.bowling} accent="ball" />
              <div className="commentary compact"><p>{event}</p></div>
            </article>
          </section>
        )}
        {activeView === "Dream Team" && (
          <section className="dream-card">
            <div className="section-heading">
              <h3>Dream Team Suggestion</h3>
              <span>AI FANTASY SELECTOR</span>
            </div>
            <p className="feature-lead">Optimized picks from {inputs.team} vs {inputs.opponent}, weighted by performance rating and match conditions.</p>
            <div className="dream-grid">
              {dreamTeam.map((player, index) => (
                <div className="dream-player" key={player.name}>
                  <span>{index + 1}</span>
                  <div><strong>{player.name}</strong><small>{player.role}</small></div>
                  {(index === 0 || index === 1) && <b>{index === 0 ? "C" : "VC"}</b>}
                  <label>{player.rating}</label>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Insight({ title, text, accent }) {
  return (
    <div className="insight">
      <span className={`insight-icon ${accent}`} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function BattingOrder({ analysis }) {
  return (
    <article className="lineup-card">
      <div className="section-heading">
        <h3>Suggested Batting Order</h3>
        <span>Projected {analysis.projectedScore}</span>
      </div>
      <div className="players">
        {analysis.order.map(([name, role, rating], index) => (
          <div className="player" key={name}>
            <b>{index + 1}</b>
            <div><strong>{name}</strong><small>{role}</small></div>
            <label>{rating}</label>
          </div>
        ))}
      </div>
      <div className="fantasy-strip">
        <strong>Fantasy XI AI Picks</strong>
        {analysis.fantasyPicks.map((player, index) => (
          <span key={player.name}>
            {index === 0 ? "C" : index === 1 ? "VC" : "PICK"} {player.name}
          </span>
        ))}
      </div>
    </article>
  );
}

function Commentary({ event, defaultCommentary, onSimulate, providerStatus }) {
  return (
    <article className="commentary-card">
      <div className="section-heading">
        <h3>Live AI Commentary</h3>
        <button onClick={onSimulate}>Simulate Over</button>
      </div>
      <div className="commentary">
        <span className="broadcast">ON AIR</span>
        <p>{event === initialEvent ? defaultCommentary : event}</p>
      </div>
      <div className="api-row">
        <span>Weather: {providerStatus.weather}</span>
        <span>Cricket: {providerStatus.cricket}</span>
        <span>Strategy: {providerStatus.strategy}</span>
      </div>
    </article>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
