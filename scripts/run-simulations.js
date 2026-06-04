import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import simulationConfig from "../src/game-server/simulation_config.json" with { type: "json" };
import serverConfig from "../src/game-server/server_config.json" with { type: "json" };
import { GameServer } from "../src/game-server/Gameserver.js";

const twoDecimals = (n) => Number(Number(n).toFixed(2));

/** Largest bananaMeter.levelThresholds floor satisfied by this count (0–30). */
const activeThresholdForCount = (count, sortedThresholds) => {
  const c = Math.max(0, Math.floor(Number(count) || 0));
  let best = sortedThresholds[0] ?? 0;
  for (const t of sortedThresholds) {
    if (c >= t) best = t;
  }
  return best;
};

/** State where server decided to enter bonus (meter gate). */
const findBonusTriggerState = (states) => {
  if (!Array.isArray(states)) return null;
  for (const s of states) {
    if (s?.nextAction === "bonustransition") return s;
  }
  for (let i = 0; i < states.length - 1; i += 1) {
    const cur = states[i];
    const next = states[i + 1];
    if (next?.isBonus === true && cur?.isBonus !== true && next?.executedAction === "bonustransition") {
      return cur;
    }
  }
  return null;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      out[key] = true;
      continue;
    }

    out[key] = value;
    i += 1;
  }

  return out;
};

const pad2 = (value) => String(value).padStart(2, "0");
const toPathSafe = (value) => String(value).replace(/[^a-zA-Z0-9._-]/g, "_");

/** Attribute each twa step to main (spin/respin) vs bonus using previous state's isBonus. */
const splitRoundTwaByPhase = (states) => {
  let mainGameWin = 0;
  let bonusWin = 0;
  let prevTwa = 0;
  let prevInBonus = false;
  for (const s of states) {
    const twa = Number(s?.twa) || 0;
    const delta = twa - prevTwa;
    if (prevInBonus) bonusWin += delta;
    else mainGameWin += delta;
    prevTwa = twa;
    prevInBonus = s?.isBonus === true;
  }
  return { mainGameWin, bonusWin };
};

const meanOf = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

const populationVariance = (values, mean) =>
  values.length ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length : 0;
const applyOutputTokens = (template, tokens) =>
  String(template).replace(/\{(date|time|timestamp|strategy|rounds|bet)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key]) : _
  );

const args = parseArgs();

const rounds = Number(args.rounds ?? simulationConfig.rounds ?? 10000);
const betSize = Number(args.betSize ?? simulationConfig.betSize ?? 1);
const ticketStrategy = String(args.ticketStrategy ?? simulationConfig.ticketStrategy ?? "normal");
const outputPathTemplate = String(
  args.output ?? simulationConfig.outputPath ?? "simulation-output/sim-{timestamp}.json"
);
const progressEvery = Number(args.progressEvery ?? 5000);
const quietRoundLogs = String(args.quietRoundLogs ?? "true") !== "false";

if (!Number.isFinite(rounds) || rounds <= 0) {
  throw new Error(`Invalid --rounds value: ${rounds}`);
}

if (!Number.isFinite(betSize) || betSize <= 0) {
  throw new Error(`Invalid --betSize value: ${betSize}`);
}

const server = new GameServer();
const availableTicketStrategies = server.getAvailableTicketStrategies();
const resolvedTicketStrategy = server.resolveTicketStrategy(ticketStrategy);
const explicitTicketStrategyArg = typeof args.ticketStrategy === "string";

if (explicitTicketStrategyArg && resolvedTicketStrategy !== ticketStrategy) {
  console.warn(
    `[sim] Requested ticket strategy "${ticketStrategy}" is unavailable. Using "${resolvedTicketStrategy}" instead.`
  );
  console.warn(`[sim] Available strategies: ${availableTicketStrategies.join(", ")}`);
}

const now = new Date();
const dateToken = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
const timeToken = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
const timestampToken = `${dateToken}_${timeToken}`;
const outputTokens = {
  date: dateToken,
  time: timeToken,
  timestamp: timestampToken,
  strategy: toPathSafe(resolvedTicketStrategy),
  rounds: String(rounds),
  bet: String(betSize).replace(".", "_")
};
const outputPath = applyOutputTokens(outputPathTemplate, outputTokens);

const originalConsoleLog = console.log.bind(console);

if (quietRoundLogs) {
  console.log = (...parts) => {
    if (parts.length === 1 && typeof parts[0] === "string") {
      const msg = parts[0];
      if (msg === ">>> Generating game round" || msg.startsWith("[DEV Tickets]")) {
        return;
      }
    }
    originalConsoleLog(...parts);
  };
}

const wins = [];
let totalStake = 0;
let totalPayout = 0;
let completedRounds = 0;
let failedRounds = 0;
let hitRounds = 0;
let noHitRounds = 0;
let maxWin = 0;

let bonusRounds = 0;
let totalBonusPhaseWin = 0;
let totalRoundWinWhenBonus = 0;
let totalBonusBananas = 0;
const mainGameWinsPerRound = [];
const bonusWinsPerBonusRound = [];

const levelThresholdsRaw = Array.isArray(serverConfig?.bananaMeter?.levelThresholds)
  ? serverConfig.bananaMeter.levelThresholds.map((t) => Number(t)).filter((t) => Number.isFinite(t))
  : [0, 5, 10, 15, 20, 25, 30];
const levelThresholdsSorted = [...new Set(levelThresholdsRaw)].sort((a, b) => a - b);

const bonusTriggerByActiveThreshold = new Map();
const bonusTriggerByMeterLevel = new Map();
let bonusTriggerStateMissingCount = 0;

const bonusEndByActiveThreshold = new Map();
/** meterLevel -> { count, sumFinalTbm } for end-of-bonus rounds */
const bonusEndByMeterLevel = new Map();

const bumpBonusEndMeterLevel = (level, finalRoundTbm) => {
  const tbm = Number.isFinite(Number(finalRoundTbm)) ? Number(finalRoundTbm) : 0;
  const prev = bonusEndByMeterLevel.get(level) || { count: 0, sumFinalTbm: 0 };
  prev.count += 1;
  prev.sumFinalTbm += tbm;
  bonusEndByMeterLevel.set(level, prev);
};

const startedAt = performance.now();

for (let i = 1; i <= rounds; i += 1) {
  const states = await server.generateRoundStates({ betSize, ticketStrategy: resolvedTicketStrategy });
  if (!states.length) {
    failedRounds += 1;
    continue;
  }

  const firstState = states[0];
  const lastState = states[states.length - 1];

  if (lastState.nextAction !== "spin") {
    failedRounds += 1;
    continue;
  }

  const roundStake = Number(firstState?.roundMeta?.roundCost);
  const roundWin = Number(lastState?.twa);

  const safeStake = Number.isFinite(roundStake) ? roundStake : betSize;
  const safeWin = Number.isFinite(roundWin) ? roundWin : 0;

  totalStake += safeStake;
  totalPayout += safeWin;
  wins.push(safeWin);
  completedRounds += 1;
  maxWin = Math.max(maxWin, safeWin);

  if (safeWin > 0) hitRounds += 1;
  else noHitRounds += 1;

  const { mainGameWin, bonusWin } = splitRoundTwaByPhase(states);
  mainGameWinsPerRound.push(mainGameWin);

  const summary = lastState?.roundSummary;
  if (summary?.wasBonus) {
    bonusRounds += 1;
    bonusWinsPerBonusRound.push(bonusWin);
    totalBonusPhaseWin += bonusWin;
    totalRoundWinWhenBonus += safeWin;
    // Final banana meter on the returned state (post-normalize): includes main-game meter
    // up to bonus trigger plus everything collected in bonus; not "bonus-only delta".
    const finalMeterCount = Math.min(30, Number(lastState?.bananaMeter?.count) || 0);
    totalBonusBananas += finalMeterCount;

    const triggerState = findBonusTriggerState(states);
    if (triggerState) {
      const triggerCount = Math.min(
        30,
        Math.floor(
          Number(triggerState.bananaMeter?.count ?? triggerState.bananaMeterCount ?? 0) || 0
        )
      );
      const triggerLevel = Math.max(
        0,
        Math.floor(Number(triggerState.bananaMeter?.level ?? triggerState.bananaMeterLevel ?? 0) || 0)
      );
      const triggerTh = activeThresholdForCount(triggerCount, levelThresholdsSorted);
      bonusTriggerByActiveThreshold.set(
        triggerTh,
        (bonusTriggerByActiveThreshold.get(triggerTh) || 0) + 1
      );
      bonusTriggerByMeterLevel.set(triggerLevel, (bonusTriggerByMeterLevel.get(triggerLevel) || 0) + 1);
    } else {
      bonusTriggerStateMissingCount += 1;
    }

    const endCount = Math.min(
      30,
      Math.floor(Number(lastState.bananaMeter?.count ?? lastState.bananaMeterCount ?? 0) || 0)
    );
    const endLevel = Math.max(
      0,
      Math.floor(Number(lastState.bananaMeter?.level ?? lastState.bananaMeterLevel ?? 0) || 0)
    );
    const endTh = activeThresholdForCount(endCount, levelThresholdsSorted);
    bonusEndByActiveThreshold.set(endTh, (bonusEndByActiveThreshold.get(endTh) || 0) + 1);
    const finalRoundTbm = Number(lastState?.tbm ?? summary?.tbm ?? 0);
    bumpBonusEndMeterLevel(endLevel, finalRoundTbm);
  }

  if (progressEvery > 0 && i % progressEvery === 0) {
    const elapsedSec = (performance.now() - startedAt) / 1000;
    console.log(
      `[sim] processed ${i}/${rounds} rounds in ${elapsedSec.toFixed(1)}s (completed: ${completedRounds}, failed: ${failedRounds})`
    );
  }
}

const elapsedMs = performance.now() - startedAt;
const averageWin = completedRounds > 0 ? totalPayout / completedRounds : 0;
const rtp = totalStake > 0 ? (totalPayout / totalStake) * 100 : 0;
const hitRate = completedRounds > 0 ? hitRounds / completedRounds : 0;

wins.sort((a, b) => a - b);
const medianWin = wins.length ? wins[Math.floor((wins.length - 1) / 2)] : 0;

const variance =
  wins.length > 0 ? wins.reduce((sum, value) => sum + (value - averageWin) ** 2, 0) / wins.length : 0;
const stdDev = Math.sqrt(variance);

const avgMainGameWin = meanOf(mainGameWinsPerRound);
const mainGameVariance = populationVariance(mainGameWinsPerRound, avgMainGameWin);
const mainGameStdDev = Math.sqrt(mainGameVariance);

const avgBonusPhaseWin = meanOf(bonusWinsPerBonusRound);
const bonusWinVariance = populationVariance(bonusWinsPerBonusRound, avgBonusPhaseWin);
const bonusWinStdDev = Math.sqrt(bonusWinVariance);

const buildBonusShareRows = (countMap, totalBonuses) => {
  if (totalBonuses <= 0) return [];
  return [...countMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, n]) => ({
      key,
      bonuses: n,
      shareOfBonusesPercent: twoDecimals((n / totalBonuses) * 100)
    }));
};

const atBonusTriggerByActiveThreshold = buildBonusShareRows(
  bonusTriggerByActiveThreshold,
  bonusRounds
).map((row) => ({
  thresholdMin: row.key,
  bonuses: row.bonuses,
  shareOfBonusesPercent: row.shareOfBonusesPercent
}));

const atBonusTriggerByMeterLevel = buildBonusShareRows(bonusTriggerByMeterLevel, bonusRounds).map(
  (row) => ({
    meterLevel: row.key,
    bonuses: row.bonuses,
    shareOfBonusesPercent: row.shareOfBonusesPercent
  })
);

const atBonusEndByActiveThreshold = buildBonusShareRows(bonusEndByActiveThreshold, bonusRounds).map(
  (row) => ({
    thresholdMin: row.key,
    bonuses: row.bonuses,
    shareOfBonusesPercent: row.shareOfBonusesPercent
  })
);

const atBonusEndByMeterLevel =
  bonusRounds <= 0
    ? []
    : [...bonusEndByMeterLevel.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([meterLevel, agg]) => {
          const n = agg.count;
          const sum = agg.sumFinalTbm;
          return {
            meterLevel,
            bonuses: n,
            shareOfBonusesPercent: twoDecimals((n / bonusRounds) * 100),
            totalFinalTbm: Number(sum.toFixed(4)),
            averageFinalTbm: n > 0 ? twoDecimals(sum / n) : 0
          };
        });

const bonusRatePercent =
  completedRounds > 0 ? twoDecimals((bonusRounds / completedRounds) * 100) : 0;

const report = {
  config: {
    roundsRequested: rounds,
    betSize,
    ticketStrategy: resolvedTicketStrategy,
    requestedTicketStrategy: ticketStrategy,
    availableTicketStrategies,
    outputPathTemplate,
    resolvedOutputPath: outputPath
  },
  runtime: {
    completedRounds,
    failedRounds,
    durationMs: Number(elapsedMs.toFixed(2))
  },
  metrics: {
    totalStake: Number(totalStake.toFixed(4)),
    totalPayout: Number(totalPayout.toFixed(4)),
    rtpPercent: Number(rtp.toFixed(4)),
    averageWin: Number(averageWin.toFixed(4)),
    medianWin: Number(medianWin.toFixed(4)),
    maxWin: Number(maxWin.toFixed(4)),
    hitRate: Number(hitRate.toFixed(4)),
    noHitRounds,
    variance: Number(variance.toFixed(6)),
    stdDev: Number(stdDev.toFixed(6))
  },
  mainGameSpinRespin: {
    description: "Per completed round: win attributed to main-game actions (spin/respin) before bonus phase",
    sampleCount: completedRounds,
    averageWin: Number(avgMainGameWin.toFixed(6)),
    variance: Number(mainGameVariance.toFixed(6)),
    stdDev: Number(mainGameStdDev.toFixed(6))
  },
  bonus: {
    bonusRounds,
    bonusFrequency:
      bonusRounds > 0
        ? `1/${Number((completedRounds / bonusRounds).toFixed(2))}`
        : "N/A",
    averageBonusPhaseWin:
      bonusRounds > 0 ? Number((totalBonusPhaseWin / bonusRounds).toFixed(4)) : 0,
    averageRoundWinWhenBonus:
      bonusRounds > 0 ? Number((totalRoundWinWhenBonus / bonusRounds).toFixed(4)) : 0,
    averageFinalBananaMeterCount:
      bonusRounds > 0 ? Number((totalBonusBananas / bonusRounds).toFixed(2)) : 0,
    /** @deprecated same as averageFinalBananaMeterCount; kept for older reports */
    averageBonusBananas:
      bonusRounds > 0 ? Number((totalBonusBananas / bonusRounds).toFixed(2)) : 0,
    bonusPhaseWinVariance: Number(bonusWinVariance.toFixed(6)),
    bonusPhaseWinStdDev: Number(bonusWinStdDev.toFixed(6)),
    bonusRatePercent,
    atBonusTrigger: {
      description:
        "Banana meter when bonus STARTS: last server state before bonus with nextAction === 'bonustransition'. (Not the meter when the round finishes.) shareOfBonusesPercent = count in bucket / bonusRounds × 100 (2 dp).",
      referenceLevelThresholds: levelThresholdsSorted,
      byActiveThreshold: atBonusTriggerByActiveThreshold,
      byMeterLevel: atBonusTriggerByMeterLevel,
      triggerStateMissingCount: bonusTriggerStateMissingCount
    },
    atBonusEnd: {
      description:
        "Banana meter when bonus is DONE: final completed-round state (nextAction spin, wasBonus true) — same snapshot as averageFinalBananaMeterCount. shareOfBonusesPercent = count in bucket / bonusRounds × 100 (2 dp). byMeterLevel adds totalFinalTbm (sum of lastState.tbm in bucket) and averageFinalTbm (mean TBM per bonus in that bucket, 2 dp).",
      referenceLevelThresholds: levelThresholdsSorted,
      byActiveThreshold: atBonusEndByActiveThreshold,
      byMeterLevel: atBonusEndByMeterLevel
    },
    description:
      "averageFinalBananaMeterCount: mean end-of-round banana meter (lastState.bananaMeter.count after normalize), capped at 30 per round for this average — includes bananas from base game on the meter before/during bonus, not 'collected only inside bonus'. bonusPhaseWin* = twa while isBonus; averageRoundWinWhenBonus = full round twa when bonus occurred."
  },
  generatedAt: new Date().toISOString()
};

const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
fs.writeFileSync(resolvedOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("\n========== Simulation Complete ==========");
console.log(`Rounds requested: ${rounds}`);
console.log(`Rounds completed: ${completedRounds}`);
console.log(`Rounds failed:    ${failedRounds}`);
console.log(`Strategy:         ${resolvedTicketStrategy}${resolvedTicketStrategy !== ticketStrategy ? ` (requested: ${ticketStrategy})` : ""}`);
console.log(`Total stake:      ${report.metrics.totalStake}`);
console.log(`Total payout:     ${report.metrics.totalPayout}`);
console.log(`RTP:              ${report.metrics.rtpPercent}%`);
console.log(`Hit rate:         ${report.metrics.hitRate}`);
console.log(`Max win:          ${report.metrics.maxWin}`);
console.log(`Bonus frequency:     ${report.bonus.bonusFrequency} (${report.bonus.bonusRounds} bonuses)`);
console.log(`Bonus rate:          ${report.bonus.bonusRatePercent}% of completed rounds`);
if (report.bonus.atBonusTrigger.byActiveThreshold.length > 0) {
  const t = report.bonus.atBonusTrigger.byActiveThreshold
    .map((r) => `≥${r.thresholdMin}:${r.shareOfBonusesPercent}%`)
    .join(" | ");
  console.log(`At bonus TRIGGER (share): ${t}`);
}
if (report.bonus.atBonusEnd.byActiveThreshold.length > 0) {
  const t = report.bonus.atBonusEnd.byActiveThreshold
    .map((r) => `≥${r.thresholdMin}:${r.shareOfBonusesPercent}%`)
    .join(" | ");
  console.log(`At bonus END (share):     ${t}`);
}
console.log(`Main game var/std:   ${report.mainGameSpinRespin.variance} / ${report.mainGameSpinRespin.stdDev}`);
console.log(`Bonus phase win avg: ${report.bonus.averageBonusPhaseWin}`);
console.log(`Bonus phase var/std: ${report.bonus.bonusPhaseWinVariance} / ${report.bonus.bonusPhaseWinStdDev}`);
console.log(`Round win if bonus:  ${report.bonus.averageRoundWinWhenBonus}`);
console.log(`Avg final banana meter: ${report.bonus.averageFinalBananaMeterCount} (cap 30/round)`);
console.log(`Output:           ${resolvedOutputPath}`);
console.log("========================================\n");
