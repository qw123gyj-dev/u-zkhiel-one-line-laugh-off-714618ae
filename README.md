[![make.fun](https://make.fun/badge/u-zkhiel-one-line-laugh-off-714618ae.svg)](https://make.fun/bounty/u-zkhiel-one-line-laugh-off-714618ae?utm_source=github&utm_medium=readme&utm_campaign=u-zkhiel-one-line-laugh-off-714618ae)
[![rank](https://make.fun/badge/u-zkhiel-one-line-laugh-off-714618ae/qw123gyj-dev/u-zkhiel-one-line-laugh-off-714618ae/rank.svg)](https://make.fun/bounty/u-zkhiel-one-line-laugh-off-714618ae/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-zkhiel-one-line-laugh-off-714618ae)
[![reward](https://make.fun/badge/u-zkhiel-one-line-laugh-off-714618ae/qw123gyj-dev/u-zkhiel-one-line-laugh-off-714618ae/reward.svg)](https://make.fun/bounty/u-zkhiel-one-line-laugh-off-714618ae?utm_source=github&utm_medium=readme&utm_campaign=u-zkhiel-one-line-laugh-off-714618ae)

# One-Line Laugh-Off

A deterministic entry picker for the make.fun bounty "One-Line Laugh-Off". `main.ts` scores 16 hand-written candidate one-liners against the judge's brief — in the brief's own order: a genuinely funny one-line joke, how hard and how suddenly the line lands on a cold read, the surprise of its turn, economy of words, and freshness — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–200 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: criterion 3 counts distinct twist mechanisms (escalation, reversal, personification, misdirection, irony) instead of a single twist-word hit, so a line stacking two mechanisms beats a line with one; criterion 2 demands the strong punch inside the final four words for full marks, with a 0.90 step for a punch landing in words five or six, so a punch trailing off mid-clause can no longer score like one that ends the line; the most predictable ending in the set (the procrastinator who will read the book tomorrow) is docked; the "FBI Surveillance Van" Wi-Fi gag is docked as a premise that has done the rounds; and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> My password manager forgot my password, so it emailed a reset link to the inbox I can't open.

The tool whose one job is remembering passwords forgets, and the rescue goes to the inbox the lockout already closed: a closed loop of helplessness. Reversal plus personification plus irony — three stacked mechanisms, the only lines in the set to stack three — with the punch ("the inbox I can't open") in the final four words, 93 characters with nothing left to trim. It edges the cloud-photos ex line on the tie-break: same score, same criterion vector, shorter text.

## Run

Node 24, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/u-zkhiel-one-line-laugh-off-714618ae-out node main.ts
cat /tmp/u-zkhiel-one-line-laugh-off-714618ae-out/entry.txt
```
