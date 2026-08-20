import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Player, Choice, Answer, Persona } from "@shared/schema";
import { ROUNDS, PERSONA_QUESTIONS, personaRows } from "@shared/content";

function setAt(arr: number[], i: number, v: number): number[] {
  const next = PERSONA_QUESTIONS.map((_, k) => arr?.[k] ?? -1);
  next[i] = v;
  return next;
}

/** The anonymous default-avatar head used on the persona overview. */
function AvatarHead() {
  return (
    <div className="lp-avatar">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="37" r="20" fill="var(--lp-avatar-fill)" />
        <path d="M18 90 C18 68 34 60 50 60 C66 60 82 68 82 90 Z" fill="var(--lp-avatar-fill)" />
      </svg>
    </div>
  );
}

export function initials(name: string): string {
  const n = (name || "").trim();
  return n ? n[0].toUpperCase() : "?";
}

export function Avatar({ name, index }: { name: string; index: number }) {
  return <span className={`av v${index % 2}`} aria-hidden="true">{initials(name)}</span>;
}

/** Top bar shown inside a room. */
export function RoomBar({
  roleLabel,
  roomCode,
  onLeave,
  onCopy,
}: {
  roleLabel: string;
  roomCode: string;
  onLeave: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="tg-bar">
      <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
        <button className="tg-btn ghost" onClick={onLeave} aria-label="Leave session" style={{ padding: ".5rem .6rem" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="brand">Imagine the perfect training exists</div>
          <div className="role">{roleLabel}</div>
        </div>
      </div>
      <div className="tg-bar-right">
        <button className="tg-code" onClick={copy} title="Copy room code">
          <small>Room</small> {roomCode} {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export function Pips({ round, total }: { round: number; total: number }) {
  return (
    <span className="tg-pips" aria-label={`Round ${round} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`tg-pip ${i < round ? "on" : ""}`} />
      ))}
    </span>
  );
}

/** The roster of players; optionally marks who has locked in a pick this round. */
export function Roster({
  players,
  choices,
  showChoiceState = false,
}: {
  players: Player[];
  choices?: Choice[];
  showChoiceState?: boolean;
}) {
  if (players.length === 0) {
    return <p className="tg-empty">No players yet — share the room code to invite them.</p>;
  }
  return (
    <div className="tg-roster">
      {players.map((p, i) => {
        const chosen = showChoiceState && choices?.some((c) => c.playerId === p.id);
        return (
          <span key={p.id} className={`tg-pchip ${!p.isConnected ? "off" : ""} ${chosen ? "done" : ""}`}>
            <Avatar name={p.name} index={i} />
            {p.name}
            {showChoiceState && (
              <span className="state" title={chosen ? "Locked in" : "Still choosing"}>
                {chosen ? "✓" : "…"}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** The shared reveal "stage": each option with the players who chose it. */
export function Reveal({
  round,
  players,
  choices,
}: {
  round: number;
  players: Player[];
  choices: Choice[];
}) {
  const content = ROUNDS[round - 1];
  if (!content) return null;
  const indexOf = new Map(players.map((p, i) => [p.id, i]));
  // Only count choices that map to a current player (guards against stale ids).
  const valid = choices.filter((c) => indexOf.has(c.playerId));

  return (
    <div>
      <div className="tg-reveal-head">
        <h2 className="tg-serif">{content.topic}</h2>
        <span className="tg-count">{valid.length} of {players.length} chosen</span>
      </div>
      {content.options
        .map((opt, i) => ({ opt, i, pickers: valid.filter((c) => c.optionIndex === i) }))
        // Chosen options rise to the top, unchosen sink to the bottom. Stable
        // sort keeps each group in its original order (no implied 1-2-3 ranking).
        .sort((a, b) => (a.pickers.length > 0 ? 0 : 1) - (b.pickers.length > 0 ? 0 : 1))
        .map(({ opt, i, pickers }) => {
          const hot = pickers.length > 0;
          return (
          <div key={i} className={`tg-opt ${hot ? "hot" : "empty"}`}>
            <span className="name">{opt}</span>
            <span className="tg-chips">
              {pickers.map((c) => {
                const p = players.find((pp) => pp.id === c.playerId)!;
                const idx = indexOf.get(c.playerId) ?? 0;
                return (
                  <span key={c.playerId} className="tg-chip">
                    <Avatar name={p.name} index={idx} />
                    {p.name}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Final overview: rows = the 3 questions, columns = players (and, if given, the
 * group's shared persona), cells = their pick.
 */
export function FinalBoard({
  players,
  answers,
  persona,
}: {
  players: Player[];
  answers: Answer[];
  persona?: { name: string; answers: number[] };
}) {
  return (
    <div className="tg-board">
      {ROUNDS.map((r, ri) => {
        const round = ri + 1;
        const pIdx = persona?.answers?.[ri] ?? -1;
        const pText = pIdx >= 0 ? r.options[pIdx] : null;
        return (
          <div className="tg-board-row" key={ri}>
            <div className="tg-board-qlabel">{r.topic}</div>
            <div className="tg-board-cells">
              {players.map((p, pi) => {
                const a = answers.find((x) => x.round === round && x.playerName === p.name);
                const text = a ? r.options[a.optionIndex] : null;
                return (
                  <div className={`tg-board-cell col${pi % 3} ${text ? "" : "empty"}`} key={p.id}>
                    <span className="who">{p.name}</span>
                    <span className="ans tg-serif">{text ?? "—"}</span>
                  </div>
                );
              })}
              {persona && (
                <div className={`tg-board-cell col-persona ${pText ? "" : "empty"}`} key="persona">
                  <span className="who">{persona.name || "Persona"}</span>
                  <span className="ans tg-serif">{pText ?? "—"}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One screen of the persona intake (name / a single-choice question / the comment).
 * The controller edits a local buffer and pushes each change up; everyone else sees
 * the live server state. Navigation lives with the facilitator.
 */
export function PersonaIntake({
  persona,
  kind,
  personaIndex,
  isController,
  driverLabel,
  onChange,
}: {
  persona: Persona;
  kind: "personaName" | "personaQuestion" | "personaComment";
  personaIndex: number;
  isController: boolean;
  driverLabel?: string;
  onChange: (p: Persona) => void;
}) {
  const [buf, setBuf] = useState<Persona>(persona);
  const [seeded, setSeeded] = useState(false);
  if (isController && !seeded) {
    setSeeded(true);
    setBuf(persona);
  } else if (!isController && seeded) {
    setSeeded(false);
  }
  const view = isController ? buf : persona;
  const push = (next: Persona) => {
    setBuf(next);
    onChange(next);
  };

  const total = 1 + PERSONA_QUESTIONS.length + 1;
  const num = kind === "personaName" ? 1 : kind === "personaComment" ? total : 2 + personaIndex;
  const q = kind === "personaQuestion" ? PERSONA_QUESTIONS[personaIndex] : null;
  const eyebrow = `Learning persona · ${num} of ${total}${q ? ` · ${q.label}` : ""}`;
  const who = driverLabel || "Someone";
  const title =
    kind === "personaName" ? "Give your learning persona a name"
    : kind === "personaComment" ? "Anything else worth noting?"
    : q!.prompt;

  const liveNote = !isController && (
    <p className="tg-standing" style={{ marginBottom: "1.2rem" }}>
      <strong>{who}</strong> is filling this in — you see it live. Take control to type.
    </p>
  );

  return (
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">{eyebrow}</span></div>
      <h1 className="tg-topic">{title}</h1>
      {kind === "personaName" && (
        isController ? (
          <>
            <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>A short handle the group agrees on — the person this training is really for.</p>
            <div className="tg-field" style={{ maxWidth: "34rem" }}>
              <label className="tg-label" htmlFor="pn">Persona name</label>
              <input id="pn" className="tg-input" autoFocus placeholder="e.g. Amara" value={buf.name} maxLength={40}
                onChange={(e) => push({ ...buf, name: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            {liveNote}
            <div className="ls-persona-live"><div className="live-name tg-serif">{view.name || "…"}</div></div>
          </>
        )
      )}

      {kind === "personaComment" && (
        isController ? (
          <>
            <p className="tg-standing" style={{ marginBottom: "1.4rem" }}>Optional — any other detail the group wants to capture.</p>
            <div className="tg-field" style={{ maxWidth: "34rem" }}>
              <label className="tg-label" htmlFor="pc">Other comments</label>
              <textarea id="pc" className="tg-input" rows={4} placeholder="Optional notes…" value={buf.comment} maxLength={600}
                onChange={(e) => push({ ...buf, comment: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            {liveNote}
            <div className="ls-persona-live"><div className="live-desc">{view.comment || "…"}</div></div>
          </>
        )
      )}

      {kind === "personaQuestion" && q && (
        <>
          {liveNote}
          <div className="tg-options">
            {q.options.map((opt, i) => {
              const sel = (view.answers?.[personaIndex] ?? -1) === i;
              return (
                <button key={i} className={`tg-opt-card ${sel ? "sel" : ""} ${isController ? "" : "is-live"}`}
                  onClick={isController ? () => push({ ...buf, answers: setAt(buf.answers, personaIndex, i) }) : undefined}
                  aria-disabled={!isController}>
                  {opt}
                </button>
              );
            })}
          </div>
          {q.allowOther && q.options[(view.answers?.[personaIndex] ?? -1)] === "Other" && (
            isController ? (
              <div className="tg-field" style={{ marginTop: "1rem", maxWidth: "28rem" }}>
                <label className="tg-label" htmlFor="lo">Which language?</label>
                <input id="lo" className="tg-input" autoFocus placeholder="Type the language" value={buf.languageOther} maxLength={40}
                  onChange={(e) => push({ ...buf, languageOther: e.target.value })} />
              </div>
            ) : view.languageOther ? (
              <p className="tg-standing" style={{ marginTop: ".8rem" }}>Language: <strong>{view.languageOther}</strong></p>
            ) : null
          )}
        </>
      )}
    </>
  );
}

/** The pretty persona overview: anonymous avatar centred, answers as colourful cards. */
export function PersonaOverview({ persona }: { persona: Persona }) {
  const rows = personaRows(persona).map((r, i) => ({ ...r, color: `lp-c${(i % 7) + 1}` }));
  const left = rows.filter((_, i) => i % 2 === 0);
  const right = rows.filter((_, i) => i % 2 === 1);
  const card = (r: { label: string; value: string; color: string }, key: number) => (
    <div className={`lp-card ${r.color}`} key={key}>
      <span className="lp-k">{r.label}</span>
      <span className="lp-v">{r.value || "—"}</span>
    </div>
  );
  return (
    <div className="lp-overview">
      <div className="lp-layout">
        <div className="lp-col">{left.map(card)}</div>
        <div className="lp-avatar-block">
          <AvatarHead />
          <span className="tg-eyebrow" style={{ marginTop: "1rem" }}>Learning persona</span>
          <p className="lp-name tg-serif">{persona.name || "Persona"}</p>
        </div>
        <div className="lp-col">{right.map(card)}</div>
      </div>
      {persona.comment.trim() && (
        <div className="lp-comment">
          <span className="lp-k">Other comments</span>
          <span className="lp-v">{persona.comment}</span>
        </div>
      )}
    </div>
  );
}
