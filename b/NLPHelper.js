/**
 * nlpHelper.js  —  Simple NLP skill matcher for Hirely
 * Uses: stemming (natural), synonyms map, fuzzy Levenshtein similarity
 * npm install natural
 */
import natural from 'natural';

const stemmer = natural.PorterStemmer;

// ─── Tech skill synonyms ─────────────────────────────────────────────────────
// Key = canonical form (lowercase), values = aliases
const SYNONYMS = {
  'javascript':       ['js', 'es6', 'es2015', 'es2016', 'vanilla js', 'ecmascript'],
  'typescript':       ['ts'],
  'node.js':          ['node', 'nodejs', 'node js'],
  'react':            ['reactjs', 'react.js', 'react js'],
  'vue':              ['vuejs', 'vue.js', 'vue js'],
  'angular':          ['angularjs', 'angular.js'],
  'python':           ['py'],
  'machine learning': ['ml', 'deep learning', 'ai', 'artificial intelligence'],
  'sql':              ['mysql', 'mssql', 'sql server', 'postgresql', 'postgres', 'sqlite'],
  'nosql':            ['mongodb', 'mongo', 'firebase', 'dynamodb', 'cassandra'],
  'css':              ['css3', 'stylesheet', 'tailwind', 'bootstrap', 'sass', 'scss'],
  'html':             ['html5'],
  'c++':              ['cpp', 'c plus plus'],
  'c#':               ['csharp', 'dotnet', '.net'],
  'java':             ['spring', 'spring boot'],
  'devops':           ['ci/cd', 'docker', 'kubernetes', 'k8s', 'jenkins', 'github actions'],
  'aws':              ['amazon web services', 'ec2', 's3', 'lambda'],
  'azure':            ['microsoft azure', 'ms azure'],
  'git':              ['github', 'gitlab', 'version control', 'bitbucket'],
  'rest':             ['rest api', 'restful', 'api', 'web services'],
  'graphql':          ['gql'],
  'ui/ux':            ['ui', 'ux', 'user interface', 'user experience', 'figma', 'adobe xd'],
  'agile':            ['scrum', 'kanban', 'jira'],
};

// Build reverse lookup: alias → canonical
const ALIAS_MAP = {};
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
  ALIAS_MAP[canonical] = canonical;
  for (const alias of aliases) ALIAS_MAP[alias] = canonical;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a skill string: lowercase + trim */
const norm = s => s.toLowerCase().trim();

/** Resolve to canonical form via synonym map */
const canonical = s => ALIAS_MAP[norm(s)] ?? norm(s);

/** Porter stem */
const stem = s => stemmer.stem(norm(s));

/** Levenshtein distance (iterative) */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/** Normalised similarity 0–1 (1 = identical) */
function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Core match logic ────────────────────────────────────────────────────────

/**
 * Does a candidate skill satisfy a required skill?
 * Returns a score: 1.0 = exact/synonym, 0.85 = stem, 0.7 = fuzzy, 0 = no match
 */
export function skillScore(candRaw, reqRaw) {
  const cNorm = norm(candRaw);
  const rNorm = norm(reqRaw);

  // 1. Exact match
  if (cNorm === rNorm) return 1.0;

  // 2. Canonical synonym match
  const cCanon = canonical(cNorm);
  const rCanon = canonical(rNorm);
  if (cCanon === rCanon) return 1.0;

  // 3. One contains the other (e.g. "React" in "React Native")
  if (cNorm.includes(rNorm) || rNorm.includes(cNorm)) return 0.9;
  if (cCanon.includes(rCanon) || rCanon.includes(cCanon)) return 0.9;

  // 4. Stem match (e.g. "programming" ↔ "programmer")
  if (stem(cNorm) === stem(rNorm)) return 0.85;

  // 5. Fuzzy similarity (threshold 0.75)
  const sim = Math.max(
    similarity(cNorm, rNorm),
    similarity(cCanon, rCanon)
  );
  if (sim >= 0.75) return sim * 0.8; // scale down fuzzy hits

  return 0;
}

/**
 * Given arrays of candidate skills and required skills (raw strings),
 * returns { matchPercent, matchedSkills, missingSkills, partialSkills }
 *
 * MATCH_THRESHOLD: score >= 0.7  → counts as matched
 */
export function computeMatch(candSkills, reqSkills) {
  const THRESHOLD = 0.7;

  if (!reqSkills.length) {
    return { matchPercent: 100, matchedSkills: [], missingSkills: [], partialSkills: [] };
  }

  const matchedSkills  = [];
  const missingSkills  = [];
  const partialSkills  = []; // 0.4–0.7 range — "close but not quite"

  for (const req of reqSkills) {
    // Best score across all candidate skills
    let bestScore = 0;
    for (const cand of candSkills) {
      const s = skillScore(cand, req);
      if (s > bestScore) bestScore = s;
    }

    if (bestScore >= THRESHOLD)     matchedSkills.push(req);
    else if (bestScore >= 0.4)      partialSkills.push(req);
    else                            missingSkills.push(req);
  }

  // Partial matches count as 0.5
  const score =
    matchedSkills.length * 1.0 +
    partialSkills.length * 0.5;

  const matchPercent = Math.round((score / reqSkills.length) * 100);

  return { matchPercent, matchedSkills, missingSkills, partialSkills };
}