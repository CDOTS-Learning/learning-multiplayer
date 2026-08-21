import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips, FinalBoard, PersonaIntake, PersonaOverview, BackpackScene, BackpackView } from "@/components/game-parts";
import { FRAMING, ROUNDS, BACKPACK_FRAMING, personaIntakeInfo } from "@shared/content";

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
  const myBackpack = gameState.backpacks.find((b) => b.playerName === room.name)?.items ?? [];
  const isController = myId === gameState.controllerId;
  const personaName = gameState.persona.name || "the persona";

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
              <p className="note">A short, guided reflection together — one step at a time. Your facilitator will lead the way.</p>
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

        {/* Overview: individual reflection answers */}
        {gameState.phase === "reflectionSelfBoard" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Everyone’s answers, side by side</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the group answered</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers} />
          </>
        )}

        {/* Backpack demo (facilitator packs; players watch) */}
        {gameState.phase === "backpackDemo" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Warm-up · watch the example</span></div>
            <h1 className="tg-topic" style={{ marginBottom: ".8rem" }}>{BACKPACK_FRAMING.intro}</h1>
            <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>Your facilitator is packing an example — you’ll pack your own next.</p>
            <div className="bp-compare"><BackpackView title="Facilitator’s example" items={gameState.demo} maxItems={gameState.maxItems} /></div>
          </>
        )}

        {/* Backpack: your own */}
        {gameState.phase === "backpackBuilding1" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Your own backpack</span></div>
            <h1 className="tg-topic" style={{ marginBottom: ".6rem" }}>{BACKPACK_FRAMING.question}</h1>
            <BackpackScene packed={myBackpack} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
            {myBackpack.length >= gameState.maxItems && <p className="tg-progress" style={{ marginTop: "1.2rem" }}>Packed — waiting for the others and your facilitator.</p>}
          </>
        )}

        {/* Overview: everyone's backpacks */}
        {gameState.phase === "backpackSelfBoard" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">Everyone’s backpacks, side by side</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What the group packed</h1>
            <div className="bp-compare">
              {gameState.players.map((p) => (
                <BackpackView key={p.id} title={p.name} items={gameState.backpacks.find((b) => b.playerName === p.name)?.items ?? []} maxItems={gameState.maxItems} />
              ))}
            </div>
          </>
        )}

        {/* Persona intake (the pen-holder types AND navigates; others can take control) */}
        {gameState.phase === "persona" && (() => {
          const info = personaIntakeInfo(gameState.personaStep);
          const driver = gameState.players.find((p) => p.id === gameState.controllerId)?.name
            || (gameState.controllerId === gameState.facilitator?.id ? "The facilitator" : "Someone");
          const nextDisabled =
            info.kind === "personaName" ? gameState.persona.name.trim() === ""
            : info.kind === "personaQuestion" ? (gameState.persona.answers?.[info.index] ?? -1) < 0
            : false;
          return (
            <>
              <PersonaIntake persona={gameState.persona} kind={info.kind} personaIndex={info.index}
                isController={isController} driverLabel={driver} onChange={room.setPersona} />
              <div className="tg-controls"><div className="buttons">
                {isController ? (
                  <>
                    <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
                    <button className="tg-btn" onClick={room.flowNext} disabled={nextDisabled}>Next →</button>
                  </>
                ) : (
                  <button className="tg-btn" onClick={room.takeControl}>Take control</button>
                )}
              </div></div>
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
            {isController && (
              <div className="tg-controls"><div className="buttons">
                <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
                <button className="tg-btn" onClick={room.flowNext}>Answer as the persona →</button>
              </div></div>
            )}
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
              <div className="tg-controls"><div className="buttons">
                {isController ? (
                  <>
                    <button className="tg-btn ghost" onClick={room.flowBack}>← Back</button>
                    <button className="tg-btn" onClick={room.flowNext} disabled={sel < 0}>
                      {gameState.personaRoundQ >= gameState.totalRounds - 1 ? "See the comparison →" : "Next question →"}
                    </button>
                  </>
                ) : (
                  <button className="tg-btn" onClick={room.takeControl}>Take control</button>
                )}
              </div></div>
            </>
          );
        })()}

        {/* Overview: persona vs everyone (reflection) */}
        {gameState.phase === "reflectionCompare" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">You all ↔ {personaName}</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the persona’s answers compare</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers}
              persona={{ name: gameState.persona.name, answers: gameState.personaAnswers }} />
          </>
        )}

        {/* Shared persona backpack (one driver at a time) */}
        {gameState.phase === "backpackBuilding2" && (() => {
          const driver = gameState.players.find((p) => p.id === gameState.controllerId)?.name
            || (gameState.controllerId === gameState.facilitator?.id ? "The facilitator" : "Someone");
          return (
            <>
              <div className="tg-round-line"><span className="tg-eyebrow">One shared backpack for {personaName}</span></div>
              <h1 className="tg-topic" style={{ marginBottom: ".5rem" }}>Pack it together</h1>
              <p className="tg-standing" style={{ marginBottom: "1rem" }}>
                {isController ? "You have the controls — pack for the group." : `${driver} is packing. Take control when it’s your turn.`}
              </p>
              {isController ? (
                <BackpackScene packed={gameState.sharedBackpack} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} />
              ) : (
                <>
                  <BackpackScene packed={gameState.sharedBackpack} maxItems={gameState.maxItems} onAdd={room.addItem} onRemove={room.removeItem} readOnly />
                  <div className="tg-controls"><div className="buttons">
                    <button className="tg-btn" onClick={room.takeControl}>Take control</button>
                  </div></div>
                </>
              )}
            </>
          );
        })()}

        {/* Overview: persona backpack vs everyone's */}
        {gameState.phase === "backpackCompare" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">The persona’s backpack ↔ everyone’s</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What the group packed for {personaName}</h1>
            <div className="bp-compare">
              <BackpackView title={`For ${gameState.persona.name || "the persona"}`} items={gameState.sharedBackpack} maxItems={gameState.maxItems} />
              {gameState.players.map((p) => (
                <BackpackView key={p.id} title={p.name} items={gameState.backpacks.find((b) => b.playerName === p.name)?.items ?? []} maxItems={gameState.maxItems} />
              ))}
            </div>
          </>
        )}

        {/* Ended */}
        {gameState.phase === "ended" && (
          <>
            <div className="tg-round-line"><span className="tg-eyebrow">That’s a wrap · thank you</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>Your group’s learning persona</h1>
            <PersonaOverview persona={gameState.persona} />
            <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Reflection · you all ↔ the persona</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>How the answers compare</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers}
              persona={{ name: gameState.persona.name, answers: gameState.personaAnswers }} />
            <div className="tg-round-line" style={{ marginTop: "2.4rem" }}><span className="tg-eyebrow">Backpacks · the persona ↔ everyone</span></div>
            <h1 className="tg-topic" style={{ marginBottom: "1.4rem" }}>What was packed</h1>
            <div className="bp-compare">
              <BackpackView title={`For ${gameState.persona.name || "the persona"}`} items={gameState.sharedBackpack} maxItems={gameState.maxItems} />
              {gameState.players.map((p) => (
                <BackpackView key={p.id} title={p.name} items={gameState.backpacks.find((b) => b.playerName === p.name)?.items ?? []} maxItems={gameState.maxItems} />
              ))}
            </div>
            <div className="tg-controls" style={{ marginTop: "1.6rem" }}>
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
