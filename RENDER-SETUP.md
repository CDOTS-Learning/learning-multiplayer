# Hosting (Render) — please take this over

**Short version:** the five games are live on a personal Render account that
belonged to Robin Held, who has left the project. The code is safe on GitHub and
each service can be rebuilt from it in a few minutes. The one thing that cannot
be rebuilt is the **web address** — as long as those old services exist, their
names are taken; once that account is closed, the links stop working and cannot
be claimed back by anyone else in a hurry.

So: move the hosting into an account the team owns. Ideally soon, while the old
services are still there and the links can be handed over cleanly.

---

## 1. Why this matters

Render is the service that takes the code from GitHub, builds it and serves it
at `https://<name>.onrender.com`. Today, for all five games, that account is not
yours. In practice this means:

- Only that account can **restart** a service, **read the logs** when something
  goes wrong, change settings, or roll back a bad deployment.
- Alerts, build failures and any notices from Render go to that mailbox, where
  nobody will read them.
- If the account is closed or lapses, the five links go dark. **Nothing is lost
  from the code** — every game can be put back online from GitHub — but the
  addresses will have changed, and anything that points at the old links
  (invitations, slide decks, bookmarks, calendar entries) has to be updated.

What you do *not* have to worry about: there is no database, no stored data, no
passwords or keys in the configuration. A service is just "build this repository
and run it", which is why rebuilding one is genuinely quick.

## 2. Pick a path

| | What happens | Keeps the current links? |
|---|---|---|
| **A — Recreate, one at a time** | The old owner deletes a service, you immediately create yours with the same name | **Yes** |
| **B — Fresh start** | You create five services under new names; the old ones keep running until that account goes away | No — you share new links |
| **C — Transfer** | The services are moved into a Render workspace the team owns | **Yes** |

**Path C is the nicest** if it is available to you: no downtime, nothing to
re-share. Working together in one Render workspace may require a paid plan,
though — check what your plan allows before counting on it. It also only works
while the original owner is still reachable.

**Path A is the fallback that keeps the links.** Service names on Render are
globally unique, so the name `learning-multiplayer` only becomes free the moment
the old service is deleted. Do the five one at a time, and create each new
service right after the matching old one is deleted, so there is only a short
gap. Do not delete anything until you are ready to create the replacement.

**Path B is the safe, boring option** if the original account is already gone or
nobody is available to coordinate. You lose the old addresses; everything else
is identical. Budget an hour to hunt down every place the old links are written
down.

## 3. Setting up a service (the same five times)

You need: a Render account, and that account connected to the GitHub account
that now holds the repositories.

1. **Create the account with a shared team mailbox**, not someone's personal
   address. This is the whole point of the exercise — otherwise the same
   dependency starts again with a different name.
2. In Render, connect GitHub and grant access to the team's repositories.
3. **New → Web Service**, pick the repository, then:

   | Setting | Value |
   |---|---|
   | Language / runtime | **Node** |
   | Branch | `main` |
   | Build command | `npm install && npm run build` |
   | Start command | `npm start` |
   | Instance type | **Free** is enough |
   | Environment variables | none |

4. **Name it carefully.** The name becomes the address. If you are keeping the
   old links, use exactly these:

   | Repository | Service name |
   |---|---|
   | `Priorisation-Singleplayer` | `priorisation-singleplayer` |
   | `Priorisation-Multiplayer` | `priorisation-multiplayer` |
   | `learning-singleplayer` | `learning-singleplayer` |
   | `learning-multiplayer` | `learning-multiplayer` |
   | `lets-speak-up-work` | `lets-speak-up-work` |

   (Yes, "Priorisation" is spelled the French way in those two. That is how the
   existing links read, so keep it if you want them to keep working.)

5. **Deploy**, and wait for the first build — usually two to four minutes.
6. Leave **automatic deploys on**. From then on, every push to `main` publishes
   itself.

## 4. Check that it worked

For each service:

1. Open the link. The start page should appear (the very first visit may take
   ~30 seconds while the service wakes up).
2. Create a session, then join it from a second browser tab or a private window.
   If both windows see each other, the live connection is working — that is the
   part worth testing, because it is the part that would break silently.
3. For Let's Speak Up, also switch **EN | FR** once and check the cards change
   language.
4. Make a tiny change in the repository (a full stop somewhere in a text), push
   it, and confirm it appears live a few minutes later. That proves automatic
   deployment is connected.

## 5. When something goes wrong

**A deployment does not start after a push.** Render has lost access to the
repository — most often after a repository was transferred or renamed. Reconnect
the GitHub account in Render's settings and make sure the team's repositories
are included.

**The build fails.** Open the build log in Render. A missing comma or quotation
mark in an edited text file is by far the most common cause, and the log names
the file and line. The previous version stays online until the build succeeds,
so a failed build never takes a game down.

**A warning about `PostCSS` and a missing `from` option** appears in every build
of every one of these projects. It is harmless. Ignore it.

**The first visit is slow.** Expected on the free plan: a service sleeps after a
quiet period and needs about 30 seconds to wake. Open the link a few minutes
before a workshop. If that is ever unacceptable, a paid instance removes the
sleeping, and nothing in the code has to change.

**A link is dead.** Free services can be suspended after very long inactivity.
Check the service in Render and redeploy it. Worth doing the day before a
workshop rather than on the morning of one.

**The site loads but players cannot see each other.** The live connection is
blocked. Usually a corporate network or VPN filtering WebSocket traffic — try a
different network to confirm before suspecting the app.

## 6. If you would rather not run hosting at all

That is a legitimate choice. The games are ordinary Node applications with no
database, so they can run anywhere that builds a repository and runs
`npm start` — your own internal hosting included. The two commands in section 3
are all the information a hosting provider needs.

What you should *not* do is leave it as it is indefinitely. Right now the five
links depend on an account nobody on the team can reach.

## 7. Checklist

- [ ] Decide on path A, B or C (section 2)
- [ ] Create a Render account on a **shared team mailbox**
- [ ] Connect it to the team's GitHub account
- [ ] Set up the five services (section 3)
- [ ] Verify each one, including a two-window test (section 4)
- [ ] Update every place the old links are written down, if the names changed
- [ ] Note who is responsible for this account, so the next handover is easier
