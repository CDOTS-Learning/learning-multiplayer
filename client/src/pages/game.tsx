import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips, FinalBoard, PersonaIntake, PersonaOverview } from "@/components/game-parts";
import { FRAMING, ROUNDS, personaIntakeInfo } from "@shared/content";

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "player");
  const { gameState, myId } = room;

  const [pending, setPending] = useState<number | null>(null);

  // Reset the local selection whenever a new round begins.
  useEffect(() => {
    setPending(null);
  }, [gameState?.round, gameState?.phase]);

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Joining the session…"}
        </div>
      </div>
    );
  }

  const connected = gameState.players.filter((p) => p.isConnected).length;
  const myChoice = gameState.choices.find((c) => c.playerId === myId);
  const locked = !!myChoice;
  const content = ROUNDS[gameState.round - 1];

  return (
    <div className="tg-app">
      <div className="tg-wrap">
        <RoomBar roleLabel="Player" roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />

        {/* Lobby */}
        {gameState.phase === "waiting" && (
          <>
            <div className="tg-framing">
              <span className="tg-eyebrow">Before we begin</span>
              <p className="intro tg-serif">{FRAMING.intro}</p>
              <p className="note">{FRAMING.note}</p>
            </div>
            <div className="tg-section-label"><span className="tg-eyebrow">In the room</span></div>
            <Roster players={gameState.players} />
          </>
        )}

        {/* Picking */}
        {gameState.phase === "selecting" && content && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds}</span>
              <Pips round={gameState.round} total={gameState.totalRounds} />
            </div>
            <p className="tg-standing">{FRAMING.standing}</p>
            <h1 className="tg-topic">{content.topic}</h1>

            <div className="tg-options">
              {content.options.map((opt, i) => {
                const isSel = locked ? myChoice!.optionIndex === i : pending === i;
                return (
                  <button
                    key={i}
                    className={`tg-opt-card ${isSel ? "sel" : ""} ${locked ? "locked" : ""}`}
                    onClick={() => !locked && setPending(i)}
                    disabled={locked}
                    aria-pressed={isSel}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="tg-lockbar">
              {locked ? (
                <>
                  <span className="tg-hint"><span className="tg-dot-sage" /> Locked in — waiting for the others</span>
                  <span className="tg-progress">{gameState.choices.length} of {connected} locked in</span>
                </>
              ) : (
                <>
                  <span className="tg-hint"><span className="tg-dot-sage" /> Hidden until everyone has chosen</span>
                  <button className="tg-btn" onClick={() => pending !== null && room.choose(pending)} disabled={pending === null}>
                    Lock in my choice
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Reveal */}
        {gameState.phase === "revealing" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Round {gameState.round} of {gameState.totalRounds} · Reveal</span>
              <Pips round={gameState.round} total={gameState.totalRounds} />
            </div>
            <Reveal round={gameState.round} players={gameState.players} choices={gameState.choices} />
          </>
        )}

        {/* Persona intake (facilitator drives; one player holds the pen) */}
        {gameState.phase === "persona" && (() => {
          const info = personaIntakeInfo(gameState.personaStep);
          const isController = myId === gameState.controllerId;
          const driver = gameState.players.find((p) => p.id === gameState.controllerId)?.name
            || (gameState.controllerId === gameState.facilitator?.id ? "The facilitator" : "Someone");
          return (
            <>
              <PersonaIntake persona={gameState.persona} kind={info.kind} personaIndex={info.index}
                isController={isController} driverLabel={driver} onChange={room.setPersona} />
              {isController ? (
                <p className="tg-standing" style={{ marginTop: "1.2rem" }}>You have the pen — your facilitator moves the group on.</p>
              ) : (
                <div className="tg-controls"><div className="buttons">
                  <button className="tg-btn" onClick={room.takeControl}>Take control</button>
                </div></div>
              )}
            </>
          );
        })()}

        {/* Meet the persona (break card) */}
        {gameState.phase === "personaReveal" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Meet your learning persona</span></div>
            <h1 className="tg-topic" style={{ marginBottom: ".8rem" }}>{gameState.persona.name || "Your persona"}</h1>
            <p className="tg-standing" style={{ marginBottom: "1.6rem" }}>
              Next, you’ll answer the same three questions together as {gameState.persona.name || "them"}.
            </p>
            <PersonaOverview persona={gameState.persona} />
          </>
        )}

        {/* Persona round (answer together as the persona) */}
        {gameState.phase === "personaRound" && (() => {
          const q = ROUNDS[gameState.personaRoundQ];
          const isController = myId === gameState.controllerId;
          const sel = gameState.personaAnswers[gameState.personaRoundQ] ?? -1;
          const driver = gameState.players.find((p) => p.id === gameState.controllerId)?.name
            || (gameState.controllerId === gameState.facilitator?.id ? "The facilitator" : "Someone");
          return (
            <>
              <div className="tg-round-line">
                <span className="tg-eyebrow">As {gameState.persona.name || "the persona"} · Question {gameState.personaRoundQ + 1} of {gameState.totalRounds}</span>
              </div>
              <h1 className="tg-topic">{q.topic}</h1>
              {!isController && (
                <p className="tg-standing" style={{ marginBottom: "1rem" }}><strong>{driver}</strong> is answering for the group — take control to choose.</p>
              )}
              <div className="tg-options">
                {q.options.map((opt, i) => (
                  <button key={i} className={`tg-opt-card ${sel === i ? "sel" : ""} ${isController ? "" : "is-live"}`}
                    onClick={isController ? () => room.choosePersona(i) : undefined} aria-disabled={!isController}>
                    {opt}
                  </button>
                ))}
              </div>
              {isController ? (
                <p className="tg-standing" style={{ marginTop: "1rem" }}>You have the pen — your facilitator moves the group on.</p>
              ) : (
                <div className="tg-controls"><div className="buttons">
                  <button className="tg-btn" onClick={room.takeControl}>Take control</button>
                </div></div>
              )}
            </>
          );
        })()}

        {/* Ended */}
        {gameState.phase === "ended" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">That’s a wrap · how the group answered</span>
            </div>
            <h1 className="tg-topic">Everyone’s answers, side by side</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers}
              persona={{ name: gameState.persona.name, answers: gameState.personaAnswers }} />
            <div className="tg-round-line" style={{ marginTop: "2.4rem" }}>
              <span className="tg-eyebrow">Your group’s learning persona</span>
            </div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>{gameState.persona.name || "The persona"}</h1>
            <PersonaOverview persona={gameState.persona} />
            <div className="tg-controls">
              <div className="buttons">
                <button className="tg-btn ghost" onClick={room.leave}>Leave session</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
