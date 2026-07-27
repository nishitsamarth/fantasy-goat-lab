# Fantasy GOAT Lab

Build the greatest fantasy football lineup ever—then find out whether you
actually drafted it well.

Fantasy GOAT Lab is a free historical NFL fantasy game and analysis tool. It
combines a randomized team/year draft, an optimizer that receives the exact same
draws, historical player-season comparisons, and a free-build lineup lab using
real weekly results from 1999 onward.

**Live site:** [fantasy-goat-lab.nishitsamarth.chatgpt.site](https://fantasy-goat-lab.nishitsamarth.chatgpt.site)

## What it does

### Spin Draft

The main game loop is intentionally simple:

1. Choose a scoring format and roster format.
2. Spin a random NFL team and season.
3. Select any available QB, RB, WR, or TE from that roster and assign him to
   any compatible open slot.
4. Use up to two rerolls across the draft.
5. Finish the roster and face an optimizer given the exact same spins.

The result includes:

- projected record for the drafted roster;
- projected record for the optimal roster;
- draft-efficiency percentage;
- average weekly score;
- biggest missed selection;
- a share action for the final result.

### Historical season comparison

Compare two player-seasons under Standard, Half-PPR, PPR, or TE Premium
scoring. The comparison includes:

- total fantasy points and points per game;
- positional rank and percentile;
- weekly scoring chart;
- 25th-percentile weekly floor;
- boom-week count;
- fantasy-playoff scoring;
- a five-category verdict;
- query-string URLs that preserve the matchup and scoring format.

### Free-build lineup lab

Ignore the random draws and assemble an unrestricted all-time roster. The lab
supports:

- Classic 1QB;
- Superflex;
- Hero RB;
- Standard;
- Half-PPR;
- PPR;
- TE Premium.

## Record model

This MVP does not secretly assign random wins.

For every week represented in the selected player-seasons, the app:

1. aligns each player's actual fantasy output by NFL week;
2. sums the active lineup;
3. converts that score to win probability with a logistic scoring curve;
4. uses a different center for 1QB and Superflex;
5. sums weekly win probabilities and rounds to a projected record.

The curve centers are calibrated from the historical dataset by estimating a
12-team starting lineup in every season: top 12 quarterbacks, top 24 running
backs, top 24 wide receivers, top 12 tight ends, and the next 12 best flex
players. Median weekly lineup output from 1999–2024 produced:

| Scoring | 1QB midpoint | Superflex midpoint |
| --- | ---: | ---: |
| Standard | 83 | 100 |
| Half-PPR | 96 | 113 |
| PPR | 108 | 125 |
| TE Premium | 111 | 128 |

Superflex adds 17 points, approximately the historical weekly contribution of
a second starting quarterback. The active midpoint is shown in the interface.
These remain model estimates—not claims about every fantasy league. A future
real-league import can replace the aggregate curve without changing the product
flow.

The optimizer receives the exact same ordered team/year draws and uses dynamic
programming to solve the highest-scoring full-roster assignment across every
draw and open slot. It uses the same scoring and roster settings. That makes the
comparison about both player evaluation and positional strategy—not luck.

## Scoring rules

- **Standard:** nflverse standard fantasy points.
- **Half-PPR:** standard points plus 0.5 points per reception.
- **PPR:** nflverse full-PPR fantasy points.
- **TE Premium:** PPR plus an additional 0.5 points per tight-end reception.

Reception counts are recovered from the difference between nflverse PPR and
standard fantasy points.

## Data architecture

Fantasy GOAT Lab has no paid API dependency and no runtime database.

```text
nflverse weekly player stats (CSV)
              │
              ▼
scripts/build-player-data.mjs
  - regular-season rows only
  - QB / RB / WR / TE
  - minimum four appearances
  - position rank + percentile
              │
              ▼
public/data/player-seasons.json
  - 10,000+ player-seasons
  - weekly Standard + PPR output
  - team, season, and position metadata
              │
              ▼
Browser-only scoring, draft, optimizer, and comparison engine
```

The generated JSON currently covers the complete range available in the source
file (1999 through the latest included season). Keeping the data static makes
the site fast, auditable, deployable on a free tier, and independent of an API
key or rate limit.

Data comes from
[nflverse-data](https://github.com/nflverse/nflverse-data), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Fantasy GOAT Lab is
not affiliated with or endorsed by the NFL.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- vinext / Vite
- Cloudflare-compatible static assets
- CSS-first responsive interface
- no authentication;
- no analytics or trackers;
- no paid APIs;
- no runtime storage.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Refresh the historical dataset

Download the current nflverse player-stat CSV, then run:

```bash
node scripts/build-player-data.mjs /path/to/player_stats.csv public/data/player-seasons.json
```

### Verification

```bash
pnpm lint
pnpm build
pnpm test
```

## Privacy and cost

The app has no account system and sends no draft choices to a server. Matchups,
drafts, scoring, and optimization run in the browser. The deployed MVP can
operate at $0 because all historical data ships as a static asset.

## Roadmap

- calibrate record curves against anonymized real-league weekly distributions;
- deterministic share codes that recreate a completed spin draft;
- Sleeper league import for “how good was my real team?”;
- era-relative value-over-replacement;
- kicker and DST support where source coverage is reliable;
- daily seeded challenge with a common set of spins;
- global scoreboards only if abuse-resistant storage can remain inexpensive.

## Author

Built by [Nishit Samarth](https://github.com/nishitsamarth).
