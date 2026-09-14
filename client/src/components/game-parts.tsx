import { ArrowLeft, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Player, Choice, Answer, Persona, PlayerPersona } from "@shared/schema";
import { ROUNDS, PERSONA_QUESTIONS, isOtherOption, personaRows, personaValue, roundOptionText, roundTopicNeutral, ITEMS, itemName, CUSTOM_PREFIX, CUSTOM_MAX_LEN } from "@shared/content";
import { ItemIcon } from "@/components/item-icon";

function setAt(arr: number[][], i: number, v: number[]): number[][] {
  const next = PERSONA_QUESTIONS.map((_, k) => arr?.[k] ?? []);
  next[i] = v;
  return next;
}

function setOtherAt(arr: string[], i: number, v: string): string[] {
  const next = PERSONA_QUESTIONS.map((_, k) => arr?.[k] ?? "");
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
                    {p.name}{c.otherText ? `: ${c.otherText}` : ""}
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
  persona?: { name: string; answers: number[]; otherTexts?: string[] };
}) {
  return (
    <div className="tg-board">
      {ROUNDS.map((_r, ri) => {
        const round = ri + 1;
        const pIdx = persona?.answers?.[ri] ?? -1;
        const pText = pIdx >= 0 ? roundOptionText(ri, 1, pIdx, persona?.otherTexts?.[ri]) : null;
        return (
          <div className="tg-board-row" key={ri}>
            <div className="tg-board-qlabel">{roundTopicNeutral(ri)}</div>
            <div className="tg-board-cells">
              {players.map((p, pi) => {
                const a = answers.find((x) => x.round === round && x.playerName === p.name);
                const text = a ? roundOptionText(ri, 0, a.optionIndex, a.otherText) : null;
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

      {kind === "personaQuestion" && q && (() => {
        const sel = view.answers?.[personaIndex] ?? [];
        const isOther = (idx: number) => isOtherOption(q.options[idx] ?? "");
        // The limit counts listed options only; "Other" can always be added on top.
        const full = sel.filter((idx) => !isOther(idx)).length >= q.maxSelect;
        const otherPicked = sel.some(isOther);
        const toggle = (i: number) => {
          const cur = buf.answers?.[personaIndex] ?? [];
          const curFull = cur.filter((idx) => !isOther(idx)).length >= q.maxSelect;
          const next = cur.includes(i)
            ? cur.filter((x) => x !== i)
            : (curFull && !isOther(i)) ? cur : [...cur, i];
          push({ ...buf, answers: setAt(buf.answers, personaIndex, next) });
        };
        return (
        <>
          {liveNote}
          {q.maxSelect > 1 && (
            <p className="tg-standing" style={{ marginBottom: ".9rem" }}>Select up to {q.maxSelect} — plus “Other” if you need it.</p>
          )}
          <div className="tg-options">
            {q.options.map((opt, i) => {
              const on = sel.includes(i);
              const locked = !on && full && !isOther(i);
              return (
                <button key={i} className={`tg-opt-card ${on ? "sel" : ""} ${isController ? "" : "is-live"} ${locked ? "pick-full" : ""}`}
                  onClick={isController && !locked ? () => toggle(i) : undefined}
                  aria-disabled={!isController || locked}>
                  {opt}
                </button>
              );
            })}
          </div>
          {otherPicked && (
            isController ? (
              <div className="tg-field" style={{ marginTop: "1rem", maxWidth: "28rem" }}>
                <label className="tg-label" htmlFor="lo">Your own answer</label>
                <input id="lo" className="tg-input" autoFocus placeholder="Type your own answer…" value={buf.otherTexts?.[personaIndex] ?? ""} maxLength={100}
                  onChange={(e) => push({ ...buf, otherTexts: setOtherAt(buf.otherTexts, personaIndex, e.target.value) })} />
              </div>
            ) : (view.otherTexts?.[personaIndex] ?? "") ? (
              <p className="tg-standing" style={{ marginTop: ".8rem" }}>Their answer: <strong>{view.otherTexts[personaIndex]}</strong></p>
            ) : null
          )}
        </>
        );
      })()}
    </>
  );
}

type DecideOption = { value: string; who: string[]; apply: (p: Persona) => Persona };

/**
 * One screen of the group AGREEMENT: for a single field (name / a question /
 * the comment) it shows every player's given answer as a clickable option
 * (with who gave it), then — muted, below — the remaining options nobody
 * picked, in case the discussion lands somewhere new, plus an "Other"
 * free-text for a combined/custom final answer. The pen-holder decides; others watch.
 */
export function PersonaDecide({
  kind, personaIndex, personas, persona, isController, driverLabel, onChange,
}: {
  kind: "personaName" | "personaQuestion" | "personaComment";
  personaIndex: number;
  personas: PlayerPersona[];
  persona: Persona;
  isController: boolean;
  driverLabel?: string;
  onChange: (p: Persona) => void;
}) {
  const [buf, setBuf] = useState<Persona>(persona);
  const [seeded, setSeeded] = useState(false);
  if (isController && !seeded) { setSeeded(true); setBuf(persona); }
  else if (!isController && seeded) { setSeeded(false); }
  const view = isController ? buf : persona;
  const push = (next: Persona) => { setBuf(next); onChange(next); };

  const total = 1 + PERSONA_QUESTIONS.length + 1;
  const num = kind === "personaName" ? 1 : kind === "personaComment" ? total : 2 + personaIndex;
  const q = kind === "personaQuestion" ? PERSONA_QUESTIONS[personaIndex] : null;
  const eyebrow = `Agree together · ${num} of ${total}${q ? ` · ${q.label}` : ""}`;
  const title =
    kind === "personaName" ? "Agree on the persona’s name"
    : kind === "personaComment" ? "Agree on any other comments"
    : q!.prompt;
  const whoLabel = driverLabel || "Someone";
  const noneNote = (
    <p className="tg-standing" style={{ marginBottom: "1rem" }}>
      No answers were given here — {isController ? "pick from the options below or add one under “Other”." : "the driver can pick from the options below or add one under “Other”."}
    </p>
  );
  const head = (
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">{eyebrow}</span></div>
      <h1 className="tg-topic">{title}</h1>
      {!isController && (
        <p className="tg-standing" style={{ marginBottom: "1rem" }}>
          <strong>{whoLabel}</strong> is deciding — you see the choice live. Take control to decide.
        </p>
      )}
    </>
  );

  // ---- A question: agree on up to q.maxSelect of the answers people gave ----
  if (q) {
    const otherIdx = q.options.findIndex((o) => isOtherOption(o));
    const sel = view.answers?.[personaIndex] ?? [];
    // The limit counts listed options only; the "Other" slot can always be added on top.
    const listedCount = (a: number[]) => a.filter((idx) => idx !== otherIdx).length;
    const full = listedCount(sel) >= q.maxSelect;
    const curOther = view.otherTexts?.[personaIndex] ?? "";

    const given = new Map<string, { value: string; optionIndex: number; otherText: string; who: string[] }>();
    for (const pp of personas) {
      for (const idx of pp.persona.answers?.[personaIndex] ?? []) {
        const opt = q.options[idx];
        if (!opt) continue;
        const other = isOtherOption(opt);
        const txt = other ? (pp.persona.otherTexts?.[personaIndex] ?? "").trim() : "";
        const value = other ? (txt || opt) : opt;
        const hit = given.get(value);
        if (hit) { if (!hit.who.includes(pp.playerName)) hit.who.push(pp.playerName); }
        else given.set(value, { value, optionIndex: idx, otherText: txt, who: [pp.playerName] });
      }
    }
    const options = [...given.values()];
    // Everything nobody picked (except the Other slot, which has its own field below).
    const givenIdx = new Set(options.map((o) => o.optionIndex));
    const rest = q.options
      .map((opt, idx) => ({ value: opt, optionIndex: idx, otherText: "", who: [] as string[] }))
      .filter((o) => o.optionIndex !== otherIdx && !givenIdx.has(o.optionIndex));
    const isOn = (o: { optionIndex: number; otherText: string }) =>
      sel.includes(o.optionIndex) &&
      (o.optionIndex !== otherIdx || curOther.trim() === o.otherText);

    const toggle = (o: { optionIndex: number; otherText: string }) => {
      const cur = buf.answers?.[personaIndex] ?? [];
      const on = isOn(o);
      let next = cur;
      if (on) next = cur.filter((x) => x !== o.optionIndex);
      else if (!cur.includes(o.optionIndex)) {
        if (o.optionIndex !== otherIdx && listedCount(cur) >= q.maxSelect) return;
        next = [...cur, o.optionIndex];
      }
      const texts = o.optionIndex === otherIdx
        ? setOtherAt(buf.otherTexts, personaIndex, on ? "" : o.otherText)
        : buf.otherTexts;
      push({ ...buf, answers: setAt(buf.answers, personaIndex, next), otherTexts: texts });
    };

    const otherIsCustom =
      sel.includes(otherIdx) && !options.some((o) => o.optionIndex === otherIdx && o.otherText === curOther.trim());
    // Typing selects the "Other" slot (never blocked by the limit); clearing the text releases it.
    const setOtherText = (text: string) => {
      const cur = buf.answers?.[personaIndex] ?? [];
      const next = text.trim()
        ? (cur.includes(otherIdx) ? cur : [...cur, otherIdx])
        : cur.filter((x) => x !== otherIdx);
      push({ ...buf, answers: setAt(buf.answers, personaIndex, next), otherTexts: setOtherAt(buf.otherTexts, personaIndex, text) });
    };

    return (
      <>
        {head}
        {q.maxSelect > 1 && (
          <p className="tg-standing" style={{ marginBottom: ".9rem" }}>Agree on up to {q.maxSelect} — plus “Other” if you need it.</p>
        )}
        {options.length === 0 && noneNote}
        <div className="tg-options">
          {options.map((o) => {
            const on = isOn(o);
            const locked = !on && full && o.optionIndex !== otherIdx;
            return (
              <button key={o.value} className={`tg-opt-card pd-card ${on ? "sel" : ""} ${isController ? "" : "is-live"} ${locked ? "pick-full" : ""}`}
                onClick={isController && !locked ? () => toggle(o) : undefined} aria-disabled={!isController || locked}>
                <span className="pd-val">{o.value}</span>
                <span className="pd-who">{o.who.join(", ")}</span>
              </button>
            );
          })}
        </div>
        {rest.length > 0 && (
          <>
            <div className="tg-section-label" style={{ margin: "1.4rem 0 .8rem" }}>
              <span className="tg-eyebrow" style={{ color: "var(--tg-ink-soft)" }}>{options.length ? "Not picked by anyone — still open" : "All options"}</span>
            </div>
            <div className="tg-options pd-rest-grid">
              {rest.map((o) => {
                const on = isOn(o);
                const locked = !on && full;
                return (
                  <button key={o.value} className={`tg-opt-card pd-card pd-rest ${on ? "sel" : ""} ${isController ? "" : "is-live"} ${locked ? "pick-full" : ""}`}
                    onClick={isController && !locked ? () => toggle(o) : undefined} aria-disabled={!isController || locked}>
                    <span className="pd-val">{o.value}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="tg-field" style={{ marginTop: "1.1rem", maxWidth: "34rem" }}>
          <label className="tg-label" htmlFor="pdother">Other — a combined / custom answer{otherIsCustom ? " ✓" : ""}</label>
          <input id="pdother" className="tg-input" placeholder={isController ? "Type a combined answer…" : ""}
            value={curOther} maxLength={100} disabled={!isController} onChange={(e) => setOtherText(e.target.value)} />
        </div>
      </>
    );
  }

  // ---- Name / comment: one free-text value ----
  const currentValue = kind === "personaName" ? view.name.trim() : view.comment.trim();
  const givenText = new Map<string, { value: string; who: string[] }>();
  for (const pp of personas) {
    const value = (kind === "personaName" ? pp.persona.name : pp.persona.comment).trim();
    if (!value) continue;
    const hit = givenText.get(value);
    if (hit) hit.who.push(pp.playerName);
    else givenText.set(value, { value, who: [pp.playerName] });
  }
  const textOptions = [...givenText.values()];
  const apply = (text: string) =>
    kind === "personaName" ? push({ ...buf, name: text }) : push({ ...buf, comment: text });
  const isCustom = currentValue.length > 0 && !givenText.has(currentValue);
  const otherValue = isCustom ? currentValue : "";

  return (
    <>
      {head}
      {textOptions.length === 0 && noneNote}
      <div className="tg-options">
        {textOptions.map((o) => {
          const on = currentValue === o.value;
          return (
            <button key={o.value} className={`tg-opt-card pd-card ${on ? "sel" : ""} ${isController ? "" : "is-live"}`}
              onClick={isController ? () => apply(o.value) : undefined} aria-disabled={!isController}>
              <span className="pd-val">{o.value}</span>
              <span className="pd-who">{o.who.join(", ")}</span>
            </button>
          );
        })}
      </div>
      <div className="tg-field" style={{ marginTop: "1.1rem", maxWidth: "34rem" }}>
        <label className="tg-label" htmlFor="pdother">Other — a combined / custom answer{isCustom ? " ✓" : ""}</label>
        {kind === "personaComment" ? (
          <textarea id="pdother" className="tg-input" rows={3} placeholder={isController ? "Type a combined answer…" : ""}
            value={otherValue} maxLength={600} disabled={!isController} onChange={(e) => apply(e.target.value)} />
        ) : (
          <input id="pdother" className="tg-input" placeholder={isController ? "Type a combined answer…" : ""}
            value={otherValue} maxLength={40} disabled={!isController} onChange={(e) => apply(e.target.value)} />
        )}
      </div>
    </>
  );
}

/** The pretty persona overview: anonymous avatar centred, six cards each side. */
export function PersonaOverview({ persona }: { persona: Persona }) {
  const rows = personaRows(persona).map((r, i) => ({ ...r, color: `lp-c${(i % 7) + 1}` }));
  const left = rows.slice(0, 6);
  const right = rows.slice(6);
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
        <div className="lp-col">
          {right.map(card)}
          <div className="lp-card lp-comment-card">
            <span className="lp-k">Other comments</span>
            <span className="lp-v">{persona.comment.trim() || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The drawn backpack illustration (also the drop target). */
function BigBackpack() {
  return (
    <svg className="bp-illus" viewBox="0 0 240 236" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="120" cy="216" rx="82" ry="13" fill="rgba(0,0,0,.13)" />
      <path d="M84 60 C 72 100, 72 160, 92 202" stroke="#a9773f" strokeWidth="11" />
      <path d="M156 60 C 168 100, 168 160, 148 202" stroke="#a9773f" strokeWidth="11" />
      <path d="M64 108 Q64 74 100 70 L140 70 Q176 74 176 108 L176 186 Q176 208 152 208 L88 208 Q64 208 64 186 Z" fill="#cf9a63" stroke="#4a3720" strokeWidth="4" />
      <path d="M106 72 Q106 54 120 54 Q134 54 134 72" stroke="#4a3720" strokeWidth="5" />
      <path d="M66 104 Q66 84 102 82 L138 82 Q174 84 174 104 L174 134 Q174 148 158 148 L82 148 Q66 148 66 134 Z" fill="#bd8850" stroke="#4a3720" strokeWidth="4" />
      <line x1="120" y1="130" x2="120" y2="140" stroke="#4a3720" strokeWidth="4" />
      <rect x="110" y="140" width="20" height="18" rx="4" fill="#9a6b38" stroke="#4a3720" strokeWidth="3" />
      <path d="M92 162 Q92 154 104 154 L136 154 Q148 154 148 162 L148 194 Q148 202 138 202 L102 202 Q92 202 92 194 Z" fill="#c9925a" stroke="#4a3720" strokeWidth="4" />
      <path d="M92 168 L148 168" stroke="#4a3720" strokeWidth="3" />
    </svg>
  );
}

function ItemCard({ id, dragging, onPointerDown }: { id: string; dragging?: boolean; onPointerDown?: (e: React.PointerEvent) => void }) {
  return (
    <div className={`bp-card ${dragging ? "is-dragging" : ""}`} onPointerDown={onPointerDown}>
      <ItemIcon id={id} />
      <span className="bp-name">{itemName(id)}</span>
    </div>
  );
}

type Drag = { id: string; from: "pool" | "pack"; x: number; y: number };

/** Interactive scene: drag pool cards onto the backpack (max N), drag packed ones off to remove. */
export function BackpackScene({
  packed, maxItems, onAdd, onRemove, readOnly = false,
}: {
  packed: string[]; maxItems: number; onAdd: (id: string) => void; onRemove: (id: string) => void; readOnly?: boolean;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const pool = ITEMS.filter((i) => !packed.includes(i.id));
  const full = packed.length >= maxItems;

  const addCustom = () => {
    const text = customText.trim();
    if (!text || full) return;
    onAdd(CUSTOM_PREFIX + text);
    setCustomText("");
    setCustomOpen(false);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const r = dropRef.current?.getBoundingClientRect();
      const over = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (drag.from === "pool" && over && !full && !packed.includes(drag.id)) onAdd(drag.id);
      if (drag.from === "pack" && !over) onRemove(drag.id);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag, full, packed, onAdd, onRemove]);

  const start = (id: string, from: "pool" | "pack") => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDrag({ id, from, x: e.clientX, y: e.clientY });
  };

  return (
    <div className={`bp-scene ${readOnly ? "readonly" : ""}`}>
      <div className="bp-ground" />
      <div className="bp-center">
        <div className={`bp-drop ${drag?.from === "pool" && !full ? "armed" : ""}`} ref={dropRef}>
          <BigBackpack />
          <div className="bp-slots">
            {Array.from({ length: maxItems }).map((_, i) => {
              const id = packed[i];
              return id ? (
                <button key={id} className="bp-slot filled" onPointerDown={start(id, "pack")} title="Drag out to remove">
                  <ItemIcon id={id} size={30} />
                </button>
              ) : (
                <span key={`e${i}`} className="bp-slot empty">+</span>
              );
            })}
          </div>
        </div>
        <p className="bp-count">{packed.length} of {maxItems} packed{!readOnly && full ? " — drag one out to swap" : ""}</p>
      </div>
      <div className="bp-tray">
        {pool.map((it) => (
          <ItemCard key={it.id} id={it.id} dragging={drag?.id === it.id} onPointerDown={start(it.id, "pool")} />
        ))}
        <button type="button" className={`bp-card bp-card-add${readOnly ? " ro" : ""}`}
          onClick={() => !readOnly && !full && setCustomOpen((o) => !o)}
          disabled={readOnly || full}
          title={readOnly ? "Something else — the active player can add one" : full ? "Backpack is full" : "Add your own"}>
          <ItemIcon id={CUSTOM_PREFIX} />
          <span className="bp-name">Something else</span>
        </button>
      </div>

      {!readOnly && customOpen && !full && (
        <div className="bp-custom-row">
          <input className="bp-custom-input" autoFocus maxLength={CUSTOM_MAX_LEN} value={customText}
            placeholder="Name your own item…"
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustom(); if (e.key === "Escape") { setCustomOpen(false); setCustomText(""); } }} />
          <button type="button" className="tg-btn" onClick={addCustom} disabled={!customText.trim()}>Add to backpack</button>
          <button type="button" className="tg-btn ghost" onClick={() => { setCustomOpen(false); setCustomText(""); }}>Cancel</button>
        </div>
      )}

      {drag && (
        <div className="bp-ghost" style={{ left: drag.x, top: drag.y }}>
          <ItemCard id={drag.id} />
        </div>
      )}
    </div>
  );
}

/** Read-only view of a packed backpack (overviews + comparison). */
export function BackpackView({ title, items, maxItems }: { title: string; items: string[]; maxItems: number }) {
  return (
    <div className="bp-view">
      <div className="bp-view-title">{title}</div>
      <div className="bp-view-items">
        {Array.from({ length: maxItems }).map((_, i) => {
          const id = items[i];
          return (
            <div key={i} className={`bp-view-item ${id ? "" : "empty"}`}>
              {id ? <ItemIcon id={id} size={34} /> : <span className="bp-view-dash">—</span>}
              <span className="bp-view-name">{id ? itemName(id) : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One question to talk through out loud — nothing to fill in, nothing stored. */
export function DiscussCard({ eyebrow, question }: { eyebrow: string; question: string }) {
  return (
    <div className="tg-discuss">
      <span className="tg-eyebrow">{eyebrow}</span>
      <p className="tg-discuss-q">{question}</p>
    </div>
  );
}
