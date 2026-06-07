import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import simulationConfig from "../src/game-server/simulation_config.json" with { type: "json" };
import serverConfig from "../src/game-server/server_config.json" with { type: "json" };
import { GameServer } from "../src/game-server/Gameserver.js";

const twoDecimals = (n) => Number(Number(n).toFixed(2));
const fourDecimals = (n) => Number(Number(n).toFixed(4));

const ABILITY_KEYS = ["divineX", "divineStrike", "divineCharge", "baseHunt", "other"];
const ABILITY_PROC_KEYS = ["divineX", "divineStrike", "divineCharge"];

const emptyAbilityContribution = () => ({
  divineX: 0,
  divineStrike: 0,
  divineCharge: 0,
  baseHunt: 0,
  other: 0
});

const emptyAbilityProcCounts = () => ({
  divineX: 0,
  divineStrike: 0,
  divineCharge: 0
});

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

const readRoundTbm = (state) => {
  const fromSummary = Number(state?.roundSummary?.tbm);
  if (Number.isFinite(fromSummary)) return fromSummary;
  const fromState = Number(state?.tbm);
  return Number.isFinite(fromState) ? fromState : 0;
};

const readBonusAbilities = (state) => {
  const abilities = state?.heavenHell?.bonus?.abilities;
  if (!abilities || typeof abilities !== "object") {
    return { divineX: 0, divineStrike: 0, divineCharge: 0 };
  }
  return {
    divineX: Math.max(0, Math.floor(Number(abilities.divineX) || 0)),
    divineStrike: Math.max(0, Math.floor(Number(abilities.divineStrike) || 0)),
    divineCharge: Math.max(0, Math.floor(Number(abilities.divineCharge) || 0))
  };
};

const readAbilityContribution = (state) => {
  const fromSummary = state?.roundSummary?.abilityContributionTBM;
  const fromRtp = state?.rtpData?.abilityContributionTBM;
  const source = fromSummary && typeof fromSummary === "object" ? fromSummary : fromRtp;
  const out = emptyAbilityContribution();
  if (!source || typeof source !== "object") return out;
  ABILITY_KEYS.forEach((key) => {
    out[key] = Number(source[key] || 0);
  });
  return out;
};

const readAbilityProcCounts = (state) => {
  const fromSummary = state?.roundSummary?.abilityProcCounts;
  const fromRtp = state?.rtpData?.abilityProcCounts;
  const source = fromSummary && typeof fromSummary === "object" ? fromSummary : fromRtp;
  const out = emptyAbilityProcCounts();
  if (!source || typeof source !== "object") return out;
  ABILITY_PROC_KEYS.forEach((key) => {
    out[key] = Math.max(0, Math.floor(Number(source[key] || 0)));
  });
  return out;
};

const totalAbilityLevels = (abilities) =>
  abilities.divineX + abilities.divineStrike + abilities.divineCharge;

const abilityKey = (abilities) =>
  `X${abilities.divineX}_S${abilities.divineStrike}_C${abilities.divineCharge}`;

const readBonusKillCount = (state) => {
  const bonus = state?.heavenHell?.bonus;
  const killsTotal = Number(bonus?.killsTotal);
  if (Number.isFinite(killsTotal)) return Math.max(0, Math.floor(killsTotal));
  const summaryKills = Number(state?.roundSummary?.bonusDemonsKilled);
  if (Number.isFinite(summaryKills)) return Math.max(0, Math.floor(summaryKills));
  return Math.max(0, Math.floor(Number(state?.demonsKilled) || 0));
};

const BONUS_EXECUTED_ACTIONS = new Set([
  "bonustransition",
  "freespin",
  "freerespin",
  "freespinbananaHunt",
  "chestreward"
]);

const isBonusPhaseState = (state) => {
  if (!state || typeof state !== "object") return false;
  if (state.bgwe === true || state.isBonus === true) return true;
  return BONUS_EXECUTED_ACTIONS.has(String(state.executedAction || ""));
};

/** Last state from the bonus phase (freespin / hunt / collect), used for gameover stats. */
const findBonusSnapshotState = (states) => {
  if (!Array.isArray(states) || !states.length) return null;
  let lastBonusState = null;
  for (const state of states) {
    if (isBonusPhaseState(state)) {
      lastBonusState = state;
    }
  }
  return lastBonusState;
};

const bumpAgg = (map, key, tbm) => {
  const prev = map.get(key) || { count: 0, sumTbm: 0 };
  prev.count += 1;
  prev.sumTbm += tbm;
  map.set(key, prev);
};

const buildTbmBucketRows = (countMap) =>
  [...countMap.entries()]
    .sort((a, b) => {
      if (typeof a[0] === "number" && typeof b[0] === "number") return a[0] - b[0];
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map(([key, agg]) => ({
      key,
      rounds: agg.count,
      totalTbm: Number(agg.sumTbm.toFixed(4)),
      averageTbm: agg.count > 0 ? twoDecimals(agg.sumTbm / agg.count) : 0
    }));

const buildAbilityRtpRows = (contributionTBM, contributionPayout, totalStake) =>
  ABILITY_KEYS.map((ability) => ({
    ability,
    totalContributionTbm: fourDecimals(contributionTBM[ability]),
    totalContributionPayout: fourDecimals(contributionPayout[ability]),
    rtpPercent: totalStake > 0 ? fourDecimals((contributionPayout[ability] / totalStake) * 100) : 0
  }));

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
const tbmValues = [];
let totalStake = 0;
let totalPayout = 0;
let completedRounds = 0;
let failedRounds = 0;
let hitRounds = 0;
let noHitRounds = 0;
let maxWin = 0;
let maxTbm = 0;

let bonusRounds = 0;
let totalBonusPhaseWin = 0;
let totalRoundWinWhenBonus = 0;
let totalMainGameWin = 0;
const mainGameWinsPerRound = [];
const bonusWinsPerBonusRound = [];
const bonusEndTbmValues = [];
const bonusEndKillCounts = [];
const bonusEndAbilityTotals = [];
const tbmByTotalAbilityLevels = new Map();
const tbmByAbilityKey = new Map();
const tbmByDivineXLevel = new Map();
const tbmByDivineStrikeLevel = new Map();
const tbmByDivineChargeLevel = new Map();

const abilityContributionTBM = emptyAbilityContribution();
const abilityContributionPayout = emptyAbilityContribution();
const abilityProcTotals = emptyAbilityProcCounts();

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
  const roundTbm = readRoundTbm(lastState);
  const roundBetSize = Number(firstState?.roundMeta?.betSize ?? firstState?.betSize ?? betSize) || betSize;

  const safeStake = Number.isFinite(roundStake) ? roundStake : betSize;
  const safeWin = Number.isFinite(roundWin) ? roundWin : 0;

  totalStake += safeStake;
  totalPayout += safeWin;
  wins.push(safeWin);
  tbmValues.push(roundTbm);
  completedRounds += 1;
  maxWin = Math.max(maxWin, safeWin);
  maxTbm = Math.max(maxTbm, roundTbm);

  if (roundTbm > 0) hitRounds += 1;
  else noHitRounds += 1;

  const { mainGameWin, bonusWin } = splitRoundTwaByPhase(states);
  mainGameWinsPerRound.push(mainGameWin);
  totalMainGameWin += mainGameWin;

  const roundAbilityContribution = readAbilityContribution(lastState);
  const roundAbilityProcs = readAbilityProcCounts(lastState);
  ABILITY_KEYS.forEach((key) => {
    const tbmPart = Number(roundAbilityContribution[key] || 0);
    abilityContributionTBM[key] += tbmPart;
    abilityContributionPayout[key] += tbmPart * roundBetSize;
  });
  ABILITY_PROC_KEYS.forEach((key) => {
    abilityProcTotals[key] += Number(roundAbilityProcs[key] || 0);
  });

  const bonusSnapshot = findBonusSnapshotState(states);
  const hadBonus = server.hasBonus(states);

  if (hadBonus) {
    bonusRounds += 1;
    bonusWinsPerBonusRound.push(bonusWin);
    totalBonusPhaseWin += bonusWin;
    totalRoundWinWhenBonus += safeWin;

    const snapshotTbm = readRoundTbm(bonusSnapshot);
    bonusEndTbmValues.push(snapshotTbm);

    const abilities = readBonusAbilities(bonusSnapshot);
    const abilityTotal = totalAbilityLevels(abilities);
    bonusEndAbilityTotals.push(abilityTotal);
    bumpAgg(tbmByTotalAbilityLevels, abilityTotal, snapshotTbm);
    bumpAgg(tbmByAbilityKey, abilityKey(abilities), snapshotTbm);
    bumpAgg(tbmByDivineXLevel, abilities.divineX, snapshotTbm);
    bumpAgg(tbmByDivineStrikeLevel, abilities.divineStrike, snapshotTbm);
    bumpAgg(tbmByDivineChargeLevel, abilities.divineCharge, snapshotTbm);

    bonusEndKillCounts.push(readBonusKillCount(bonusSnapshot));
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
const averageTbm = meanOf(tbmValues);
const rtp = totalStake > 0 ? (totalPayout / totalStake) * 100 : 0;
const hitRate = completedRounds > 0 ? hitRounds / completedRounds : 0;
const mainGameRtpPercent = totalStake > 0 ? (totalMainGameWin / totalStake) * 100 : 0;
const bonusPhaseRtpPercent = totalStake > 0 ? (totalBonusPhaseWin / totalStake) * 100 : 0;

wins.sort((a, b) => a - b);
const medianWin = wins.length ? wins[Math.floor((wins.length - 1) / 2)] : 0;

const payoutVariance = populationVariance(wins, averageWin);
const payoutStdDev = Math.sqrt(payoutVariance);
const tbmVariance = populationVariance(tbmValues, averageTbm);
const tbmStdDev = Math.sqrt(tbmVariance);

const avgMainGameWin = meanOf(mainGameWinsPerRound);
const mainGameVariance = populationVariance(mainGameWinsPerRound, avgMainGameWin);
const mainGameStdDev = Math.sqrt(mainGameVariance);

const avgBonusPhaseWin = meanOf(bonusWinsPerBonusRound);
const bonusWinVariance = populationVariance(bonusWinsPerBonusRound, avgBonusPhaseWin);
const bonusWinStdDev = Math.sqrt(bonusWinVariance);

const avgBonusEndTbm = meanOf(bonusEndTbmValues);
const avgBonusEndKillCount = meanOf(bonusEndKillCounts);
const avgBonusEndAbilityTotal = meanOf(bonusEndAbilityTotals);

const bonusRatePercent =
  completedRounds > 0 ? twoDecimals((bonusRounds / completedRounds) * 100) : 0;

const abilityRtpRows = buildAbilityRtpRows(abilityContributionTBM, abilityContributionPayout, totalStake);
const trackedAbilityRtpPercent = abilityRtpRows.reduce((sum, row) => sum + row.rtpPercent, 0);
const unattributedRtpPercent = fourDecimals(Math.max(0, rtp - trackedAbilityRtpPercent - mainGameRtpPercent));

const report = {
  config: {
    roundsRequested: rounds,
    betSize,
    ticketStrategy: resolvedTicketStrategy,
    requestedTicketStrategy: ticketStrategy,
    availableTicketStrategies,
    playBackEnd: serverConfig.playBackEnd === true,
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
    rtpPercent: fourDecimals(rtp),
    mainGameRtpPercent: fourDecimals(mainGameRtpPercent),
    bonusPhaseRtpPercent: fourDecimals(bonusPhaseRtpPercent),
    averageWin: Number(averageWin.toFixed(4)),
    averageTbm: Number(averageTbm.toFixed(4)),
    medianWin: Number(medianWin.toFixed(4)),
    maxWin: Number(maxWin.toFixed(4)),
    maxTbm: Number(maxTbm.toFixed(4)),
    hitRate: fourDecimals(hitRate),
    hitRounds,
    noHitRounds,
    hitRatioDefinition: "rounds with tbm > 0 / completed rounds",
    payoutVariance: Number(payoutVariance.toFixed(6)),
    payoutStdDev: Number(payoutStdDev.toFixed(6)),
    tbmVariance: Number(tbmVariance.toFixed(6)),
    tbmStdDev: Number(tbmStdDev.toFixed(6))
  },
  abilities: {
    description:
      "Collect-phase loot attribution from heavenHell bonus settlement. Each loot drop is tagged by kill source (divineX / divineStrike / divineCharge / baseHunt) and its share of the final collect TBM is credited to that ability bucket.",
    procTotals: abilityProcTotals,
    contributionTbm: Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, fourDecimals(abilityContributionTBM[key])])
    ),
    contributionPayout: Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, fourDecimals(abilityContributionPayout[key])])
    ),
    rtpByAbility: abilityRtpRows,
    trackedAbilityRtpPercent: fourDecimals(trackedAbilityRtpPercent),
    unattributedRtpPercent
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
    bonusDetection:
      "server.hasBonus(states): any state with executedAction bonustransition/freespin/freerespin/freespinbananaHunt, isBonus, or bgwe",
    bonusFrequency:
      bonusRounds > 0
        ? `1/${Number((completedRounds / bonusRounds).toFixed(2))}`
        : "N/A",
    bonusRatePercent,
    averageBonusPhaseWin:
      bonusRounds > 0 ? Number((totalBonusPhaseWin / bonusRounds).toFixed(4)) : 0,
    averageRoundWinWhenBonus:
      bonusRounds > 0 ? Number((totalRoundWinWhenBonus / bonusRounds).toFixed(4)) : 0,
    bonusPhaseWinVariance: Number(bonusWinVariance.toFixed(6)),
    bonusPhaseWinStdDev: Number(bonusWinStdDev.toFixed(6)),
    atGameOver: {
      description:
        "End-of-round snapshot taken from the last bonus-phase state (freespin / bonustransition / hunt / chestreward). Kill count uses heavenHell.bonus.killsTotal.",
      averageTbm: bonusRounds > 0 ? twoDecimals(avgBonusEndTbm) : 0,
      averageKillCount: bonusRounds > 0 ? twoDecimals(avgBonusEndKillCount) : 0,
      averageTotalAbilityLevels: bonusRounds > 0 ? twoDecimals(avgBonusEndAbilityTotal) : 0,
      tbmByTotalAbilityLevels: buildTbmBucketRows(tbmByTotalAbilityLevels),
      tbmByAbilityKey: buildTbmBucketRows(tbmByAbilityKey),
      tbmByDivineXLevel: buildTbmBucketRows(tbmByDivineXLevel),
      tbmByDivineStrikeLevel: buildTbmBucketRows(tbmByDivineStrikeLevel),
      tbmByDivineChargeLevel: buildTbmBucketRows(tbmByDivineChargeLevel)
    },
    description:
      "bonusPhaseWin* = twa while isBonus; averageRoundWinWhenBonus = full round twa when bonus occurred."
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
console.log(`  Main game RTP:  ${report.metrics.mainGameRtpPercent}%`);
console.log(`  Bonus phase RTP:${report.metrics.bonusPhaseRtpPercent}%`);
console.log(`Hit rate (tbm):   ${report.metrics.hitRate} (${report.metrics.hitRounds} hit / ${report.metrics.noHitRounds} no-hit)`);
console.log(`Avg TBM:          ${report.metrics.averageTbm}`);
console.log(`Payout var/std:   ${report.metrics.payoutVariance} / ${report.metrics.payoutStdDev}`);
console.log(`TBM var/std:      ${report.metrics.tbmVariance} / ${report.metrics.tbmStdDev}`);
console.log(`Max win:          ${report.metrics.maxWin}`);
console.log(`Max TBM:          ${report.metrics.maxTbm}`);
console.log(`Bonus rounds:     ${report.bonus.bonusRounds}`);
console.log(`Bonus frequency:  ${report.bonus.bonusFrequency}`);
console.log(`Bonus rate:       ${report.bonus.bonusRatePercent}% of completed rounds`);
console.log("--- Ability RTP (collect-phase attribution) ---");
report.abilities.rtpByAbility.forEach((row) => {
  const procCount = report.abilities.procTotals[row.ability];
  const procLabel = procCount === undefined ? "—" : procCount;
  const isCoreAbility = row.ability === "divineX" || row.ability === "divineStrike" || row.ability === "divineCharge";
  if (row.totalContributionTbm > 0 || isCoreAbility) {
    console.log(
      `  ${row.ability.padEnd(13)} RTP ${String(row.rtpPercent).padStart(8)}%  (TBM ${row.totalContributionTbm}, procs ${procLabel})`
    );
  }
});
console.log(`  Tracked ability RTP sum: ${report.abilities.trackedAbilityRtpPercent}%`);
if (bonusRounds > 0) {
  console.log(`Bonus gameover avg TBM:       ${report.bonus.atGameOver.averageTbm}`);
  console.log(`Bonus gameover avg kills:     ${report.bonus.atGameOver.averageKillCount}`);
  console.log(`Bonus gameover avg abilities: ${report.bonus.atGameOver.averageTotalAbilityLevels}`);
}
console.log(`Main game var/std:   ${report.mainGameSpinRespin.variance} / ${report.mainGameSpinRespin.stdDev}`);
console.log(`Bonus phase var/std: ${report.bonus.bonusPhaseWinVariance} / ${report.bonus.bonusPhaseWinStdDev}`);
console.log(`Output:           ${resolvedOutputPath}`);
console.log("========================================\n");
