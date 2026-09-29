# Learning Reflection — Multiplayer

A guided reflection for **2–5 players plus a facilitator**. The group answers
three questions as themselves, packs learning backpacks, builds one shared
learner persona, and then goes through the same questions again from the
persona's point of view — so the perspectives can be compared side by side.

- **Live:** https://learning-multiplayer-3lgk.onrender.com
- **Single-player version:** [`learning-singleplayer`](https://github.com/CDOTS-Learning/learning-singleplayer) — same journey for one participant

> Note: the repository is called `learning-multiplayer`. Older local folders may
> still carry the earlier name `training-reflection-multiplayer` — same project.

## How a session runs

1. The facilitator creates a session and shares the six-character room code; the
   players join from the start page.
2. **Three reflection rounds:** everyone picks an answer privately, then the
   facilitator reveals them together. Every question also offers **Other** with
   a free-text field.
3. **Backpack:** the facilitator packs an example, then each player packs three
   things for their own learning journey. One slot is a **"?" card** for
   something of their own.
4. **Persona, part one:** every player builds their *own* persona — a name,
   twelve questions, an open comment — and presses done when finished.
5. **Persona, part two:** the group agrees on one shared persona, question by
   question. Each screen shows the answers people actually gave (with who gave
   them), then the remaining options nobody picked, plus a free-text field for a
   combined answer. One person holds the pen; anyone can **Take control**.
6. **The persona card** is revealed, followed by a **discussion screen** with one
   question the group talks through out loud (nothing is typed there).
7. The same three questions again, now answered **together as the persona**,
   then the comparison board.
8. A backpack for the persona, all backpacks side by side, and the closing
   screen with the full wrap-up and PDF exports.

Nothing is stored. When the session ends, the room is gone — save the PDFs first
if the result matters.

## Changing the text

Almost everything lives in **`shared/content.ts`**:

| What | Where |
|---|---|
| The three reflection questions and their answers | `ROUNDS` — `topic`/`options` is the "as yourself" wording, `topicPersona`/`optionsPersona` the persona wording, `topicNeutral` the heading used on the comparison board |
| The persona questions | `PERSONA_QUESTIONS` — `label`, `prompt`, `options`, and `maxSelect` (how many answers can be picked) |
| The catch-all answer that opens a text field | `PERSONA_OTHER` |
| The question on the discussion screen | `PERSONA_DISCUSSION` |
| The backpack items | `ITEMS` |
| The framing question on the start page | `FRAMING`, `BACKPACK_FRAMING` |
| The player limit | `MAX_PLAYERS` at the top of `server/storage.ts` |

Notes:

- An **"Other"** entry is added to every reflection question automatically — do
  not add it by hand.
- In persona answers, a `/` is written as `A / B`: the invisible character
  before the slash keeps it from starting a new line. Copy that pattern if you
  add options.
- The order of the session lives in `server/storage.ts` (`flowNext` / `flowBack`)
  together with the phase list in `shared/schema.ts`. Adding a question is fine;
  changing the order needs care.

Screen text, headings and buttons: `client/src/pages/` (`home.tsx`, `game.tsx`,
`facilitator.tsx`). The persona intake, the agreement screen, the boards and the
backpack: `client/src/components/game-parts.tsx`. Look and feel:
`client/src/training.css`. Backpack icons: `client/src/components/item-icon.tsx`
and `client/src/lib/backpack-svg.ts`. PDF exports: `facilitator.tsx`.

> This repo and `learning-singleplayer` hold nearly the same content. When you
> change a question, an answer or a persona field, make the same change in both,
> so the two versions do not drift apart.

## Running it locally

```
npm install
PORT=5050 npm run dev      # then open http://localhost:5050
```

Port 5000 is taken by AirPlay on macOS, hence the `PORT=5050`.
To try a real session, open several tabs (or private windows): one creates the
session, the others join with the room code.

## How it is deployed

Render Web Service, runtime **Node**:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- No environment variables, no database.

Every push to `main` triggers a new deployment automatically (about 3 minutes).
The service runs on the team's own Render account — see `RENDER-SETUP.md` for
how it is set up and what to do when a deployment misbehaves.

> **An older copy may still answer at https://learning-multiplayer.onrender.com.**
> That one belongs to the previous maintainer's personal account, receives no
> updates and will disappear. Always share the link at the top of this page.

## Good to know

- **Free hosting:** the first visit after a quiet period takes ~30 seconds while
  the server wakes up. Open the link a minute before a workshop starts.
- **No database, on purpose.** Results exist only while the session is open —
  the PDF export is the only way to keep them.
- Players who lose their connection can rejoin with the same name and keep their
  place and their answers.
- A `PostCSS ... 'from' option` warning during the build is harmless and has
  always been there.

## Where things live

```
client/src/pages/        start page, player view, facilitator view
client/src/components/   persona intake, persona agreement, boards, backpack
client/src/training.css  all styling
shared/content.ts        questions, answers, persona, backpack  ← start here
shared/schema.ts         the shape of the game state and the list of phases
server/routes.ts         the live connection (Socket.IO events)
server/storage.ts        rooms, phases, who holds the pen, validation
```

## Handover

See **`HANDOVER.md`** (what you are taking over and how to change things) and
**`RENDER-SETUP.md`** (the hosting, which still needs an owner).
