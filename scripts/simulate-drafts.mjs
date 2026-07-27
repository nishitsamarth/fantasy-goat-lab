import { readFile } from "node:fs/promises";

const runs = Number(process.argv[2] ?? 2500);
const scoring = process.argv[3] ?? "ppr";
const mode = process.argv[4] ?? "classic";
const data = JSON.parse(await readFile("public/data/player-seasons.json", "utf8"));
const seasons = data.seasons;

const slotsFor = (format) => format === "superflex"
  ? [["QB", ["QB"]], ["RB1", ["RB"]], ["RB2", ["RB"]], ["WR1", ["WR"]], ["WR2", ["WR"]], ["TE", ["TE"]], ["FLEX", ["RB", "WR", "TE"]], ["SF", ["QB", "RB", "WR", "TE"]]]
  : [["QB", ["QB"]], ["RB1", ["RB"]], ["RB2", ["RB"]], ["WR1", ["WR"]], ["WR2", ["WR"]], ["TE", ["TE"]], ["FLEX", ["RB", "WR", "TE"]]];
const slots = slotsFor(mode);
const center = ({ standard: 83, half: 96, ppr: 108, tep: 111 }[scoring] ?? 108) + (mode === "superflex" ? 17 : 0);

function weekPoints(entry) {
  return entry.weeks.filter(([week]) => week <= 17).map(([week, standard, ppr]) => {
    const receptions = Math.max(0, ppr - standard);
    const value = scoring === "standard" ? standard : scoring === "half" ? standard + receptions * .5 : scoring === "tep" ? ppr + (entry.position === "TE" ? receptions * .5 : 0) : ppr;
    return [week, value];
  });
}
function seasonPoints(entry) {
  return weekPoints(entry).reduce((sum, [, value]) => sum + value, 0);
}
function record(entries) {
  const totals = Array.from({ length: 17 }, (_, index) => entries.reduce((sum, entry) => sum + (weekPoints(entry).find(([week]) => week === index + 1)?.[1] ?? 0), 0));
  const expected = totals.reduce((sum, total) => sum + 1 / (1 + Math.exp(-(total - center) / 12)), 0);
  return Math.max(0, Math.min(17, Math.round(expected)));
}

const byDraw = new Map();
for (const entry of seasons) {
  const key = `${entry.season}-${entry.team}`;
  if (!byDraw.has(key)) byDraw.set(key, []);
  byDraw.get(key).push(entry);
}
const allDraws = [...byDraw.keys()];

function optimize(draws) {
  let states = new Map([[0, { score: 0, entries: [] }]]);
  for (const draw of draws) {
    const next = new Map();
    for (const [mask, state] of states) {
      slots.forEach(([, eligible], slotIndex) => {
        if (mask & (1 << slotIndex)) return;
        byDraw.get(draw).filter((entry) => eligible.includes(entry.position)).forEach((entry) => {
          if (state.entries.some((selected) => selected.name === entry.name)) return;
          const nextMask = mask | (1 << slotIndex);
          const score = state.score + seasonPoints(entry);
          if (!next.has(nextMask) || next.get(nextMask).score < score) {
            next.set(nextMask, { score, entries: [...state.entries, entry] });
          }
        });
      });
    }
    states = next;
  }
  return states.get((1 << slots.length) - 1)?.entries ?? [];
}

function simulate(strategy) {
  const picks = new Map();
  const draws = [];
  const used = new Set();
  while (picks.size < slots.length) {
    const openPositions = new Set(slots.filter(([key]) => !picks.has(key)).flatMap(([, eligible]) => eligible));
    const pool = allDraws.filter((key) => !used.has(key) && byDraw.get(key).some((entry) => openPositions.has(entry.position)));
    const draw = pool[Math.floor(Math.random() * pool.length)];
    used.add(draw);
    draws.push(draw);
    const draftedNames = new Set([...picks.values()].map((entry) => entry.name));
    const legal = byDraw.get(draw).filter((entry) => openPositions.has(entry.position) && !draftedNames.has(entry.name)).sort((a, b) => seasonPoints(b) - seasonPoints(a));
    const entry = strategy === "strong" ? legal[0] : legal[Math.floor(Math.random() * Math.min(5, legal.length))];
    const compatible = slots.filter(([key, eligible]) => !picks.has(key) && eligible.includes(entry.position));
    const nonFlex = compatible.find(([key]) => !["FLEX", "SF"].includes(key));
    picks.set((nonFlex ?? compatible[0])[0], entry);
  }
  const optimal = optimize(draws);
  return { user: record([...picks.values()]), optimal: record(optimal) };
}

for (const strategy of ["random-top-five", "strong"]) {
  const results = Array.from({ length: runs }, () => simulate(strategy === "strong" ? "strong" : "random"));
  const summarize = (key) => {
    const values = results.map((result) => result[key]);
    const histogram = Object.fromEntries([...new Set(values)].sort((a, b) => a - b).map((value) => [value, values.filter((item) => item === value).length]));
    return {
      average: +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
      perfect: values.filter((value) => value === 17).length,
      perfectRate: `${(values.filter((value) => value === 17).length / values.length * 100).toFixed(2)}%`,
      range: [Math.min(...values), Math.max(...values)],
      histogram,
    };
  };
  console.log(JSON.stringify({ runs, scoring, mode, strategy, user: summarize("user"), optimizer: summarize("optimal") }, null, 2));
}
