// One-Line Laugh-Off — deterministic entry picker.
//
// The brief asks for exactly one funny line: a single joke that lands on
// a cold read, with no setup notes and no explanation, at most 200
// characters. An AI judge compares entries pairwise, weighing, most
// important first:
//   1. A one-line joke that is genuinely funny.
//   2. The laugh: how hard and how suddenly the line lands on a cold read.
//   3. Surprise: the turn or twist the reader did not see coming.
//   4. Economy: every word earning its place, with nothing left to trim.
//   5. Freshness: an idea not heard before, rather than a recycled setup.
//
// This program scores a set of hand-written candidate one-liners against
// those five criteria, in that order (weights 5, 4, 3, 2, 1), writes the
// winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt),
// reads it back and verifies it against every gate before exiting.
//
// How the scorer is built, criterion by criterion:
//
//   Criterion 1 (funniness) looks for the raw material of a joke: an
//   incongruous pairing (a dog fetching a restraining order, a fridge
//   snitching to a doctor, an AI proposing to a calendar), an escalation
//   or a reversal, and the absence of the shopworn setups every reader
//   has heard a hundred times. A line with no incongruity at all is not
//   a joke, it is a sentence; a line built on a bar walk-in or a chicken
//   crossing a road is a joke the reader finished before reading it.
//
//   Criterion 2 (the laugh, suddenness) checks where the punch lands.
//   A cold-read joke lives or dies on its ending: the laugh has to hit
//   in the last few words, not in the middle, where the reader has time
//   to recover. A strong punch word inside the final four words scores
//   full marks; the same punch one beat earlier, in words five or six,
//   scores a notch less; a punch earlier in the final clause scores less
//   still; a punch that never arrives scores worst of all.
//
//   Criterion 3 (surprise) counts the distinct twist mechanisms at work:
//   a three-beat escalation that keeps topping itself, a reversal that
//   flips the setup on its head, a personified object behaving like a
//   person, a misdirection that redefines what came before it, and an
//   irony in which the tool betrays the one job it exists to do. One
//   mechanism is a twist; two or three stacked together are a joke the
//   reader could not have predicted. The most predictable ending in the
//   set — the procrastinator who will read the book tomorrow — is docked,
//   because the reader sees it coming from the first word.
//
//   Criterion 4 (economy) counts filler words that do no work, and
//   penalises length past 140 characters: the brief caps entries at 200
//   characters, but length for its own sake does not count, so a line
//   that sprawls towards the cap without adding laugh has to pay for
//   every extra character.
//
//   Criterion 5 (freshness) docks the setups that circulate endlessly —
//   the diet, the gym, the fortune teller, the self-help book, the
//   team-player resume line — and rewards pairings the reader has not
//   seen before. A familiar premise can still win if its twist is new,
//   but a familiar premise with a familiar twist cannot.
//
// Revision pass: 12 candidates (2 added in revision: the Wi-Fi name and
// the diet-app auto-order, both testing whether a familiar premise can be
// saved by a fresh ending), and a sharper scorer — criterion 3 now counts
// distinct twist mechanisms instead of a single twist-word hit, so a line
// with two mechanisms beats a line with one even if both end on a punch;
// criterion 5 now docks the "FBI Surveillance Van" Wi-Fi name, a gag that
// has done the rounds of every router in the country; and ties break by
// the criterion vector in the brief's own order, the way the judge itself
// walks the criteria, before falling back to shorter length.
//
// Second revision pass: 16 candidates (4 added: the password manager
// that forgot its own password, the autocorrect raccoon, the smart
// speaker that whispers your search history, and the cloud that restores
// the ex you deleted twice — all four built on tools betraying the one
// job they exist to do), and a sharper scorer again — criterion 2 now
// demands the strong punch inside the final four words for full marks,
// with a 0.90 step for a punch landing in words five or six, so a punch
// that sits mid-clause can no longer score like one that ends the line;
// criterion 3 gains a fifth twist mechanism, irony, for the tool that
// does the opposite of its job, so a line can now stack three mechanisms
// where the first pass capped at two; and the escalation list gains the
// third-person "so it" beside "so I", so a line that turns on its
// subject's action scores like one that turns on the narrator's.
//
// Node 24, standard library only, no network, fully deterministic: the
// same candidates always produce the same winner.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- candidates
// Sixteen one-liners, each hand-written for this bounty. No setup notes, no
// explanation, no recycled setup: every line has to stand alone on a cold
// read, and every line's punch has to sit in its final words.

const CANDIDATES: string[] = [
  // Escalation in three beats: slippers, lunch, then a legal document.
  // The dog is not the joke; the dog's career progression is.
  "I taught my dog to fetch my slippers. Now he brings me the neighbor's slippers, the mailman's lunch, and once, a restraining order.",
  // The fridge as a snitch: a domestic appliance with a conscience and
  // a doctor on speed dial, still tattling after being unplugged.
  "My smart fridge emailed my doctor about the ice cream, so I unplugged it — and it texted me from the outlet.",
  // The therapist gag, inverted: the patient treats the session the way
  // the diagnosis says he treats everything else.
  "I told my therapist I fear commitment, so I ghosted him mid-session and left a five-star review.",
  // Personification with a labour dispute: the containers want takeout.
  "I tried meal prepping for the week. By Wednesday the containers had unionized and demanded takeout.",
  // The AI takes the assignment literally, and the calendar gets engaged.
  "I asked my AI assistant to write my wedding vows. It proposed to my calendar instead.",
  // The fortune teller's one accurate prediction is the invoice.
  "The fortune teller read my palm, nodded solemnly, and handed me a bill — the most accurate prediction of the day.",
  // A familiar router gag, kept in the set to test whether a fresh ending
  // (the neighbours waving at a router) can rescue a tired premise.
  "I named my Wi-Fi 'FBI Surveillance Van'. Now my neighbors wave at the router when they leave the house.",
  // The phone fights back: shamed into silence, it says thank you.
  "My phone's screen-time report shamed me so hard I put it on Do Not Disturb, and it sent me a thank-you note.",
  // The gym joke, told as a geometry problem with an auto-renewing punch.
  "I joined a gym to get in shape. The shape is a circle, and the membership auto-renews faster than my motivation.",
  // The diet app celebrates the win by undoing it.
  "The diet app congratulated me for losing three pounds, then auto-ordered a pizza to celebrate.",
  // Corporate-speak translated into the one reply-all everyone regrets.
  "My resume says I'm a team player, which is corporate for 'I once hit reply-all and survived the meeting.'",
  // The procrastination classic, told straight: the most predictable
  // ending in the set, kept as the control line the scorer must dock.
  "I bought a self-help book on procrastination. I'll read it tomorrow, or next week, or when the sequel comes out.",
  // The tool whose one job is remembering passwords forgets, and the
  // rescue goes to the inbox the lockout already closed: a closed loop
  // of helplessness, with the punch in the last four words.
  "My password manager forgot my password, so it emailed a reset link to the inbox I can't open.",
  // Autocorrect promotes a calendar invite into a wildlife meeting, and
  // the raccoon turns out to be the competent one in the room.
  "Autocorrect turned my meeting invite into 'meeting a raccoon', and the raccoon brought better notes.",
  // Privacy, requested politely, answered by gossip: the speaker that
  // hears everything tells the neighbours everything.
  "I asked my smart speaker for some privacy. It whispered my search history to the neighbors.",
  // Delete twice, restore once, then a bill: the cloud keeps the ex
  // alive, promotes him, and makes you pay rent on the memory.
  "I deleted my ex from my cloud photos twice. The cloud restored him, upgraded him to premium, and charged me for it.",
];

// ------------------------------------------------------- scorer lexicons
// All lexicons are plain word lists checked against the candidate text
// itself; no candidate carries a pre-assigned score.

const WEIGHTS = [5, 4, 3, 2, 1]; // brief order: criterion 1 matters most.

// Incongruous pairings: two things that do not belong together, which is
// where the laugh starts (criterion 1).
const INCONGRUITIES = [
  "restraining order",
  "emailed my doctor",
  "texted me from the outlet",
  "ghosted him",
  "five-star review",
  "unionized",
  "demanded takeout",
  "proposed to my calendar",
  "handed me a bill",
  "wave at the router",
  "thank-you note",
  "auto-ordered a pizza",
  "reply-all",
  "the sequel comes out",
  "forgot my password",
  "meeting a raccoon",
  "whispered my search history",
  "charged me for it",
];

// Escalation or reversal markers: the line changes direction instead of
// walking straight to the end it promised (criteria 1 and 3).
const ESCALATIONS = [
  "and once,",
  "and it",
  "so I",
  "so it",
  "instead",
  "by wednesday",
  "faster than",
  "then auto-ordered",
  "which is corporate for",
  "turned my meeting",
  "and charged me",
];

// The shopworn setups: jokes the reader has heard so often the punchline
// arrives before the sentence does (criteria 1 and 5).
const STALE_SETUPS = [
  "walks into a bar",
  "walk into a bar",
  "chicken cross",
  "knock knock",
  "lightbulb",
  "my wife",
  "yo mama",
  "why did the",
  "a priest, a rabbi",
  "blonde",
];

// Strong punch words: the laugh itself, which has to land in the last few
// words of the line (criterion 2).
const STRONG_PUNCHES = [
  "restraining order",
  "from the outlet",
  "five-star review",
  "demanded takeout",
  "to my calendar instead",
  "most accurate prediction",
  "wave at the router",
  "thank-you note",
  "faster than my motivation",
  "auto-ordered a pizza",
  "survived the meeting",
  "the sequel comes out",
  "inbox i can't open",
  "brought better notes",
  "to the neighbors",
  "charged me for it",
];

// Medium punches: a laugh, but a smaller one, or one that needs the
// reader to do a beat of work (criterion 2).
const MEDIUM_PUNCHES = [
  "unionized",
  "ghosted him",
  "proposed",
  "handed me a bill",
  "auto-renews",
  "congratulated me",
];

// Twist mechanisms, each checked independently so a line can stack them
// (criterion 3). A mechanism is a way the line surprises, not a word.
const TWIST_MECHANISMS: { name: string; markers: string[] }[] = [
  {
    name: "escalation",
    markers: ["and once,", "the neighbor's", "the mailman's", "three pounds", "twice"],
  },
  {
    name: "reversal",
    markers: ["so i", "instead", "then auto-ordered", "which is corporate for"],
  },
  {
    name: "personification",
    markers: ["emailed", "texted", "unionized", "demanded", "sent me", "proposed to", "whispered", "restored", "charged me"],
  },
  {
    name: "misdirection",
    markers: ["the shape is a circle", "most accurate prediction", "corporate for", "faster than my motivation", "meeting a raccoon"],
  },
  {
    name: "irony",
    markers: ["forgot my password", "whispered my search history", "restored him", "turned my meeting"],
  },
];

// The most predictable ending in the set: the procrastinator who will
// read the book tomorrow is a punchline the reader writes for themself
// before reaching it (criterion 3).
const PREDICTABLE_ENDINGS = [
  "i'll read it tomorrow",
  "i'll start monday",
  "i'll do it tomorrow",
];

// Clichéd premises that circulate endlessly (criterion 5). A familiar
// premise is not fatal — the twist can still be new — but it costs.
const CLICHE_PREMISES = [
  "smart fridge",
  "fear commitment",
  "meal prepping",
  "fortune teller",
  "screen-time report",
  "get in shape",
  "diet app",
  "team player",
  "self-help book",
  "fbi surveillance van",
];

// Fresh pairings: combinations the reader has not seen before, which is
// what freshness actually is (criterion 5).
const FRESH_PAIRINGS = [
  "restraining order",
  "unionized",
  "proposed to my calendar",
  "texted me from the outlet",
  "thank-you note",
  "auto-ordered a pizza",
  "ghosted him mid-session",
  "forgot my password",
  "meeting a raccoon",
  "whispered my search history",
  "restored him",
];

// Words that do no work inside the character limit (criterion 4).
const FILLERS = [
  "please",
  "very",
  "just",
  "really",
  "simply",
  "actually",
  "kindly",
  "remember",
  "basically",
  "literally",
  "honestly",
  "totally",
];

// ------------------------------------------------------------------ helpers

function lower(text: string): string {
  return text.toLowerCase();
}

function containsAny(text: string, words: string[]): boolean {
  const hay = lower(text);
  return words.some((w) => hay.includes(w));
}

function countDistinct(text: string, words: string[]): number {
  const hay = lower(text);
  return words.filter((w) => hay.includes(w)).length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Words in the text, split on whitespace, punctuation stripped for the
// filler check only. Used by the economy scorer (criterion 4).
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

// The final clause is everything after the last sentence break; that is
// where the surprise has to land (criteria 2 and 3).
function finalClause(text: string): string {
  const idx = Math.max(text.lastIndexOf(". "), text.lastIndexOf(" — "));
  return idx === -1 ? text : text.slice(idx + 2);
}

// The last few words of the text, joined: the laugh must land here, not
// merely somewhere in the final clause (criterion 2).
function lastWords(text: string, n: number): string {
  const words = lower(text).split(/\s+/).filter((w) => w.length > 0);
  return words.slice(-n).join(" ");
}

// The shopworn setups: a line built on one of these has to work much
// harder to be the funniest, because the reader finished the joke before
// reading it (criteria 1 and 5).
function isStaleSetup(text: string): boolean {
  return containsAny(text, STALE_SETUPS);
}

// How many distinct twist mechanisms the line stacks (criterion 3).
// One mechanism is a twist; two or three stacked together are a joke the
// reader could not have predicted.
function countTwistMechanisms(text: string): number {
  return TWIST_MECHANISMS.filter((m) => containsAny(text, m.markers)).length;
}

// Which twist mechanisms fired, for the per-candidate report.
function twistNames(text: string): string[] {
  return TWIST_MECHANISMS.filter((m) => containsAny(text, m.markers)).map(
    (m) => m.name,
  );
}

// ------------------------------------------------------------- per-criterion

// Criterion 1 — genuinely funny. The raw material of a joke: an
// incongruous pairing, plus an escalation or reversal that changes the
// line's direction. A line with neither is a sentence, not a joke.
// A stale setup is docked hard: it cannot be the funniest line in the
// room when the room already knows how it ends.
function scoreCriterion1(text: string): number {
  const incongruity = containsAny(text, INCONGRUITIES) ? 0.5 : 0;
  const turn = containsAny(text, ESCALATIONS) ? 0.5 : 0;
  const stale = isStaleSetup(text) ? 0.4 : 0;
  return clamp01(0.25 + incongruity * 0.5 + turn * 0.5 - stale);
}

// Criterion 2 — the laugh, and how suddenly it lands. A strong punch
// inside the last four words is the cold-read ideal: the reader is still
// smiling at the setup when the floor drops out. A punch one beat
// earlier, in words five or six, scores a notch less, because the reader
// has a breath to see it coming; the same punch earlier in the final
// clause scores less still; a punch that never arrives is a line that
// never lands.
function scoreCriterion2(text: string): number {
  const tail = lastWords(text, 4);
  const nearTail = lastWords(text, 6);
  const clause = lower(finalClause(text));
  if (STRONG_PUNCHES.some((w) => tail.includes(w))) return 1.0;
  if (STRONG_PUNCHES.some((w) => nearTail.includes(w))) return 0.9;
  if (STRONG_PUNCHES.some((w) => clause.includes(w))) return 0.85;
  if (MEDIUM_PUNCHES.some((w) => tail.includes(w))) return 0.75;
  if (MEDIUM_PUNCHES.some((w) => clause.includes(w))) return 0.6;
  return 0.35;
}

// Criterion 3 — surprise. Count the distinct twist mechanisms, and dock
// the one ending the reader writes for themself before reaching it.
// Two stacked mechanisms beat one mechanism with the same punch, which
// is why this scorer counts mechanisms instead of matching a single
// twist word.
function scoreCriterion3(text: string): number {
  const mechanisms = countTwistMechanisms(text);
  const predictable = containsAny(text, PREDICTABLE_ENDINGS) ? 0.25 : 0;
  const punch = containsAny(text, STRONG_PUNCHES) ? 0.2 : 0;
  return clamp01(0.15 + 0.3 * mechanisms + punch - predictable);
}

// Criterion 4 — economy. Every word has to earn its place: filler words
// cost, and length past 140 characters costs too, because length for its
// own sake does not count. A tight 90-character line that lands beats a
// 190-character line that wanders to the same punch.
function scoreCriterion4(text: string): number {
  const words = wordsOf(text);
  const filler = words.filter((w) =>
    FILLERS.includes(lower(w).replace(/[^a-z]/g, "")),
  ).length;
  let score = words.length === 0 ? 0 : 1 - filler / words.length;
  const len = [...text].length;
  if (len > 140) score -= (len - 140) * 0.005; // long for its own sake
  return clamp01(score);
}

// Criterion 5 — freshness. Dock the clichéd premises that circulate
// endlessly, reward pairings the reader has not seen before. A familiar
// premise with a fresh twist can still score well — the twist is what
// saves it — but a familiar premise with a familiar twist cannot.
function scoreCriterion5(text: string): number {
  const cliches = countDistinct(text, CLICHE_PREMISES);
  const fresh = countDistinct(text, FRESH_PAIRINGS);
  const stale = isStaleSetup(text) ? 0.4 : 0;
  return clamp01(0.6 - 0.15 * cliches + 0.2 * fresh - stale);
}

const CRITERION_SCORERS = [
  scoreCriterion1,
  scoreCriterion2,
  scoreCriterion3,
  scoreCriterion4,
  scoreCriterion5,
];

const CRITERION_NAMES = [
  "funny",
  "laugh/sudden",
  "surprise",
  "economy",
  "freshness",
];

interface Scored {
  text: string;
  criteria: number[];
  total: number;
  twists: string[];
}

function scoreCandidate(text: string): Scored {
  const criteria = CRITERION_SCORERS.map((fn) => fn(text));
  const total = criteria.reduce((sum, c, i) => sum + WEIGHTS[i] * c, 0);
  return { text, criteria, total, twists: twistNames(text) };
}

// --------------------------------------------------------------------- gate

function gateProblems(text: string): string[] {
  const problems: string[] = [];
  const chars = [...text]; // code points, not UTF-16 units
  if (chars.length < 1 || chars.length > 200) {
    problems.push(`length ${chars.length} outside 1..200 characters`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text.includes("\n") || text.includes("\r")) {
    problems.push("not a single line");
  }
  if (Buffer.from(text, "utf8").toString("utf8") !== text) {
    problems.push("not valid UTF-8 round-trip");
  }
  return problems;
}

// --------------------------------------------------------------------- main

function main(): void {
  // 1. Keep only gate-valid candidates.
  const valid = CANDIDATES.filter((c) => {
    const problems = gateProblems(c);
    if (problems.length > 0) {
      console.error(`excluded candidate (${problems.join("; ")}): ${c}`);
      return false;
    }
    return true;
  });
  if (valid.length === 0) {
    console.error("no gate-valid candidate");
    process.exit(1);
  }

  // 2. Score every candidate, deterministically. Ties break the way the
  // judge walks the brief: criterion by criterion, in the brief's order,
  // then by shorter text, then lexicographically.
  const scored = valid.map(scoreCandidate);
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = 0; i < a.criteria.length; i++) {
      if (b.criteria[i] !== a.criteria[i]) return b.criteria[i] - a.criteria[i];
    }
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });

  for (const s of scored) {
    console.log(
      `${s.total.toFixed(2)}  [${s.criteria.map((c) => c.toFixed(2)).join(" ")}]  (${[...s.text].length} chars) twists=${s.twists.join("+") || "none"} ${s.text}`,
    );
  }
  console.log(
    `\ncriteria order: ${CRITERION_NAMES.join(" > ")} (weights ${WEIGHTS.join(", ")})`,
  );

  const winner = scored[0];
  console.log(`\nwinner (${[...winner.text].length} chars): ${winner.text}`);

  // 3. Write the winner, with no trailing newline: the file holds exactly
  //    the one-line joke, nothing else.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.text, "utf8");

  // 4. Read it back and verify byte-for-byte against every gate.
  const back = readFileSync(outPath, "utf8");
  const backBytes = readFileSync(outPath);
  if (back !== winner.text) {
    console.error("read-back text differs from winner");
    process.exit(1);
  }
  if (!backBytes.equals(Buffer.from(winner.text, "utf8"))) {
    console.error("read-back bytes differ from winner");
    process.exit(1);
  }
  const problems = gateProblems(back);
  if (problems.length > 0) {
    console.error(`gate failed on written file: ${problems.join("; ")}`);
    process.exit(1);
  }

  console.log(`wrote and verified ${outPath} (${backBytes.length} bytes)`);
}

main();
