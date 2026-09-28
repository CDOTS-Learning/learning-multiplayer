# Handover — the five workshop games

This document describes what the team is taking over, how the games are used in
a workshop, and how to change them. It was written as Robin Held handed the
projects over and left the team; there is no longer a single person who knows
the history, so everything worth knowing is written down here.

A second document, **`RENDER-SETUP.md`**, covers the hosting. Please read that
one too — it contains the only task that is genuinely urgent.

---

## 1. What this is

Five small web applications used in facilitated training sessions. They all work
the same way: a facilitator opens a session, shares a six-character room code,
the participants join from the same start page on their own devices, and
everyone sees the same thing live while the group talks.

| Game | Repository | Live link | Who plays |
|---|---|---|---|
| Prioritization — Single Player | `Priorisation-Singleplayer` | https://priorisation-singleplayer.onrender.com | 1 participant + facilitator |
| Prioritization — Multiplayer | `Priorisation-Multiplayer` | https://priorisation-multiplayer.onrender.com | 2–5 players + facilitator |
| Learning Reflection — Single Player | `learning-singleplayer` | https://learning-singleplayer.onrender.com | 1 participant + facilitator |
| Learning Reflection — Multiplayer | `learning-multiplayer` | https://learning-multiplayer.onrender.com | 2–5 players + facilitator |
| Let's Speak Up (English / French) | `lets-speak-up-work` | https://lets-speak-up-work.onrender.com | 3–6 players + facilitator |

Each repository has its own `README.md` with the session flow, the exact files
that hold the texts, and how to run it locally. **Start there** when you want to
change something.

Two older repositories, `backpack-singleplayer` and `backpack-multiplayer`, are
**no longer in use** — that exercise now lives inside the two Learning
Reflection games. They can be archived or ignored.

## 2. What you are getting — and what you are not

**You are getting**

- The complete source code and its full history for all five games.
- No passwords, no API keys, no tokens anywhere in the code. Nothing needs to be
  rotated or replaced.
- No database. The games deliberately store nothing: results live only while a
  session is open, and the PDF export is the only way to keep them. That also
  means there is no personal data to look after.

**You are not getting (yet)**

- **The hosting.** The five live links run on a personal Render account that is
  leaving with Robin. The code is safe on GitHub and every service can be
  rebuilt from it in minutes — but the web addresses themselves are the one
  thing that cannot be recreated once that account is gone. See
  `RENDER-SETUP.md`. Please treat this as the first task, not a someday task.
- **A contributed French version of Let's Speak Up on the original project.**
  The English original belongs to another developer (greg-afk). The French
  version runs fine on the link above; contributing it back is optional and
  described in that repo's README.

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
3. The hosting rebuilds automatically; after roughly three minutes the change is
   live.
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

## 6. Where the repositories live

All five repositories are transferred to the team's GitHub account. Anyone with
access to that account can change and publish the games; there are no other
permissions to hand out.

After the transfer, GitHub keeps the old web addresses working as redirects, but
anyone with a local copy should point it at the new address once:

```
git remote set-url origin https://github.com/<new-account>/<repo>.git
```

## 7. History, in two paragraphs

*Let's Speak Up* is a physical card game on psychological safety. A developer
named greg-afk built an online version of it. In 2026 this team's copy gained
support for 6 players, scoring, a 10-minute timer and a reconnect fix, which
were contributed back to the original and merged. Later a full French
translation was added behind an EN/FR switch — that part runs on the team's own
link and has not been contributed back.

The four other games grew out of the same workshop work: two prioritization
exercises (sorting 24 learning services into Yes / Maybe / No) and two learning
reflection journeys (three questions answered first as yourself and then as a
learner persona you build, with a backpack exercise in between). All of them
were built in the same shape — React and TypeScript in the browser, a small
Node server with Socket.IO for the live connection, everything kept in memory —
so once you have found your way around one, the others will look familiar.
