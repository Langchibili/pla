# ProLeagueAfrica: Project Plan and Flow

Oct 7, 2026 · @the colder's apprentice

## Overview

ProLeagueAfrica is a tournament platform where players compete in popular games and results are confirmed from end-of-match screenshots, so every tournament runs on a fixed timeline and every match ends with a recorded score.

Players enter with Plapo (Pro League Africa Player Points), play each match in the game itself using a code or lobby, then both upload a result screenshot. A separate score service reads the image, and Strapi decides what the result means.

**Guiding principles**

- Strapi holds all business logic. The score service only reads images and returns what it found.
- Everything the owner may want to change lives in an entry or in `admn_settings`, never in code: prize pools, stage times, forfeit scores, free Plapo, game on/off.
- Players stay anonymous to each other. All contact is through fixed buttons and socket events, never free text.
- Every match in a stage must be resolved (played, forfeited or suspended) before the next stage opens.
- A game can be switched off in the backend, so the app can run with some games while others are still being built.

**Naming rules (to avoid Strapi reserved words)**

- The settings entry is called `admn_settings`, on purpose, so it never clashes with Strapi's own admin settings.
- Every status field is named `<entryname>_status`, for example `match_status`, `tournament_status`, `submission_status`, `dispute_status`.

**Launch games:** Dream League Soccer first, then EA Sports FC / eFootball, then the others on your list (CODM, PUBG Mobile, Tekken / Mortal Kombat, Valorant / Counter-Strike, Dota 2) as each one's score reading is built.

## Architecture

Players only ever talk to Strapi, and Strapi alone talks to the database, the score service, the payment gateway and the rates provider.

&#91;embedded content: system architecture · 4 clients and services around Strapi\]

Push notifications reach the shell from Strapi through Firebase Cloud Messaging. The store app only starts a purchase; the gateway's webhook is what credits Plapo. Strapi, the score service and a job queue (Redis) run as separate containers, and the two Next.js apps deploy separately.

## Backend data model

Strapi 5 on MySQL holds about 18 content types; every status field follows the `<entryname>_status` rule, and the settings entry is `admn_settings`.

| Entry | What it holds | Notable fields |
| --- | --- | --- |
| country | Countries players and tournaments belong to | name, iso\_code, dial\_code, default currency, country\_status |
| currency | Currencies and their conversion rates | code, symbol, rate\_to\_base, rate\_updated\_at, currency\_status |
| admn\_settings | Global settings (single type) | initial\_free\_plapo, score\_on\_forfeit, suspended\_match\_score, base\_currency, default time limits |
| game | One record per supported game | name, slug, game\_status (active / inactive), result\_type, score\_service\_key, in\_game\_id\_format |
| game\_score\_zone | Where on the screenshot the score must be, per game | game, allowed\_zone (e.g. top-center), required\_orientation (landscape) |
| tournament\_config | Reusable settings template for a tournament | name, settings\_json (copyable template) |
| tournament | A tournament event | title, game, country, tournament\_config, tournament\_status, requires\_entry\_fee, entry\_fee\_plapo, has\_prize\_pool |
| tournament\_stage | One stage of a tournament | tournament, stage\_order, stage\_name, tournament\_stage\_status, starts\_at, ends\_at, advance\_count |
| tournament\_entry | A player's entry in a tournament | user, tournament, in\_game\_name, tournament\_entry\_status, points, matches\_played |
| match | One fixture between two entries | tournament\_stage, player1\_entry, player2\_entry, match\_deadline, match\_status, scores, result\_source |
| match\_submission | A player's uploaded result screenshot | match, user, screenshot, extracted\_json, ocr\_confidence, match\_submission\_status |
| match\_event | Postponement, technical difficulty and forfeit actions | match, actor, event\_type, reason\_code, proposed\_time, match\_event\_status |
| plapo\_ledger | Every Plapo movement (never edited, only added to) | user, amount, ledger\_type, plapo\_source (free / purchased / earned / received), plapo\_ledger\_status |
| plapo\_package | What can be bought in the Plapo store | plapo\_amount, price, currency, plapo\_package\_status |
| payment | Payments made on the store subdomain | user, provider, amount, currency, provider\_reference, payment\_status |
| referral | Who invited whom and the reward | referrer, referred\_user, referral\_status, reward\_plapo |
| device\_registry | One account per device rule | device\_hash, user, device\_registry\_status |
| prize\_payout | Prize money owed and paid | tournament, user, amount, currency, prize\_payout\_status |

Users also gain: country, preferred currency, in-game names, has\_completed\_tutorial, push token and user\_status.

**Currency conversion service.** A Strapi service refreshes rates from a rates provider on a schedule, stores them on the `currency` entry, and converts any amount between two currencies using the stored rate. Prices, entry fees and prize pools can then be shown in each player's own currency, while the settled amount is kept in the base currency.

## Tournament configuration and the JSON template

Every tournament is driven by one `tournament_config` entry that you create in the Strapi admin, so fixing, entry fees, prize pools and prize money allocation are all set in one place without touching code.

The entry has a ready-made JSON template to copy, edit and save. Values here override the global defaults in `admn_settings`; anything left out falls back to the default.

```json
{
  "templateName": "DLS Weekly Cup",
  "gameSlug": "dls",
  "entry": {
    "requiresEntryFee": true,
    "entryFeePlapo": 50,
    "maxPlayers": 256,
    "registrationClosesAt": "2026-11-01T18:00:00Z"
  },
  "prizePool": {
    "enabled": true,
    "currency": "USD",
    "initialPoolAmount": 200,
    "growthMode": "percentOfEntryFees",
    "growthPercent": 70,
    "distribution": [
      { "place": 1, "percent": 50 },
      { "place": 2, "percent": 25 },
      { "place": 3, "percent": 15 },
      { "place": 4, "percent": 10 }
    ]
  },
  "stages": [
    {
      "order": 1,
      "name": "Group stage",
      "type": "league",
      "minMatchesPerPlayer": 10,
      "advanceCount": 50,
      "startsAt": "2026-11-02T00:00:00Z",
      "endsAt": "2026-11-16T23:59:00Z",
      "matchTimeLimitHours": 48
    },
    {
      "order": 2,
      "name": "Round of 50",
      "type": "knockout",
      "advanceCount": 20,
      "startsAt": "2026-11-17T00:00:00Z",
      "endsAt": "2026-11-20T23:59:00Z",
      "matchTimeLimitHours": 24
    }
  ],
  "fixing": {
    "pairingMethod": "randomWithinTier",
    "avoidRematches": true,
    "generateFixturesAt": "stageStart"
  },
  "scoring": {
    "winPoints": 3,
    "drawPoints": 1,
    "lossPoints": 0,
    "tiebreakers": ["goalDifference", "goalsFor", "headToHead"]
  },
  "rules": {
    "scoreOnForfeit": "2:0",
    "suspendedMatchScore": "0:0",
    "suspendedMatchPoints": 0,
    "maxPostponementsPerMatch": 1,
    "singleSubmissionGraceHours": 0
  }
}
```

**How it is used**

- The config is validated when saved: stage windows must not overlap, distribution percentages must add to 100, and the game must be active.
- When a tournament is published, the config is copied into it as a snapshot, so later edits to the template never change a running tournament.
- `requiresEntryFee` and `prizePool.enabled` decide whether the tournament charges Plapo and whether it shows a prize pool. Both can be off for free events.
- Prize money is calculated from the pool and the distribution at the end of the final stage and written to `prize_payout` for you to approve and pay.

## Plapo economy, referrals and one account per device

Plapo is the only way into a tournament, and every Plapo movement is recorded in `plapo_ledger`, so a balance is always the sum of its history and can be audited.

**Where Plapo comes from**

| Source | How it is earned | Can be sent to other players? |
| --- | --- | --- |
| Initial free Plapo | Set by `initialFreePlapo` in `admn_settings`, given once on signup | No |
| Purchased | Bought on the Plapo store subdomain | Yes |
| Referral reward | A referred user downloads the app and enters a tournament | No, unless you decide otherwise |
| Received from a player | A transfer from another player's transferable balance | Yes, once |
| Prize or promo Plapo | Granted by you from the admin | Set per grant |

The wallet keeps two balances: a **spendable** balance (everything) and a **transferable** balance (purchased and received Plapo only). Spending always uses free Plapo first, so a player cannot drain their transferable balance by accident. Transfers are blocked from the free and referral buckets, which closes the loophole of farming free Plapo and passing it on.

**Buying Plapo**

1. The player opens the store, a separate Next.js app on its own subdomain, signed in with the same account.
2. They choose a `plapo_package`, shown in their own currency through the conversion service.
3. The payment gateway confirms by webhook; Strapi verifies it, creates the `payment` record and credits the ledger. The balance is never credited from the browser's word.
4. The wallet updates in the main app and the webview shell through a socket event.

**Referrals**

- Each user gets a referral code and link, which carries into the install.
- A `referral` moves through pending, installed, and rewarded. The reward is paid only when the referred user enters their first tournament, so empty installs earn nothing.
- Set a monthly cap per referrer in `admn_settings` to limit abuse.

**One account per device**

- On signup the app sends a device fingerprint, and the server stores a hash in `device_registry`.
- A second account from a device already in the registry is created without free Plapo, and flagged.
- The same hash is checked on login and on transfers, and linked accounts are flagged for review rather than banned automatically.
- Strengthen this with a verified phone number per account, since a device fingerprint alone can be reset or shared.

## Game registry and score-location rules

Each game is one `game` record, and nothing about a game is hard-coded in Strapi except the key that picks its file in the score service.

**Per-game settings**

- `game_status`: active or inactive. An inactive game cannot be entered, earn or be played, and its tournaments are hidden. This lets you build the score reading for a new game while the app runs with the others.
- `result_type`: head-to-head score, rounds, team score, or placement with kills. This tells Strapi how to read what the score service returns.
- `score_service_key`: the name of the game's file in the score service (for example `dls`).
- `in_game_id_format`: how that game's player names or IDs look, used to validate what players type at tournament entry.
- `game_score_zone`: where on the screenshot the score must be, for example DLS = top-center.

**Why the score location matters**

A player who is winning mid-match could screenshot the scoreboard and claim the win. In most football games the live score sits in a different place from the full-time result screen. The `game_score_zone` rule makes Strapi accept a result only if the score was found in the allowed zone; a score found in the top-left, top-right or bottom is marked invalid. The result then counts only if the other player forfeits or loses connection, in which case the forfeit and one-sided submission rules apply.

**Image rules applied before any score is read**

1. The image must be landscape. Portrait images are rejected and the player is told to upload the original landscape screenshot.
2. The top half is cut out and split into three vertical parts: left, middle and right.
3. The middle part is searched for the score; the left and right parts are searched for the two player names.
4. Logos and pictures in the side parts are ignored; only text is read as names.

**What counts as a score**

- Two whole numbers, in a form such as `2:0`, `2 : 0`, `2-0` or `2 - 0`.
- For football, a match clock may sit between the two numbers (`2 <time> 0`); the clock is dropped.
- A number directly next to `%` is not a score (`2%`, `22%`), and a number next to another number that touches `%` is not a score either.
- A number with a decimal point (`2.2`, `22.2`) is not a score.
- The two numbers must be on the same line, roughly level with each other, and sit between the two names. The final decision uses the game's valid score range.

## Score service

The score service is a small standalone service that turns a screenshot into structured data, and it knows nothing about tournaments, Plapo or players.

**Boundary with Strapi**

- Strapi sends the image, the game key and the expected player names, and receives the extracted result.
- All decisions stay in Strapi: whether the score is in the allowed zone, whether names match, whether the match is complete, disputed or invalid.
- The call is asynchronous: Strapi queues a job when a `match_submission` is created, and the service returns the result by webhook, so uploads never wait on image processing.

**One file per game**

Each game has its own parser file that follows one shared contract, so adding a game means adding one file and one `game` record.

```text
score-service/
  app.py                  # HTTP endpoints: submit job, get result
  core/
    image_checks.py       # landscape check, size, blur, crop to top half
    splitter.py           # top half, then left / middle / right thirds
    number_finder.py      # digits, separators, spacing, % and . rules
    name_reader.py        # text-only name reading from side thirds
    confidence.py         # combines checks into a confidence value
  games/
    base.py               # the contract every game file follows
    dls.py
    ea_fc.py
    efootball.py
    tekken_mk.py
    codm.py
    pubg_mobile.py
    valorant_cs.py
    dota2.py
  tests/
    screenshots/<game>/   # real sample screenshots per game
```

**The contract each game file implements**

| Step | Input | Output |
| --- | --- | --- |
| validate\_image | Raw image | Pass or reject with a reason (for example not landscape) |
| locate\_regions | Image | Score region and name regions, with the zone where the score was found |
| read\_numbers | Score region | Candidate scores with positions and confidence |
| read\_names | Name regions | Left and right names |
| build\_result | All of the above | Scores, names, score zone, confidence, flags |

**The score-finding algorithm, in order**

1. Read every number in the middle third with its position.
2. Drop any number touching `%` or `.`, and any number beside a number that touches `%`.
3. Group the remaining numbers that sit on the same line.
4. For each pair, measure the gap and check for a separator (`:`, `-`, or a clock between them for football).
5. Keep pairs that sit between the two names, and score each by spacing, alignment and confidence.
6. Return the best pair and its zone. If two pairs score close together, return low confidence so Strapi sends it for review.

Start with fixed template matching and glyph matching for digits, and add a small trained detector only for the layouts where it proves necessary. Run it on CPU only, as a small container with ONNX Runtime.

**Growing the service over time**

- Every screenshot an admin corrects or a dispute settles is saved as a labelled sample for that game.
- Keep a fixed test set per game that is never used for training, and run it before every change goes live.
- Version each game's template (for example `dls-v1`) so a game update does not break older screenshots.

## Match lifecycle

Every match ends in exactly one of five resolved outcomes (completed, forfeited, graded on one submission, suspended, or invalid and replayed), and Strapi moves it there on timers and player actions.

**Before the match**

- At tournament entry, each player types the name their game shows during a match (a DLS team name, an EA FC username, and so on). It is checked against the game's `in_game_id_format` and locked for the tournament.
- When a stage starts, Strapi creates the fixtures. Each match gets a `match_deadline` from the stage's time limit and a unique match code, which both players see in the app.
- Players only see an anonymous opponent label, never a name, account or contact detail.

**Possible outcomes**

| Situation | What happens | match\_status |
| --- | --- | --- |
| Both submit and the scores agree | Result is final; points go to the leaderboard | completed |
| Both submit and the scores conflict, or a player clicks Dispute | Admin reviews both screenshots | in\_dispute |
| Admin finds the match unfair or unplayable | Both players get a new code and a new deadline | invalid |
| Only one player submits by the deadline | The match is graded with that player's score, if it passes the zone and name checks | completed (graded on one submission) |
| A player taps Forfeit | The other player receives `scoreOnForfeit` (for example 2:0) | forfeited |
| Score is read outside the allowed zone | The submission is rejected; the player may re-upload before the deadline | submission invalid |
| A player cannot play and requests a new time | Both agree a time before the stage ends, and the deadline moves | postponed |
| Match is still unresolved when the stage ends | `suspendedMatchScore` (for example 0:0) and 0 points for both | suspended |

**Postponement and technical difficulty**

1. A player taps Unavailable. A modal asks for a reason from a fixed list (technical difficulty, emergency, other) and offers Request postponement or Forfeit.
2. The opponent receives the request by socket and push notification, still anonymous.
3. The opponent can accept one of the proposed time slots, counter with another slot, or decline. Slots are chosen from a fixed list and must fall before the stage ends.
4. On agreement the match becomes postponed with a new deadline. If the opponent does not answer within the response window, the request lapses.
5. The number of postponements per match is limited by `maxPostponementsPerMatch`, and a request can never move the deadline past the end of the stage.

**The stage gate**

A stage closes only when every match in it is resolved. When the stage window ends, a scheduled job moves any match that is still open to suspended, writes the `suspendedMatchScore`, and then lets the next stage start.

The diagram below shows the match states and what moves a match from one to the next.

&#91;embedded content: match states · 5 open states, 3 resolved outcomes\]

An invalid ruling sends a match back to scheduled with a new code; every other open match ends as completed, forfeited or suspended.

## Stages and tournament flow

A tournament moves through fixed stages, and the next stage opens only after every match in the current one is resolved or suspended.

**Tournament states (`tournament_status`)**

| State | Meaning |
| --- | --- |
| draft | Being set up from a `tournament_config`; not visible |
| published | Visible and announced; registration not yet open |
| registration\_open | Players can enter by paying the Plapo entry fee (if any) |
| registration\_closed | Entries locked; fixtures for stage 1 are created |
| in\_progress | A stage is being played |
| completed | Final resolved; leaderboard and prizes fixed |
| cancelled | Called off; Plapo is refunded to entrants |

**How a stage runs**

1. At `startsAt`, Strapi builds the fixtures for the stage using the `fixing` settings and notifies the players.
2. Players play within the stage window and the per-match time limit.
3. Points follow the `scoring` settings (for example 3 for a win, 1 for a draw, 0 for a loss) and the leaderboard updates after every resolved match.
4. At `endsAt`, unresolved matches become suspended, with the suspended score and 0 points.
5. Once every match is resolved, the ranking is frozen using the tiebreakers, and the top `advanceCount` players move to the next stage. The rest are eliminated and keep access to their match history.

For example, a tournament could run a group stage of at least 10 matches per player, advance the top 50, then the top 20, then the top 10, and continue until the final. The numbers are not fixed in code; they come from the `stages` list in the config.

**Rules to decide and set in the config**

- **Odd numbers of players:** a player without an opponent receives a bye, which counts as a win at the forfeit score.
- **Minimum players:** if a tournament does not reach its minimum at registration close, it is cancelled and entry fees are refunded.
- **Eliminated players:** no refund, but they may be offered a smaller tournament straight away.
- **Late joiners:** none after registration closes.
- **Leaderboards:** one per stage, plus an overall one, refreshed live by socket with a polling fallback.
- **Match history:** every completed match shows both submitted screenshots and the final score, so a result can always be checked.

## Frontend apps and the webview shell

There are two Next.js apps and one thin native shell, and the shell's only native feature is push notifications.

**1. Main app (Next.js, mobile-first)**

- **Onboarding tutorial:** the first thing a new user sees, and navigation stays locked until it is finished (`has_completed_tutorial`). It shows how to enter, how to get and use the match code, how to take a clean full-time screenshot in landscape, how to upload it, and what forfeit and postponement do.
- **Home:** upcoming tournaments, active matches with their deadlines, and Plapo balance.
- **Tournaments:** filter by game and country, see entry fee, prize pool (shown in the player's currency), stage dates and rules; join by entering the in-game name.
- **Match room:** anonymous opponent label, match code, countdown to the deadline, screenshot upload with orientation check, and the Unavailable, Postpone, Forfeit and Dispute buttons.
- **Leaderboards:** per stage and overall, with the player's own position pinned.
- **Match history:** each match with both screenshots and the final score.
- **Wallet:** balance split into spendable and transferable, ledger history, send Plapo, and the link to the store.
- **Referrals:** the player's code, link, and the status of each invite.
- **Settings:** country, currency, notification preferences.

**2. Plapo store (separate Next.js app on a subdomain)**

- Signs in with the same account, shows packages in the player's currency, takes payment through the gateway, and waits for the webhook before showing the new balance.
- Share login between the apps through a short-lived token handoff or a cookie scoped to the parent domain, so the player does not log in twice.
- Keeping purchases here means the native shell never handles payments.

**3. Webview shell (React Native)**

- A full-screen `react-native-webview` that loads the main app.
- **Push notifications:** Firebase Cloud Messaging in the native layer. After login the web app sends a message through the webview bridge, the shell sends back the device token, and the web app saves it in Strapi.
- Tapping a notification opens the matching page in the webview (a match room, a tournament, the wallet).
- The shell also needs file-picker and photo-library permission so screenshot uploads work from inside the webview.
- Everything else stays on the web side, so the app can be updated without a store release.

## Realtime events and notifications

Players never message each other directly; everything between them is a fixed set of socket events that Strapi validates and records as `match_event` entries.

**Socket events (Strapi, Socket.IO, authenticated by the player's token)**

| Event | Sent by | Effect |
| --- | --- | --- |
| match:unavailable | Player | Opens the reason modal; notifies the opponent that a postponement may follow |
| match:postpone\_request | Player | Sends a reason code and up to three proposed time slots |
| match:postpone\_response | Opponent | Accept, counter with another slot, or decline |
| match:forfeit | Player | Ends the match at `scoreOnForfeit` for the opponent |
| match:submission\_received | Server | Tells the opponent a screenshot was uploaded |
| match:result\_ready | Server | Result shown to both players |
| match:dispute\_opened | Player or server | Locks the match and informs the admin queue |
| wallet:updated | Server | Refreshes the Plapo balance after a purchase, entry, transfer or reward |
| leaderboard:updated | Server | Refreshes the open leaderboard |

**Push notifications (FCM through the shell)**

- New tournament published, and registration closing soon.
- Stage starting, with the player's first fixture.
- Match code ready, and deadline reminders at set times before it ends.
- Opponent requested postponement, accepted, or forfeited.
- Result confirmed, disputed, or marked invalid with a replay request.
- Advanced to the next stage, or eliminated, and prize awarded.
- Plapo received, referral reward earned.

Each notification type can be switched on or off by the player in settings, except those tied to a match deadline. Sockets carry live updates while the app is open and push covers the rest. Every event is idempotent, so a repeated tap or a retried message never applies twice.

## Phased delivery plan

The plan takes about 15 weeks to a launch with DLS and EA FC, assuming one developer working with AI coding tools; the score service runs in parallel with the tournament engine, and weeks are estimates to adjust as you go.

| Phase | Weeks | Deliverables | Exit gate |
| --- | --- | --- | --- |
| 0. Foundations | 1-2 | Repos, Strapi on MySQL, all content types, `admn_settings`, country and currency entries, auth, device registry | A user can sign up and the free Plapo and device rule work |
| 1. Plapo and store | 3-4 | Ledger and wallet, currency conversion service, store app on its subdomain, payment webhooks, referrals | A user can buy Plapo and see it in the main app |
| 2. Tournament engine | 5-7 | `tournament_config` with validation, stages, fixtures, entries, leaderboards, stage-close job, state machines | A free test tournament runs through every stage with fake results |
| 3. Score service v1 | 5-8 | Image checks, number finder, name reader, DLS parser, webhook to Strapi, labelled test set | Accuracy target on the test set agreed and met |
| 4. Match flow | 8-10 | Submissions, grading rules, sockets, postponement, forfeit, suspension, dispute queue in the admin | Every outcome in the lifecycle table works end to end |
| 5. Apps and shell | 9-11 | Main app screens, tutorial, wallet, webview shell, FCM push | A full match is played from a phone through the shell |
| 6. Closed beta | 12-14 | Free tournaments with real players, real screenshots collected, settings tuned | Dispute and failed-read rates acceptable for paid tournaments |
| 7. Launch | 15 | DLS and EA FC live with entry fees and prizes; other games switched on one by one | Legal and payment checks passed |

After launch, each further game takes its own parser file, test screenshots, and a short beta, and is switched on from `game_status` when its accuracy is proven.

The diagram below shows the same phases on a timeline.

&#91;embedded content: delivery timeline · 8 phases over 15 weeks\]

The tournament engine and the score service are built side by side in weeks 5 to 8, and launch follows a three-week closed beta.

## Risks, legal and compliance

The biggest risks are legal and operational rather than technical, and the legal ones need answers before paid tournaments go live.

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Prize money and gambling law | Entry fees paid for cash prizes can fall under betting or gaming rules, which differ by country | Take local legal advice per launch country; consider free-entry or sponsor-funded prize tournaments first |
| Payments and payouts | Gateways have rules on gaming categories and prize payouts; Plapo must not behave like stored money | Check each gateway's terms; define Plapo terms (no cash-out unless licensed); keep a full ledger |
| App store rules | Stores restrict selling digital goods and real-money contests inside apps | Keep purchases on the web store only, and check each store's policy on contests before submission |
| Game publisher terms | Using game names or logos for tournaments may need permission | Do not imply official endorsement; read each publisher's rules |
| Screenshot fraud | Edited or reused screenshots, mid-match captures, fake names | Zone rule, name matching, duplicate-image hashes, admin review of low confidence |
| Multiple accounts | Farming free Plapo and colluding in matches | Device registry, verified phone, flagged links, review queue |
| Wrong score reads | A bad read can award points to the wrong player | Confidence threshold, dual submission, easy dispute path, labelled test set |
| Unresolved matches | Stages stall if players vanish | Hard stage deadlines, suspension rule, deadline reminders |
| Privacy | Screenshots and device data are personal data | Privacy policy, retention period for images, access limited to admins |
| Data and money integrity | Double credits or double entries on retries | Idempotency keys on payments, entries and socket actions; append-only ledger |

## More suggestions

These ideas would make the platform fairer, cheaper to run, and easier to grow, roughly in the order I would add them.

**Fairness and trust**

- **Put the match code in the screenshot.** Where a game allows it, ask players to name their team or room with the match code so it shows on screen. Every screenshot is then tied to one match and cannot be reused.
- **One-tap agreement before reading.** After the match, show both players the score the opponent entered and let them tap Agree. Use the screenshot read as a check, not the only judge. Most matches then end instantly.
- **Fair-play score.** Track forfeits, no-shows, disputes and lost disputes per player. Low scores can lead to a warning, a smaller prize eligibility, or review before entry.
- **Duplicate and edit checks.** Store a hash of each screenshot to block reuse, and flag images with signs of editing for review.
- **Short clip for big money.** For finals and large prize pools, ask for a short screen recording of the final whistle.

**Built for African networks and payments**

- **Mobile money first.** Offer mobile money and local bank options through your gateway alongside cards, since many players have no card.
- **Low-data uploads.** Compress screenshots in the browser to a safe size, show upload progress, and retry automatically on a dropped connection.
- **Time-zone-aware scheduling.** Collect each player's available hours at entry and propose fixture times inside overlapping hours. This should cut postponements sharply.
- **Languages.** Start with English, then add French and Portuguese to cover more of the continent.

**Better competition**

- **Skill tiers.** Pair players by rating in the group stage and run separate divisions, so beginners are not matched with veterans.
- **Seasons and country leaderboards.** A season ranking, badges and country-versus-country tables give players a reason to return between tournaments.
- **Sponsored tournaments.** Let brands fund prize pools and entry, which gives you a revenue source that does not depend on player fees.

**Operations and quality**

- **A strong admin dashboard.** For each dispute, show both screenshots side by side with the detected score and names highlighted, and offer one-click outcomes: confirm, override, mark invalid. Log every admin change.
- **Simulate before launch.** Write a script that runs 200 fake players through a whole tournament, including forfeits, postponements and silent no-shows, to prove the stage gate and suspension job work.
- **Feature flags per country.** Turn games and paid tournaments on country by country as the legal checks finish.
- **Monitoring.** Track failed reads, queue length, dispute rate and payment webhook failures, with alerts, plus daily MySQL backups and rate limits on uploads and logins.
- **Fixed help content.** A built-in help section and a short ticket form keep support inside the app without breaking player anonymity.
- **Plapo packages with bonuses.** Larger packages that give extra Plapo raise average purchases without lowering the price of a single entry.
