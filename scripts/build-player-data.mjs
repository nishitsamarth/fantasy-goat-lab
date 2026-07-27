import { readFile, mkdir, writeFile } from "node:fs/promises";

const source = process.argv[2] ?? "/private/tmp/player_stats.csv";
const output = process.argv[3] ?? "public/data/player-seasons.json";
const positions = new Set(["QB", "RB", "WR", "TE"]);

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += char;
  }
  fields.push(field);
  return fields;
}

const raw = await readFile(source, "utf8");
const lines = raw.trim().split(/\r?\n/);
const headers = parseCsvLine(lines.shift());
const column = Object.fromEntries(headers.map((name, index) => [name, index]));
const grouped = new Map();

for (const line of lines) {
  const row = parseCsvLine(line);
  if (row[column.season_type] !== "REG") continue;
  const position = row[column.position];
  if (!positions.has(position)) continue;
  const name = row[column.player_display_name]?.trim();
  if (!name) continue;
  const season = Number(row[column.season]);
  const id = `${row[column.player_id]}-${season}`;
  if (!grouped.has(id)) {
    grouped.set(id, {
      id,
      name,
      position,
      team: row[column.recent_team],
      season,
      weeks: [],
    });
  }
  grouped.get(id).weeks.push([
    Number(row[column.week]),
    Number(Number(row[column.fantasy_points] || 0).toFixed(1)),
    Number(Number(row[column.fantasy_points_ppr] || 0).toFixed(1)),
  ]);
}

let seasons = [...grouped.values()]
  .filter((entry) => entry.weeks.length >= 4)
  .map((entry) => {
    entry.weeks.sort((a, b) => a[0] - b[0]);
    const standard = entry.weeks.reduce((sum, week) => sum + week[1], 0);
    const ppr = entry.weeks.reduce((sum, week) => sum + week[2], 0);
    return { ...entry, standard: +standard.toFixed(1), ppr: +ppr.toFixed(1) };
  });

const rankGroups = new Map();
for (const entry of seasons) {
  const key = `${entry.season}-${entry.position}`;
  if (!rankGroups.has(key)) rankGroups.set(key, []);
  rankGroups.get(key).push(entry);
}
for (const group of rankGroups.values()) {
  group.sort((a, b) => b.ppr - a.ppr);
  group.forEach((entry, index) => {
    entry.positionRank = index + 1;
    entry.positionPool = group.length;
    entry.percentile = Math.round((1 - index / Math.max(group.length - 1, 1)) * 100);
  });
}

seasons = seasons.sort((a, b) => a.name.localeCompare(b.name) || b.season - a.season);
await mkdir(output.slice(0, output.lastIndexOf("/")), { recursive: true });
await writeFile(output, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "nflverse player_stats",
  firstSeason: Math.min(...seasons.map((entry) => entry.season)),
  lastSeason: Math.max(...seasons.map((entry) => entry.season)),
  seasons,
}));
console.log(`Wrote ${seasons.length.toLocaleString()} player-seasons to ${output}`);
