import { useState } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips, FinalBoard, PersonaIntake, PersonaOverview } from "@/components/game-parts";
import { FRAMING, ROUNDS, personaIntakeInfo, personaRows, personaPlainText } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState, myId } = room;
  const [copied, setCopied] = useState(false);

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

  const boardDoc = () => {
    const players = gameState.players;
    const personaName = persona.name || "Persona";
    const header = players.map((p) => `<th>${esc(p.name)}</th>`).join("") + `<th>${esc(personaName)}</th>`;
    const rows = ROUNDS.map((r, ri) => {
      const round = ri + 1;
      const cells = players
        .map((p) => {
          const a = gameState.answers.find((x) => x.round === round && x.playerName === p.name);
          return `<td>${esc(a ? r.options[a.optionIndex] : "—")}</td>`;
        })
        .join("");
      const pIdx = gameState.personaAnswers?.[ri] ?? -1;
      const pCell = `<td>${esc(pIdx >= 0 ? r.options[pIdx] : "—")}</td>`;
      return `<tr><td class="q">${esc(r.topic)}</td>${cells}${pCell}</tr>`;
    }).join("");
    return `<p class="k">Group answers</p><h1>How the group answered</h1>
      <table><thead><tr><th></th>${header}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const personaDoc = () => {
    const rows = personaRows(persona)
      .map((r) => `<tr><td class="q">${esc(r.label)}</td><td>${esc(r.value || "—")}</td></tr>`)
      .join("");
    const comment = persona.comment.trim() ? `<tr><td class="q">Other comments</td><td>${esc(persona.comment)}</td></tr>` : "";
    return `<p class="k">Learning persona</p><h1>${esc(persona.name || "—")}</h1>
      <p class="sub">A shared persona built by the group</p>
      <table><tbody>${rows}${comment}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const copyPersona = async () => {
    try {
      await navigator.clipboard.writeText(personaPlainText(persona));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  // Driver of the shared persona (a player, or the facilitator after take control).
  const personaDriver =
    gameState.controllerId === gameState.facilitator?.id
      ? "you"
      : gameState.players.find((p) => p.id === gameState.controllerId)?.name ?? "no one yet";
  const isController = myId === gameState.controllerId;

  return (
    <div className="tg-app">
      <div className="tg-wrap">
        <RoomBar
          roleLabel={`Facilitator · ${room.name}`}
          roomCode={roomCode}
          onLeave={room.leave}
          onCopy={room.copyCode}
        />

        {/* Lobby */}
        {gameState.phase === "waiting" && (
          <>
            <div className="tg-framing">
              <span className="tg-eyebrow">Before we begin</span>
              <p className="intro tg-serif">{FRAMING.intro}</p>
              <p className="note">Share the room code <strong>{roomCode}</strong> — players join from the home page.</p>
            </div>
            <div className="tg-section-label">
              <span className="tg-eyebrow">In the room ({connected})</span>
            </div>
            <Roster players={gameState.players} />
            <div className="tg-controls">
              <div className="buttons">
                <button className="tg-btn" onClick={room.start} disabled={!canStart}>
                  {canStart ? "Start the session →" : "Need at least 2 players"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Picking (facilitator watches who has locked in) */}
        {gameState.phase === "selecting" && content && (
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

            <div className="tg-controls">
              <div className="buttons">
                <button className="tg-btn ghost" onClick={room.revealNow}>Reveal now</button>
              </div>
            </div>
          </>
        )}

        {/* Reveal (the stage to lead discussion from) */}
        {gameState.phase === "revealing" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds} · Reveal</span>
              <Pips round={gameState.round} total={gameState.totalRounds} />
            </div>
            <Reveal round={gameState.round} players={gameState.players} choices={gameState.choices} />
            <div className="tg-controls">
              <div className="buttons">
                <button className="tg-btn" onClick={room.nextRound}>
                  {isLastRound ? "Finish session →" : "Next round →"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Persona intake (facilitator drives; one player holds the pen) */}
        {gameState.phase === "persona" && (() => {
          const info = personaIntakeInfo(gameState.personaStep);
          const nextDisabled =
            info.kind === "personaName" ? persona.name.trim() === ""
            : info.kind === "personaQuestion" ? (persona.answers?.[info.index] ?? -1) < 0
            : false;
          return (
            <>
              <PersonaIntake persona={persona} kind={info.kind} personaIndex={info.index}
                isController={isController} driverLabel={personaDriver} onChange={room.setPersona} />
              <p className="tg-standing" style={{ marginTop: "1rem" }}>Driving now: <strong>{personaDriver}</strong>.</p>
              <div className="tg-controls"><div className="buttons">
                {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
                <button className="tg-btn ghost" onClick={room.personaBack} disabled={gameState.personaStep === 0}>← Back</button>
                <button className="tg-btn" onClick={room.personaNext} disabled={nextDisabled}>Next →</button>
              </div></div>
            </>
          );
        })()}

        {/* Meet the persona (break card) */}
        {gameState.phase === "personaReveal" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Meet the learning persona</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "The learning persona"}</h1>
            <PersonaOverview persona={persona} />
            <div className="tg-controls"><div className="buttons">
              <button className="tg-btn ghost" onClick={room.personaBack}>← Back</button>
              <button className="tg-btn" onClick={room.personaNext}>Answer as the persona →</button>
            </div></div>
          </>
        )}

        {/* Persona round (the group answers together as the persona) */}
        {gameState.phase === "personaRound" && (() => {
          const q = ROUNDS[gameState.personaRoundQ];
          const sel = gameState.personaAnswers[gameState.personaRoundQ] ?? -1;
          const isLastPersonaQ = gameState.personaRoundQ >= gameState.totalRounds - 1;
          return (
            <>
              <div className="tg-round-line">
                <span className="tg-eyebrow">As {persona.name || "the persona"} · Question {gameState.personaRoundQ + 1} of {gameState.totalRounds}</span>
              </div>
              <h1 className="tg-topic">{q.topic}</h1>
              <p className="tg-standing" style={{ marginBottom: "1rem" }}>Driving now: <strong>{personaDriver}</strong>. The group answers together.</p>
              <div className="tg-options">
                {q.options.map((opt, i) => (
                  <button key={i} className={`tg-opt-card ${sel === i ? "sel" : ""} ${isController ? "" : "is-live"}`}
                    onClick={isController ? () => room.choosePersona(i) : undefined} aria-disabled={!isController}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="tg-controls"><div className="buttons">
                {!isController && <button className="tg-btn" onClick={room.takeControl}>Take control</button>}
                <button className="tg-btn ghost" onClick={room.personaBack}>← Back</button>
                <button className="tg-btn" onClick={room.personaNext} disabled={sel < 0}>{isLastPersonaQ ? "See the results →" : "Next question →"}</button>
              </div></div>
            </>
          );
        })()}

        {/* Ended */}
        {gameState.phase === "ended" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Complete · how the group answered</span>
            </div>
            <h1 className="tg-topic">Everyone’s answers, side by side</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers}
              persona={{ name: persona.name, answers: gameState.personaAnswers }} />
            <div className="tg-round-line" style={{ marginTop: "2.4rem" }}>
              <span className="tg-eyebrow">The group’s learning persona</span>
            </div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{persona.name || "The learning persona"}</h1>
            <PersonaOverview persona={persona} />
            <div className="tg-controls">
              <div className="buttons">
                <button className="tg-btn" onClick={copyPersona}>{copied ? "Copied ✓" : "Copy persona"}</button>
                <button className="tg-btn ghost" onClick={() => printHtml("Learning persona", personaDoc())}>Save persona (PDF)</button>
                <button className="tg-btn ghost" onClick={() => printHtml("Group answers", boardDoc())}>Save board (PDF)</button>
                <button className="tg-btn" onClick={room.restart}>Run it again</button>
                <button className="tg-btn ghost" onClick={room.leave}>Leave session</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
