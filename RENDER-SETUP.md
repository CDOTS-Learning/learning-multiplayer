# Hosting (Render)

The five games are served by **Render**, which takes the code from GitHub,
builds it and publishes it at an `.onrender.com` address. All five services now
run on the **team's own Render account**, connected to the team's GitHub — so
everything needed to keep them alive is in the team's hands.

This document describes how that is set up, how to check that a service is
healthy, how to add another one, and what to do when something misbehaves.

---

## 1. The five services

| Game | Repository | Live link |
|---|---|---|
| Prioritization — Single Player | `Priorisation-Singleplayer` | https://priorisation-singleplayer-nu3p.onrender.com |
| Prioritization — Multiplayer | `Priorisation-Multiplayer` | https://priorisation-multiplayer-nnsm.onrender.com |
| Learning Reflection — Single Player | `learning-singleplayer` | https://learning-singleplayer-ujcx.onrender.com |
| Learning Reflection — Multiplayer | `learning-multiplayer` | https://learning-multiplayer-3lgk.onrender.com |
| Let's Speak Up (English / French) | `lets-speak-up-work` | https://lets-speak-up-work-1.onrender.com |

Every service is set up the same way:

| Setting | Value |
|---|---|
| Language / runtime | **Node** |
| Branch | `main` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Instance type | **Free** |
| Environment variables | none |
| Auto-deploy | on |

There is no database, no stored data and no secret of any kind. A service is
simply "build this repository and run it", which is why one can be rebuilt from
scratch in a few minutes if it ever has to be.

> **Old addresses still in circulation.** Before the handover the games ran on
> the previous maintainer's personal account, at the same names without the
> suffix (`priorisation-singleplayer.onrender.com` and so on). Those copies get
> no updates and will disappear. Replace them wherever they are written down —
> and note the confusing failure mode: a facilitator on an old link and
> participants on a new one land in different rooms and never see each other,
> even though the room code matches.

## 2. Checking that a service is healthy

Worth doing the day before a workshop rather than on the morning of one:

1. Open the link. The start page should appear — the first visit after a quiet
   period takes about 30 seconds while the service wakes up. That is normal on
   the free plan.
2. Create a session, then join it from a second browser tab or a private window.
   If both windows see each other, the live connection works. **This is the part
   worth testing**, because it is the part that would fail silently.
3. For Let's Speak Up, switch **EN | FR** once and check that the cards change
   language.

To confirm that publishing works end to end, change something tiny in a
repository (a full stop in a text), push it, and watch it appear on the live
link a few minutes later.

## 3. Adding another service later

If a sixth game ever appears, or a service has to be rebuilt:

1. In Render: **New → Web Service**, pick the repository.
2. Fill in the settings from the table in section 1.
3. Pick a name — it becomes the address, and names are unique across all of
   Render, so include something team-specific.
4. **Create Web Service**, and wait for the first build (two to four minutes).
5. Leave automatic deploys on, then verify it as described in section 2.

## 4. When something goes wrong

**A deployment does not start after a push.** Render has lost access to the
repository — most often after a repository is transferred or renamed. Reconnect
the GitHub account in Render's settings and make sure the team's repositories
are included.

**The build fails.** Open the build log in Render. A missing comma or quotation
mark in an edited text file is by far the most common cause, and the log names
the file and the line. The previous version stays online until the build
succeeds, so a failed build never takes a game down.

**A warning about `PostCSS` and a missing `from` option** appears in every build
of every one of these projects. It is harmless. Ignore it.

**The first visit is slow.** Expected on the free plan: a service sleeps after a
quiet period and needs about 30 seconds to wake. Open the link a few minutes
before a workshop. If that is ever unacceptable, a paid instance removes the
sleeping and nothing in the code has to change.

**A link is dead.** Free services can be suspended after very long inactivity.
Open the service in Render and redeploy it.

**The site loads but players cannot see each other.** Either they are on
different links (see the note in section 1), or the live connection is blocked —
usually a corporate network or VPN filtering WebSocket traffic. Try a different
network before suspecting the app.

## 5. If you ever want to host them elsewhere

The games are ordinary Node applications with no database, so they run anywhere
that can build a repository and run `npm start`. The settings table in section 1
is all the information another hosting provider needs.

## 6. Keep it out of one person's hands

Use shared team credentials for the Render account rather than an individual's
login, and make sure more than one person knows where it lives. The reason this
document exists is that the previous setup depended on a single personal
account — which works fine right up to the moment that person leaves.
