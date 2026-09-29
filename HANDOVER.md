# Handover — the five workshop games

This document describes what the team is taking over, how the games are used in
a workshop, and how to change them. It was written as Robin Held handed the
projects over and left the team; there is no longer a single person who knows
the history, so everything worth knowing is written down here.

A second document, **`RENDER-SETUP.md`**, covers the hosting — how the live
links are served and what to do when a deployment misbehaves.

---

## 1. What this is

Five small web applications used in facilitated training sessions. They all work
the same way: a facilitator opens a session, shares a six-character room code,
the participants join from the same start page on their own devices, and
everyone sees the same thing live while the group talks.

| Game | Repository | Live link | Who plays |
|---|---|---|---|
| Prioritization — Single Player | `Priorisation-Singleplayer` | https://priorisation-singleplayer-nu3p.onrender.com | 1 participant + facilitator |
| Prioritization — Multiplayer | `Priorisation-Multiplayer` | https://priorisation-multiplayer-nnsm.onrender.com | 2–5 players + facilitator |
| Learning Reflection — Single Player | `learning-singleplayer` | https://learning-singleplayer-ujcx.onrender.com | 1 participant + facilitator |
| Learning Reflection — Multiplayer | `learning-multiplayer` | https://learning-multiplayer-3lgk.onrender.com | 2–5 players + facilitator |
| Let's Speak Up (English / French) | `lets-speak-up-work` | https://lets-speak-up-work-1.onrender.com | 3–6 players + facilitator |

All five repositories live at **https://github.com/CDOTS-Learning**. Each one has
its own `README.md` with the session flow, the exact files that hold the texts,
and how to run it locally. **Start there** when you want to change something.

> **The games also answer at a set of older addresses** —
> `priorisation-singleplayer`, `priorisation-multiplayer`, `learning-singleplayer`,
> `learning-multiplayer` and `lets-speak-up-work`, each `.onrender.com` without
> the suffix in the table above. Those belong to the previous maintainer's
> personal account, no longer receive updates and will disappear. If you find one
> of them in an old invitation or slide deck, replace it. Watch out for the
> confusing case: a facilitator on an old link and participants on the new one
> end up in different rooms and cannot see each other, even though the room code
> matches.

Two older repositories, `backpack-singleplayer` and `backpack-multiplayer`, are
**no longer in use** — that exercise now lives inside the two Learning
Reflection games. They can be archived or ignored.

## 2. What you are getting

- The complete source code and its full history for all five games.
- The hosting: all five links run on the team's own Render account, connected to
  the team's GitHub. Pushing a change publishes it — see section 4.
- No passwords, no API keys, no tokens anywhere in the code. Nothing needs to be
  rotated or replaced.
- No database. The games deliberately store nothing: results live only while a
  session is open, and the PDF export is the only way to keep them. That also
  means there is no personal data to look after.

One loose end, entirely optional: the French version of *Let's Speak Up* has not
been contributed back to the original project it came from. It runs perfectly on
the link above; the details are in that repository's README.

## 3. Pairs that must stay in sync

The Single Player and Multiplayer versions of the same game are separate
repositories that share nearly identical content:

- `Priorisation-Singleplayer` ↔ `Priorisation-Multiplayer`
- `learning-singleplayer` ↔ `learning-multiplayer`

If you change a question, an answer option or a card in one, **make the same
change in the other**, or the two versions of the same exercise will start
telling participants different things. The READMEs name the exact files.

## 4. How to change something

Every text a participant reads lives in a single file per project — for four of
the games that is `shared/content.ts`, for Let's Speak Up it is
`client/src/i18n/` plus the card list in `server/storage.ts`. The README in each
repository names the file and the section.

The loop is short:

1. Edit the text in the file.
2. Commit and push to the `main` branch.
3. Render rebuilds automatically; after roughly three minutes the change is live.
4. **Open the link and check it.** A typo in a text file cannot break the app,
   but a missing quotation mark or comma can stop the build — in which case the
   old version simply stays online until it is fixed.

For anything bigger than wording, run it locally first (`npm install`, then
`PORT=5050 npm run dev`) and click through the part you changed.

Two small habits worth keeping:

- The projects use plain TypeScript with no test suite. The safety net is
  running it locally and clicking through the screen you touched.
- A warning about `PostCSS` and a missing `from` option appears in every build.
  It is harmless and has been there from the beginning.

## 5. Running a workshop with them

- **Wake the link first.** The free hosting plan puts a service to sleep after a
  quiet period; the first visit then takes about 30 seconds. Open the link a few
  minutes before the session.
- **Check the links before the day.** Free services can be suspended after long
  inactivity. A quick visit a day ahead avoids surprises.
- **Save the PDFs.** Nothing survives the end of a session. The facilitator view
  has the export buttons.
- **Room codes are per session.** Closing the room ends it for everyone.
- Participants who lose their connection can rejoin with the same name and keep
  their place.

## 6. Access

Anyone with access to the `CDOTS-Learning` GitHub account can change and publish
the games, and anyone with access to the team's Render account can restart a
service or read its logs. Keep both on shared team credentials rather than a
single person's, so the next handover is easier than this one.

If you still have a local copy that was cloned before the transfer, point it at
the new address once:

```
git remote set-url origin https://github.com/CDOTS-Learning/<repo>.git
```

## 7. History, in two paragraphs

*Let's Speak Up* is a physical card game on psychological safety. A developer
named greg-afk built an online version of it. In 2026 this team's copy gained
support for 6 players, scoring, a 10-minute timer and a reconnect fix, which
were contributed back to the original and merged. Later a full French
translation was added behind an EN/FR switch — that part runs on the team's own
link.

The four other games grew out of the same workshop work: two prioritization
exercises (sorting 24 learning services into Yes / Maybe / No) and two learning
reflection journeys (three questions answered first as yourself and then as a
learner persona you build, with a backpack exercise in between). All of them
were built in the same shape — React and TypeScript in the browser, a small
Node server with Socket.IO for the live connection, everything kept in memory —
so once you have found your way around one, the others will look familiar.
