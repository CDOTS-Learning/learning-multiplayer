import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips, FinalBoard, PersonaDecide, PersonaOverview, BackpackScene, BackpackView } from "@/components/game-parts";
import { FRAMING, ROUNDS, BACKPACK_FRAMING, personaIntakeInfo, PERSONA_INTAKE_LAST, personaRows, roundOptionText } from "@shared/content";
import { printHtml, esc } from "@/lib/print";
import { backpackImageHtml } from "@/lib/backpack-svg";

const SKIP_REFLECTION = ["selecting", "revealing", "reflectionSelfBoard", "personaRound", "reflectionCompare"];
const SKIP_BACKPACK = ["backpackDemo", "backpackBuilding1", "backpackSelfBoard", "backpackBuilding2", "backpackCompare"];

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState, myId } = room;

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Opening your session…"}
        </div>
      </div>
    );
  }

  const connected = gameState.players.filter((p) => p.isConnected).length;
  const canStart = connected >= 2;
  const content = ROUNDS[gameState.round - 1];
  const isLastRound = gameState.round >= gameState.totalRounds;
  const persona = gameState.persona;
  const phase = gameState.phase;
  const personaName = persona.name || "the persona";
  const isController = myId === gameState.controllerId;
  const personaDriver =
    gameState.controllerId === gameState.facilitator?.id
      ? "you"
      : gameState.players.find((p) => p.id === gameState.controllerId)?.name ?? "no one yet";
  const backpackOf = (name: string) => gameState.backpacks.find((b) => b.playerName === name)?.items ?? [];

  // ---- Export documents ----
  const boardDoc = () => {
    const players = gameState.players;
    const header = players.map((p) => `<th>${esc(p.name)}</th>`).join("") + `<th>${esc(persona.name || "Persona")}</th>`;
    const rows = ROUNDS.map((r, ri) => {
      const round = ri + 1;
      const cells = players.map((p) => {
        const a = gameState.answers.find((x) => x.round === round && x.playerName === p.name);
        return `<td>${esc((a ? roundOptionText(ri, a.optionIndex, a.otherText) : null) ?? "—")}</td>`;
      }).join("");
      const pIdx = gameState.personaAnswers?.[ri] ?? -1;
      return `<tr><td class="q">${esc(r.topic)}</td>${cells}<td>${esc((pIdx >= 0 ? roundOptionText(ri, pIdx, gameState.personaOtherTexts?.[ri]) : null) ?? "—")}</td></tr>`;
    }).join("");
    return `<p class="k">Reflection</p><h1>How the group answered</h1>
      <table><thead><tr><th></th>${header}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const backpackDoc = () => {
    const cards = [backpackImageHtml(`For ${persona.name || "the persona"}`, gameState.sharedBackpack, gameState.maxItems)]
      .concat(gameState.players.map((p) => backpackImageHtml(p.name, backpackOf(p.name), gameState.maxItems)));
    return `<p class="k">Backpacks</p><h1>What the group packed</h1>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;">${cards.map((c) => `<div style="flex:1;min-width:230px;">${c}</div>`).join("")}</div>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const personaCardDoc = () => {
    const rows = personaRows(persona);
    const colors = [["#f4ddd0", "#a6552f"], ["#f1e6c6", "#927016"], ["#dfe8d2", "#57703e"], ["#d8e3e9", "#456f80"], ["#e8dbe8", "#7a5578"], ["#d3e6df", "#3f7d6e"], ["#f1dad7", "#a8514c"]];
    const cards = rows.map((r, i) => {
      const [bg, ink] = colors[i % 7];
      return `<div style="background:${bg};border-radius:14px;padding:12px 14px;break-inside:avoid;">
        <div style="font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:${ink};margin-bottom:5px;">${esc(r.label)}</div>
        <div style="font:500 15px/1.25 Georgia,serif;color:#241d12;">${esc(r.value || "—")}</div></div>`;
    }).join("");
    const commentCard = `<div style="background:#faf5ec;border:1px dashed #cbb99d;border-radius:14px;padding:12px 14px;break-inside:avoid;">
      <div style="font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b5d4c;margin-bottom:5px;">Other comments</div>
      <div style="font:400 15px/1.4 Georgia,serif;color:#241d12;white-space:pre-wrap;">${esc(persona.comment.trim() || "—")}</div></div>`;
    const avatar = `<svg width="120" height="120" viewBox="0 0 100 100" style="display:block;margin:0 auto;">
      <circle cx="50" cy="50" r="48" fill="#f6efe1" stroke="#d9c6a5" stroke-width="2"/>
      <circle cx="50" cy="40" r="17" fill="#b7a687"/>
      <path d="M22 82 C22 63 36 56 50 56 C64 56 78 63 78 82 Z" fill="#b7a687"/></svg>`;
    return `<div style="text-align:center;margin:2px 0 18px;">${avatar}
      <p class="k" style="margin-top:12px;">Learning persona</p>
      <h1 style="margin:2px 0 0;">${esc(persona.name || "—")}</h1></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${cards}${commentCard}</div>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const snapshotDoc = () =>
    personaCardDoc() +
    `<div style="page-break-before:always;"></div>` + boardDoc() +
    `<div style="page-break-before:always;"></div>` + backpackDoc();

  const canSkip = SKIP_REFLECTION.includes(phase) || SKIP_BACKPACK.includes(phase);
  const skipLbl = SKIP_REFLECTION.includes(phase) ? "Skip the reflection →" : "Skip the backpack →";
  const skipBtn = canSkip ? <button className="tg-btn ghost" onClick={room.skip}>{skipLbl}</button> : null;
  const saveProgressBtn = <button className="tg-btn ghost" onClick={() => printHtml("Progress", snapshotDoc())}>Save progress (PDF)</button>;

  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">
      <RoomBar roleLabel={`Facilitator · ${room.name}`} roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />
      {children}
    </div></div>
  );

  // ---- Lobby ----
  if (phase === "waiting") {
    return shell(
      <>
        <div className="tg-framing">
          <span className="tg-eyebrow">Before we begin</span>
          <p className="intro tg-serif">{FRAMING.intro}</p>
          <p className="note">Share the room code <strong>{roomCode}</strong> — players join from the home page.</p>
        </div>
        <div className="tg-section-label"><span className="tg-eyebrow">In the room ({connected})</span></div>
        <Roster players={gameState.players} />
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn" onClick={room.start} disabled={!canStart}>
            {canStart ? "Start the session →" : "Need at least 2 players"}
          </button>
        </div></div>
      </>
    );
  }

  // ---- Individual reflection: selecting ----
  if (phase === "selecting" && content) {
    return shell(
      <>
        <div className="tg-round-line">
          <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds}</span>
          <Pips round={gameState.round} total={gameState.totalRounds} />
        </div>
        <p className="tg-standing">{FRAMING.standing}</p>
        <h1 className="tg-topic">{content.topic}</h1>
        <div className="tg-section-label">
          <span className="tg-eyebrow">Choosing…</span>
          <span className="tg-count">{gameState.choices.length} of {connected} locked in</span>
        </div>
        <Roster players={gameState.players} choices={gameState.choices} showChoiceState />
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn ghost" onClick={room.revealNow}>Reveal now</button>
        </div></div>
      </>
    );
  }

  // ---- Individual reflection: revealing ----
  if (phase === "revealing") {
    return shell(
      <>
        <div className="tg-round-line">
          <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds} · Reveal</span>
          <Pips round={gameState.round} total={gameState.totalRounds} />
        </div>
        <Reveal round={gameState.round} players={gameState.players} choices={gameState.choices} />
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.nextRound}>{isLastRound ? "See the overview →" : "Next round →"}</button>
        </div></div>
      </>
    );
  }

  // ---- Overview: individual reflection ----
  if (phase === "reflectionSelfBoard") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Overview · everyone’s answers</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the group answered</h1>
        <FinalBoard players={gameState.players} answers={gameState.answers} />
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>Backpack warm-up →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Backpack demo (facilitator packs) ----
  if (phase === "backpackDemo") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Warm-up · your example (players are watching)</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".6rem" }}>{BACKPACK_FRAMING.question}</h1>
        <BackpackScene packed={gameState.demo} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>Next — players pack →</button>
        </div></div>
      </>
    );
  }

  // ---- Individual backpacks (facilitator mirrors) ----
  if (phase === "backpackBuilding1") {
    const allDone = gameState.players.filter((p) => p.isConnected).every((p) => backpackOf(p.name).length === gameState.maxItems);
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Round 1 · everyone packs their own</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.2rem" }}>Following along</h1>
        <div className="bp-compare">
          {gameState.players.map((p) => (
            <BackpackView key={p.id} title={`${p.name} — ${backpackOf(p.name).length}/${gameState.maxItems}`} items={backpackOf(p.name)} maxItems={gameState.maxItems} />
          ))}
        </div>
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>{allDone ? "See the overview →" : "Waiting… (move on anyway)"}</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Overview: individual backpacks ----
  if (phase === "backpackSelfBoard") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Overview · everyone’s backpacks</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What the group packed</h1>
        <div className="bp-compare">
          {gameState.players.map((p) => (
            <BackpackView key={p.id} title={p.name} items={backpackOf(p.name)} maxItems={gameState.maxItems} />
          ))}
        </div>
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>Create the persona →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Persona — solo build (everyone fills their own) ----
  if (phase === "personaSolo") {
    const readyCount = gameState.personas.filter((pp) => pp.done && gameState.players.find((p) => p.name === pp.playerName)?.isConnected).length;
    const allReady = readyCount >= connected && connected > 0;
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Persona · everyone builds their own</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".6rem" }}>Building personas</h1>
        <p className="tg-standing" style={{ marginBottom: "1rem" }}>
          <strong>{readyCount} of {connected}</strong> ready. When everyone’s done, the group moves to the agreement automatically.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: "1.2rem" }}>
          {gameState.players.map((p) => {
            const pp = gameState.personas.find((x) => x.playerName === p.name);
            return (
              <span key={p.id} className="tg-count" style={{ opacity: p.isConnected ? 1 : 0.5 }}>
                {p.name}: {pp?.done ? "done ✓" : "building…"}
              </span>
            );
          })}
        </div>
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
          <button className="tg-btn" onClick={room.flowNext}>{allReady ? "To the agreement →" : "Agree now (don’t wait) →"}</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Persona — agreement (decide one final answer per field) ----
  if (phase === "personaAgree") {
    const info = personaIntakeInfo(gameState.personaStep);
    const atLast = gameState.personaStep >= PERSONA_INTAKE_LAST;
    return shell(
      <>
        <PersonaDecide kind={info.kind} personaIndex={info.index}
          personas={gameState.personas} persona={persona}
          isController={isController} driverLabel={personaDriver} onChange={room.setPersona} />
        <p className="tg-standing" style={{ marginTop: "1rem" }}>Deciding now: <strong>{personaDriver}</strong>.</p>
        <div className="tg-controls"><div className="buttons">
          {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
          <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
          <button className="tg-btn" onClick={room.flowNext}>{atLast ? "Meet the persona →" : "Next →"}</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Persona reveal ----
  if (phase === "personaReveal") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Meet the learning persona</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "The learning persona"}</h1>
        <PersonaOverview persona={persona} />
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
          <button className="tg-btn" onClick={room.flowNext}>Answer as the persona →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Persona round (collaborative) ----
  if (phase === "personaRound") {
    const q = ROUNDS[gameState.personaRoundQ];
    const sel = gameState.personaAnswers[gameState.personaRoundQ] ?? -1;
    const otherIdx = q.options.indexOf("Other");
    const otherText = gameState.personaOtherTexts?.[gameState.personaRoundQ] ?? "";
    const isLastPersonaQ = gameState.personaRoundQ >= gameState.totalRounds - 1;
    return shell(
      <>
        <div className="tg-round-line">
          <span className="tg-eyebrow">As {personaName} · Question {gameState.personaRoundQ + 1} of {gameState.totalRounds}</span>
        </div>
        <h1 className="tg-topic">{q.topic}</h1>
        <p className="tg-standing" style={{ marginBottom: "1rem" }}>Driving now: <strong>{personaDriver}</strong>. The group answers together.</p>
        <div className="tg-options">
          {q.options.map((opt, i) => (
            <button key={i} className={`tg-opt-card ${sel === i ? "sel" : ""} ${isController ? "" : "is-live"}`}
              onClick={isController ? () => room.choosePersona(i, i === otherIdx ? otherText : "") : undefined} aria-disabled={!isController}>
              {opt}
            </button>
          ))}
        </div>
        {sel === otherIdx && (
          isController ? (
            <div className="tg-field" style={{ marginTop: "1rem", maxWidth: "34rem" }}>
              <label className="tg-label" htmlFor="pro">Your own answer</label>
              <input id="pro" className="tg-input" autoFocus placeholder="Type the group’s answer…" maxLength={120}
                value={otherText} onChange={(e) => room.choosePersona(otherIdx, e.target.value)} />
            </div>
          ) : otherText ? (
            <p className="tg-standing" style={{ marginTop: ".8rem" }}>Their answer: <strong>{otherText}</strong></p>
          ) : null
        )}
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
          <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
          <button className="tg-btn" onClick={room.flowNext} disabled={sel < 0}>{isLastPersonaQ ? "See the comparison →" : "Next question →"}</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Overview: reflection compare ----
  if (phase === "reflectionCompare") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Overview · everyone ↔ {personaName}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the persona’s answers compare</h1>
        <FinalBoard players={gameState.players} answers={gameState.answers}
          persona={{ name: persona.name, answers: gameState.personaAnswers, otherTexts: gameState.personaOtherTexts }} />
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>Pack the persona’s backpack →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Shared persona backpack ----
  if (phase === "backpackBuilding2") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">One shared backpack for {personaName}</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".5rem" }}>Pack it together</h1>
        <p className="tg-standing" style={{ marginBottom: "1rem" }}>Driving now: <strong>{personaDriver}</strong>. {isController ? "You have the controls." : ""}</p>
        {isController ? (
          <BackpackScene packed={gameState.sharedBackpack} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
        ) : (
          <BackpackScene packed={gameState.sharedBackpack} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} readOnly />
        )}
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
          <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
          <button className="tg-btn" onClick={room.flowNext}>See the comparison →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Overview: backpack compare ----
  if (phase === "backpackCompare") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Overview · the persona ↔ everyone</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What the group packed for {personaName}</h1>
        <div className="bp-compare">
          <BackpackView title={`For ${persona.name || "the persona"}`} items={gameState.sharedBackpack} maxItems={gameState.maxItems} />
          {gameState.players.map((p) => (
            <BackpackView key={p.id} title={p.name} items={backpackOf(p.name)} maxItems={gameState.maxItems} />
          ))}
        </div>
        <div className="tg-controls"><div className="buttons">
          {skipBtn}
          <button className="tg-btn" onClick={room.flowNext}>See the results →</button>
          {saveProgressBtn}
        </div></div>
      </>
    );
  }

  // ---- Ended · exports ----
  return shell(
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">Complete · {persona.name || "the persona"}</span></div>
      <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>Session complete</h1>
      <PersonaOverview persona={persona} />
      <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Reflection · everyone ↔ the persona</span></div>
      <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the answers compare</h1>
      <FinalBoard players={gameState.players} answers={gameState.answers}
        persona={{ name: persona.name, answers: gameState.personaAnswers }} />
      <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Backpacks · the persona ↔ everyone</span></div>
      <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What was packed</h1>
      <div className="bp-compare">
        <BackpackView title={`For ${persona.name || "the persona"}`} items={gameState.sharedBackpack} maxItems={gameState.maxItems} />
        {gameState.players.map((p) => (
          <BackpackView key={p.id} title={p.name} items={backpackOf(p.name)} maxItems={gameState.maxItems} />
        ))}
      </div>
      <div className="tg-controls" style={{ marginTop: "1.6rem" }}><div className="buttons">
        <button className="tg-btn ghost" onClick={() => printHtml("Learning persona", personaCardDoc())}>Save persona card (PDF)</button>
        <button className="tg-btn ghost" onClick={() => printHtml("Reflection", boardDoc())}>Save reflection (PDF)</button>
        <button className="tg-btn ghost" onClick={() => printHtml("Backpacks", backpackDoc())}>Save backpacks (PDF)</button>
        <button className="tg-btn ghost" onClick={() => printHtml("Everything", snapshotDoc())}>Save everything (PDF)</button>
        <button className="tg-btn" onClick={room.restart}>Run it again</button>
        <button className="tg-btn ghost" onClick={room.leave}>Leave session</button>
      </div></div>
    </>
  );
}
