"use client";

import { useEffect, useMemo, useState } from "react";

type Week = [number, number, number];
type Position = "QB" | "RB" | "WR" | "TE";
type Season = {
  id: string; name: string; position: Position; team: string; season: number;
  weeks: Week[]; standard: number; ppr: number;
  positionRank: number; positionPool: number; percentile: number;
};
type Data = { firstSeason: number; lastSeason: number; seasons: Season[] };
type Scoring = "standard" | "half" | "ppr" | "tep";
type RosterMode = "classic" | "superflex" | "hero";

const PRESETS = [
  ["00-0020536-2006", "00-0033280-2023", "RB royalty"],
  ["00-0033873-2018", "00-0034796-2019", "MVP quarterbacks"],
  ["00-0011754-2007", "00-0033908-2021", "Historic receivers"],
];

function weekPoints(entry: Season, scoring: Scoring) {
  return entry.weeks.map(([week, standard, ppr]) => {
    const receptions = Math.max(0, ppr - standard);
    const value =
      scoring === "standard" ? standard :
      scoring === "half" ? standard + receptions * .5 :
      scoring === "tep" ? ppr + (entry.position === "TE" ? receptions * .5 : 0) :
      ppr;
    return { week, value };
  });
}

function getStats(entry: Season, scoring: Scoring) {
  const weeks = weekPoints(entry, scoring);
  const values = weeks.map((item) => item.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / Math.max(values.length, 1);
  const ordered = [...values].sort((a, b) => a - b);
  const playoffs = weeks.filter((item) => item.week >= 15 && item.week <= 17);
  return {
    total,
    average,
    floor: ordered[Math.floor(ordered.length * .25)] ?? 0,
    boom: values.filter((value) => value >= (entry.position === "QB" ? 25 : 20)).length,
    playoffs: playoffs.reduce((sum, item) => sum + item.value, 0) / Math.max(playoffs.length, 1),
  };
}

function SeasonPicker({ label, value, seasons, onChange }: {
  label: string; value: string; seasons: Season[]; onChange: (id: string) => void;
}) {
  const selected = seasons.find((entry) => entry.id === value) ?? seasons[0];
  const names = useMemo(() => [...new Set(seasons.map((entry) => entry.name))].sort(), [seasons]);
  const name = selected?.name ?? "";
  const available = seasons.filter((entry) => entry.name === name);
  return (
    <div className="picker">
      <span className="eyebrow">{label}</span>
      <label><span>Player</span>
        <select value={name} onChange={(event) => {
          const next = seasons.find((entry) => entry.name === event.target.value);
          if (next) onChange(next.id);
        }}>
          {names.map((player) => <option key={player}>{player}</option>)}
        </select>
      </label>
      <label><span>Season</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {available.map((entry) => <option value={entry.id} key={entry.id}>{entry.season} · {entry.team} · {entry.position}</option>)}
        </select>
      </label>
    </div>
  );
}

function PlayerCard({ entry, scoring, accent }: { entry: Season; scoring: Scoring; accent?: boolean }) {
  const stats = getStats(entry, scoring);
  return (
    <article className={`player-card ${accent ? "accent" : ""}`}>
      <div className="player-heading">
        <div><span className="player-meta">{entry.position} · {entry.team}</span><h2>{entry.name}</h2></div>
        <strong>{entry.season}</strong>
      </div>
      <div className="primary-score"><span>{stats.total.toFixed(1)}</span><small>fantasy points</small></div>
      <div className="mini-stats">
        <div><strong>{stats.average.toFixed(1)}</strong><span>PPG</span></div>
        <div><strong>#{entry.positionRank}</strong><span>{entry.position} rank</span></div>
        <div><strong>{entry.percentile}th</strong><span>percentile</span></div>
      </div>
      <div className="bars" aria-label={`${entry.name} weekly fantasy points`}>
        {weekPoints(entry, scoring).map((item) =>
          <div className="week-bar-wrap" key={item.week}>
            <b>{item.value.toFixed(0)}</b><i style={{ height: `${Math.max(8, Math.min(100, item.value * 2.4))}%` }} /><small>{item.week}</small>
          </div>
        )}
      </div>
    </article>
  );
}

function slotsFor(mode: RosterMode): Array<{ key: string; label: string; eligible: Position[] }> {
  if (mode === "superflex") return [
    { key: "qb", label: "QB", eligible: ["QB"] }, { key: "rb1", label: "RB 1", eligible: ["RB"] },
    { key: "rb2", label: "RB 2", eligible: ["RB"] }, { key: "wr1", label: "WR 1", eligible: ["WR"] },
    { key: "wr2", label: "WR 2", eligible: ["WR"] }, { key: "te", label: "TE", eligible: ["TE"] },
    { key: "flex", label: "FLEX", eligible: ["RB", "WR", "TE"] }, { key: "sf", label: "SUPERFLEX", eligible: ["QB", "RB", "WR", "TE"] },
  ];
  if (mode === "hero") return [
    { key: "qb", label: "QB", eligible: ["QB"] }, { key: "rb", label: "HERO RB", eligible: ["RB"] },
    { key: "wr1", label: "WR 1", eligible: ["WR"] }, { key: "wr2", label: "WR 2", eligible: ["WR"] },
    { key: "wr3", label: "WR 3", eligible: ["WR"] }, { key: "te", label: "TE", eligible: ["TE"] },
    { key: "flex", label: "FLEX", eligible: ["RB", "WR", "TE"] },
  ];
  return [
    { key: "qb", label: "QB", eligible: ["QB"] }, { key: "rb1", label: "RB 1", eligible: ["RB"] },
    { key: "rb2", label: "RB 2", eligible: ["RB"] }, { key: "wr1", label: "WR 1", eligible: ["WR"] },
    { key: "wr2", label: "WR 2", eligible: ["WR"] }, { key: "te", label: "TE", eligible: ["TE"] },
    { key: "flex", label: "FLEX", eligible: ["RB", "WR", "TE"] },
  ];
}

type Draw = { season: number; team: string };

function recordCenter(scoring: Scoring, mode: RosterMode) {
  const scoringCenter = scoring === "standard" ? 83 : scoring === "half" ? 96 : scoring === "tep" ? 111 : 108;
  return scoringCenter + (mode === "superflex" ? 17 : 0);
}

function expectedRecord(entries: Season[], scoring: Scoring, mode: RosterMode) {
  const totals = Array.from({ length: 18 }, (_, index) => entries.reduce((sum, entry) => {
    return sum + (weekPoints(entry, scoring).find((item) => item.week === index + 1)?.value ?? 0);
  }, 0)).filter((value) => value > 0);
  const center = recordCenter(scoring, mode);
  const expectedWins = totals.reduce((sum, total) => sum + 1 / (1 + Math.exp(-(total - center) / 15)), 0);
  return {
    wins: Math.max(0, Math.min(totals.length, Math.round(expectedWins))),
    games: totals.length,
    average: totals.reduce((sum, total) => sum + total, 0) / Math.max(totals.length, 1),
  };
}

function SpinDraft({ seasons }: { seasons: Season[] }) {
  const [scoring, setScoring] = useState<Scoring>("ppr");
  const [mode, setMode] = useState<RosterMode>("classic");
  const [draws, setDraws] = useState<Draw[]>([]);
  const [picks, setPicks] = useState<Record<string, Season>>({});
  const [currentDraw, setCurrentDraw] = useState<Draw | null>(null);
  const [rerolls, setRerolls] = useState(2);
  const slots = useMemo(() => slotsFor(mode), [mode]);
  const round = Object.keys(picks).length;

  const drawPool = useMemo(() => {
    const openPositions = new Set(
      slots.filter((slot) => !picks[slot.key]).flatMap((slot) => slot.eligible),
    );
    const usedDraws = new Set(draws.map((draw) => `${draw.season}-${draw.team}`));
    const keys = new Map<string, { draw: Draw; players: Set<string> }>();
    seasons.forEach((entry) => {
      if (!openPositions.has(entry.position)) return;
      const key = `${entry.season}-${entry.team}`;
      if (usedDraws.has(key)) return;
      if (!keys.has(key)) keys.set(key, { draw: { season: entry.season, team: entry.team }, players: new Set() });
      keys.get(key)!.players.add(entry.id);
    });
    return [...keys.values()].map((item) => item.draw);
  }, [seasons, slots, picks, draws]);

  const choices = useMemo(() => {
    if (!currentDraw) return [];
    return seasons
      .filter((entry) =>
        entry.season === currentDraw.season &&
        entry.team === currentDraw.team)
      .sort((a, b) => getStats(b, scoring).total - getStats(a, scoring).total);
  }, [currentDraw, seasons, scoring]);

  const spin = (isReroll = false) => {
    if (!drawPool.length) return;
    if (isReroll) setRerolls((value) => value - 1);
    setCurrentDraw(drawPool[Math.floor(Math.random() * drawPool.length)]);
  };

  const choose = (entry: Season, slotKey: string) => {
    if (!currentDraw) return;
    setPicks((current) => ({ ...current, [slotKey]: entry }));
    setDraws((current) => [...current, currentDraw]);
    setCurrentDraw(null);
  };

  const reset = (nextMode = mode) => {
    setMode(nextMode); setDraws([]); setPicks({}); setCurrentDraw(null); setRerolls(2);
  };

  const complete = round >= slots.length;
  const optimal = useMemo(() => {
    if (!complete) return [] as Array<{ entry: Season; slotKey: string }>;
    type State = { score: number; assignments: Array<{ entry: Season; slotKey: string }> };
    let states = new Map<number, State>([[0, { score: 0, assignments: [] }]]);
    draws.forEach((draw) => {
      const available = seasons.filter((entry) => entry.season === draw.season && entry.team === draw.team);
      const next = new Map<number, State>();
      states.forEach((state, mask) => {
        slots.forEach((slot, slotIndex) => {
          if (mask & (1 << slotIndex)) return;
          available.filter((entry) => slot.eligible.includes(entry.position)).forEach((entry) => {
            const nextMask = mask | (1 << slotIndex);
            const score = state.score + getStats(entry, scoring).total;
            if (!next.has(nextMask) || next.get(nextMask)!.score < score) {
              next.set(nextMask, { score, assignments: [...state.assignments, { entry, slotKey: slot.key }] });
            }
          });
        });
      });
      states = next;
    });
    return states.get((1 << slots.length) - 1)?.assignments ?? [];
  }, [complete, draws, seasons, slots, scoring]);
  const pickedEntries = Object.values(picks);
  const yours = complete ? expectedRecord(pickedEntries, scoring, mode) : null;
  const optimalEntries = optimal.map((assignment) => assignment.entry);
  const best = complete ? expectedRecord(optimalEntries, scoring, mode) : null;
  const yourPoints = pickedEntries.reduce((sum, entry) => sum + getStats(entry, scoring).total, 0);
  const bestPoints = optimalEntries.reduce((sum, entry) => sum + getStats(entry, scoring).total, 0);
  const efficiency = bestPoints ? Math.round((yourPoints / bestPoints) * 100) : 0;

  return (
    <section className="draft-section" id="draft">
      <div className="draft-head">
        <div><span className="eyebrow">THE SPIN DRAFT</span><h2>Your era. Your franchise. Your pick.</h2></div>
        <p>Every round hands you one random team-season. Make the best pick you can, then face the lineup an optimizer would have built from the exact same spins.</p>
      </div>
      <div className="draft-settings">
        <div className="setting"><span>SCORING</span>{(["standard", "half", "ppr", "tep"] as Scoring[]).map((item) =>
          <button className={scoring === item ? "active" : ""} key={item} onClick={() => setScoring(item)}>
            {item === "standard" ? "STD" : item === "half" ? ".5 PPR" : item === "tep" ? "TE+" : "PPR"}
          </button>)}
        </div>
        <div className="setting"><span>LINEUP</span>{(["classic", "superflex", "hero"] as RosterMode[]).map((item) =>
          <button className={mode === item ? "active" : ""} key={item} onClick={() => reset(item)}>
            {item === "classic" ? "1QB" : item === "superflex" ? "SF" : "HERO RB"}
          </button>)}
        </div>
      </div>

      {!complete ? <div className="draft-board">
        <div className="round-status">
          <span>ROUND {round + 1} / {slots.length}</span><strong>ANY<br/>POSITION</strong>
          <div className="slot-dots">{slots.map((item, index) => <i className={index < round ? "done" : index === round ? "current" : ""} key={item.key} />)}</div>
        </div>
        <div className="spin-stage">
          {!currentDraw ? <>
            <span className="spin-ghost">?</span>
            <button className="spin-button" onClick={() => spin()}>SPIN<br/><small>TEAM + YEAR</small></button>
            <p>{rerolls} rerolls remaining</p>
          </> : <>
            <div className="draw-reveal"><span>{currentDraw.team}</span><strong>{currentDraw.season}</strong></div>
            <div className="choice-list">
              {choices.map((entry) => {
                const openSlots = slots.filter((candidate) => !picks[candidate.key] && candidate.eligible.includes(entry.position));
                if (!openSlots.length) return null;
                return <div className="choice-row" key={entry.id}>
                  <span><b>{entry.name}</b><small>{entry.position} · {entry.weeks.length} games · {getStats(entry, scoring).average.toFixed(1)} PPG</small></span>
                  <div>{openSlots.map((candidate) => <button key={candidate.key} onClick={() => choose(entry, candidate.key)}>Draft as {candidate.label}</button>)}</div>
                </div>;
              })}
            </div>
            <button className="reroll" disabled={!rerolls} onClick={() => spin(true)}>↻ Reroll this draw ({rerolls})</button>
          </>}
        </div>
        <div className="drafted">
          <span className="eyebrow">YOUR ROSTER</span>
          {slots.map((item) => <div className="drafted-row" key={item.key}>
            <span>{item.label}</span>{picks[item.key] ? <><b>{picks[item.key].name}</b><small>{picks[item.key].season} {picks[item.key].team}</small></> : <em>OPEN</em>}
          </div>)}
        </div>
      </div> :
      <div className="draft-results">
        <div className="record-card yours"><span>YOUR PROJECTED RECORD</span><strong>{yours?.wins}–{(yours?.games ?? 0) - (yours?.wins ?? 0)}</strong><small>{yours?.average.toFixed(1)} points per week · {recordCenter(scoring, mode)}-point midpoint</small></div>
        <div className="efficiency"><span>DRAFT EFFICIENCY</span><strong>{efficiency}%</strong><p>The optimizer solved the best full-roster assignment across your exact sequence of spins—not just the best isolated player in each round.</p></div>
        <div className="record-card optimum"><span>OPTIMAL PROJECTED RECORD</span><strong>{best?.wins}–{(best?.games ?? 0) - (best?.wins ?? 0)}</strong><small>{best?.average.toFixed(1)} points per week</small></div>
        <div className="combo-compare">
          <div><span className="eyebrow">YOUR ROSTER</span>{slots.map((slot) => <div className="combo-row" key={`you-${slot.key}`}><span>{slot.label}</span><b>{picks[slot.key]?.name}</b><small>{picks[slot.key]?.season} {picks[slot.key]?.team}</small></div>)}</div>
          <div><span className="eyebrow">PERFECT COMBO</span>{slots.map((slot) => {
            const assignment = optimal.find((item) => item.slotKey === slot.key);
            return <div className="combo-row" key={`optimal-${slot.key}`}><span>{slot.label}</span><b>{assignment?.entry.name}</b><small>{assignment?.entry.season} {assignment?.entry.team}</small></div>;
          })}</div>
        </div>
        <div className="result-actions"><button onClick={() => reset()}>Draft again</button><button onClick={() => navigator.share ? navigator.share({ title: `My Fantasy GOAT Lab result: ${yours?.wins}-${(yours?.games ?? 0) - (yours?.wins ?? 0)}`, url: location.href }) : navigator.clipboard.writeText(location.href)}>Share result ↗</button></div>
      </div>}
      <p className="algorithm-note">Record model: each real weekly lineup score is converted to win probability against a format-specific historical scoring curve; probabilities are summed and rounded. The optimal roster uses the same draws and scoring rules.</p>
    </section>
  );
}

function LineupLab({ seasons, scoring }: { seasons: Season[]; scoring: Scoring }) {
  const [mode, setMode] = useState<RosterMode>("classic");
  const slots = useMemo(() => slotsFor(mode), [mode]);
  const candidateMap = useMemo(() => {
    const map = {} as Record<Position, Season[]>;
    (["QB", "RB", "WR", "TE"] as Position[]).forEach((position) => {
      map[position] = seasons.filter((entry) => entry.position === position)
        .sort((a, b) => getStats(b, scoring).total - getStats(a, scoring).total).slice(0, 30);
    });
    return map;
  }, [seasons, scoring]);
  const makeLineup = (nextMode: RosterMode) => {
    const next: Record<string, string> = {};
    const used = new Set<string>();
    slotsFor(nextMode).forEach((slot) => {
      const choices = slot.eligible.flatMap((position) => candidateMap[position] ?? [])
        .sort((a, b) => getStats(b, scoring).total - getStats(a, scoring).total);
      const pick = choices.find((entry) => !used.has(entry.id));
      if (pick) { next[slot.key] = pick.id; used.add(pick.id); }
    });
    return next;
  };
  const [lineup, setLineup] = useState<Record<string, string>>(() => makeLineup("classic"));

  const selected = Object.values(lineup).map((id) => seasons.find((entry) => entry.id === id)).filter(Boolean) as Season[];
  const totals = Array.from({ length: 18 }, (_, index) => selected.reduce((sum, entry) => {
    return sum + (weekPoints(entry, scoring).find((item) => item.week === index + 1)?.value ?? 0);
  }, 0)).filter((value) => value > 0);
  const average = totals.reduce((sum, value) => sum + value, 0) / Math.max(totals.length, 1);
  const benchmark = recordCenter(scoring, mode);
  const wins = totals.filter((value) => value >= benchmark).length;
  const grade = average >= benchmark + 35 ? "S+" : average >= benchmark + 20 ? "S" : average >= benchmark + 8 ? "A" : "B";

  return (
    <section className="lineup-section" id="lineup">
      <div className="section-copy">
        <span className="eyebrow light">THE ALL-TIME DRAFT</span>
        <h2>Build a lineup that breaks fantasy football.</h2>
        <p>Mix legendary seasons across eras. We replay the real weekly output and grade how often your roster clears a transparent winning benchmark.</p>
      </div>
      <div className="mode-tabs">
        {(["classic", "superflex", "hero"] as RosterMode[]).map((item) =>
          <button className={mode === item ? "active" : ""} key={item} onClick={() => { setMode(item); setLineup(makeLineup(item)); }}>
            {item === "classic" ? "Classic 1QB" : item === "superflex" ? "Superflex" : "Hero RB"}
          </button>
        )}
      </div>
      <div className="lineup-grid">
        <div className="roster">
          {slots.map((slot) => {
            const choices = slot.eligible.flatMap((position) => candidateMap[position] ?? [])
              .sort((a, b) => getStats(b, scoring).total - getStats(a, scoring).total);
            return <label className="roster-row" key={slot.key}><span>{slot.label}</span>
              <select value={lineup[slot.key] ?? ""} onChange={(event) => setLineup((current) => ({ ...current, [slot.key]: event.target.value }))}>
                {choices.map((entry) => <option value={entry.id} key={`${slot.key}-${entry.id}`}>{entry.name} · {entry.season} · {entry.position}</option>)}
              </select>
            </label>;
          })}
        </div>
        <div className="lineup-result">
          <span className="eyebrow light">DOMINANCE GRADE</span><strong className="grade">{grade}</strong>
          <div className="result-line"><span>Average weekly score</span><b>{average.toFixed(1)}</b></div>
          <div className="result-line"><span>Weeks above {benchmark}</span><b>{wins}/{totals.length}</b></div>
          <div className="result-line"><span>Best week</span><b>{Math.max(0, ...totals).toFixed(1)}</b></div>
          <p className="method-note">The benchmark scales for Superflex and is shown explicitly. It is a lab score—not a claim about every league.</p>
        </div>
      </div>
    </section>
  );
}

export default function FantasyLab() {
  const [data, setData] = useState<Data | null>(null);
  const queryValue = (key: string, fallback: string) =>
    typeof window === "undefined" ? fallback : new URLSearchParams(window.location.search).get(key) ?? fallback;
  const [scoring, setScoring] = useState<Scoring>(() => {
    const value = queryValue("scoring", "ppr");
    return ["standard", "half", "ppr", "tep"].includes(value) ? value as Scoring : "ppr";
  });
  const [leftId, setLeftId] = useState(() => queryValue("a", "00-0020536-2006"));
  const [rightId, setRightId] = useState(() => queryValue("b", "00-0033280-2023"));

  useEffect(() => { fetch("/data/player-seasons.json").then((response) => response.json()).then(setData); }, []);

  if (!data) return <main className="loading"><strong>FGL</strong><span>Loading the record book…</span></main>;
  const left = data.seasons.find((entry) => entry.id === leftId) ?? data.seasons[0];
  const right = data.seasons.find((entry) => entry.id === rightId) ?? data.seasons[1];
  const a = getStats(left, scoring);
  const b = getStats(right, scoring);
  const categories = [["Total", a.total, b.total], ["Per game", a.average, b.average], ["Floor", a.floor, b.floor], ["Boom weeks", a.boom, b.boom], ["Playoffs", a.playoffs, b.playoffs]] as const;
  const leftWins = categories.filter(([, x, y]) => x > y).length;
  const rightWins = categories.filter(([, x, y]) => y > x).length;
  const winner = leftWins === rightWins ? null : leftWins > rightWins ? left : right;
  const replaceUrl = (nextA = left.id, nextB = right.id, nextScoring = scoring) => {
    window.history.replaceState({}, "", `?${new URLSearchParams({ a: nextA, b: nextB, scoring: nextScoring })}`);
  };

  return <main>
    <nav><a className="brand" href="#"><span>F</span> GOAT LAB</a><div className="nav-links"><a href="#draft">Spin draft</a><a href="#compare">Compare</a><a href="#lineup">Free build</a><span>{data.firstSeason}—{data.lastSeason}</span></div></nav>
    <header className="hero"><div><span className="eyebrow">THE HISTORICAL FANTASY FOOTBALL LAB</span><h1>Build the best fantasy team <em>ever.</em></h1><p>Spin a team and year. Make your pick. Beat the optimizer.</p></div><a href="#draft" className="down-arrow">↓</a></header>
    <SpinDraft seasons={data.seasons} />
    <section className="comparison" id="compare">
      <div className="comparison-controls">
        <div className="scoring-toggle">{(["standard", "half", "ppr", "tep"] as Scoring[]).map((mode) =>
          <button className={scoring === mode ? "active" : ""} key={mode} onClick={() => { setScoring(mode); replaceUrl(left.id, right.id, mode); }}>
            {mode === "half" ? "Half-PPR" : mode === "tep" ? "TE Premium" : mode === "ppr" ? "PPR" : "Standard"}
          </button>
        )}</div>
        <div className="presets">{PRESETS.map(([x, y, label]) => <button key={label} onClick={() => { setLeftId(x); setRightId(y); replaceUrl(x, y); }}>{label}</button>)}</div>
      </div>
      <div className="pickers">
        <SeasonPicker label="SEASON A" value={left.id} seasons={data.seasons} onChange={(id) => { setLeftId(id); replaceUrl(id, right.id); }} />
        <span className="versus">VS</span>
        <SeasonPicker label="SEASON B" value={right.id} seasons={data.seasons} onChange={(id) => { setRightId(id); replaceUrl(left.id, id); }} />
      </div>
      <div className="cards"><PlayerCard entry={left} scoring={scoring} /><PlayerCard entry={right} scoring={scoring} accent /></div>
      <div className="verdict"><span className="eyebrow">THE VERDICT</span><h2>{winner ? `${winner.name} wins ${Math.max(leftWins, rightWins)}–${Math.min(leftWins, rightWins)}.` : "Dead even. Pick your poison."}</h2>
        <div className="category-table">{categories.map(([label, x, y]) => <div key={label}><strong className={x > y ? "winner" : ""}>{x.toFixed(label === "Boom weeks" ? 0 : 1)}</strong><span>{label}</span><strong className={y > x ? "winner" : ""}>{y.toFixed(label === "Boom weeks" ? 0 : 1)}</strong></div>)}</div>
        <button className="share" onClick={async () => navigator.share ? navigator.share({ title: "Fantasy GOAT Lab", url: location.href }) : navigator.clipboard.writeText(location.href)}>Share this matchup ↗</button>
      </div>
    </section>
    <LineupLab seasons={data.seasons} scoring={scoring} />
    <footer><div><strong>FANTASY GOAT LAB</strong><span>Built from real weekly results.</span></div><p>Data: nflverse · CC BY 4.0 · No betting advice · Not affiliated with the NFL</p></footer>
  </main>;
}
