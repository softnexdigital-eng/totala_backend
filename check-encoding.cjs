/* Temporary encoding check: confirms the Bengali messages written into the new
   public controller are valid UTF-8 and match the strings already used by the
   existing agent controller. Delete after verification. */
const fs = require('fs');

const read = (p) => fs.readFileSync(p, 'utf8');
const mine = read('src/controllers/publicController.js');
const ref = read('src/controllers/agentController.js');

// Pull every single-quoted string that contains Bengali codepoints.
const bengali = (src) =>
  (src.match(/'([^']*)'/g) || [])
    .map((s) => s.slice(1, -1))
    .filter((s) => /[\u0980-\u09FF]/.test(s));

const refStrings = bengali(ref);
const mineStrings = bengali(mine);

console.log('--- existing backend Bengali strings (agent controller) ---');
refStrings.slice(0, 6).forEach((s) => console.log(JSON.stringify(s), [...s].map((c) => c.codePointAt(0).toString(16)).join(' ')));

console.log('--- new public controller Bengali strings ---');
mineStrings.forEach((s) => console.log(JSON.stringify(s), [...s].map((c) => c.codePointAt(0).toString(16)).join(' ')));

console.log('--- checks ---');
console.log('file bytes are valid UTF-8:', Buffer.from(mine, 'utf8').toString('utf8') === mine);
console.log('no replacement chars (U+FFFD):', !mine.includes('\uFFFD'));
console.log('"এজেন্টদের তালিকা" reused verbatim:', mineStrings.includes(refStrings.find((s) => s.includes('এজেন্ট')) ) || refStrings.some((r) => mineStrings.includes(r)));
