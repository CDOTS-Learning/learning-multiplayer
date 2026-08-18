import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, Roster, Reveal, Pips, FinalBoard } from "@/components/game-parts";
import { FRAMING, ROUNDS } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState } = room;

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

  const boardDoc = () => {
    const players = gameState.players;
    const header = players.map((p) => `<th>${esc(p.name)}</th>`).join("");
    const rows = ROUNDS.map((r, ri) => {
      const round = ri + 1;
      const cells = players
        .map((p) => {
          const a = gameState.answers.find((x) => x.round === round && x.playerName === p.name);
          return `<td>${esc(a ? r.options[a.optionIndex] : "—")}</td>`;
        })
        .join("");
      return `<tr><td class="q">${esc(r.topic)}</td>${cells}</tr>`;
    }).join("");
    return `<p class="k">Group answers</p><h1>How the group answered</h1>
      <table><thead><tr><th></th>${header}</tr></thead><tbody>${rows}</tbody></table>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

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

        {/* Ended */}
        {gameState.phase === "ended" && (
          <>
            <div className="tg-round-line">
              <span className="tg-eyebrow">Complete · how the group answered</span>
            </div>
            <h1 className="tg-topic">Everyone’s answers, side by side</h1>
            <FinalBoard players={gameState.players} answers={gameState.answers} />
            <div className="tg-controls">
              <div className="buttons">
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
