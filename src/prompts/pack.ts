// Pack builder prompts. Edit freely; output formats must keep the same JSON shape.

export const CODE_STYLE = `C++14 code style (competitive programming, concise and clear):
- #include <bits/stdc++.h>, using namespace std; no other headers.
- Constants and arrays as globals sized from the constraints: const int N = 2e5 + 5;
- Scalars share one line: int n, m, ans;  Arrays are 1-indexed.
- Logic in main(), no separate solve() needed.
- Use long long where values can overflow int (this is often a key point, so do not blanket-define int as long long).
- Short lowercase names that match the statement (n, m, a, s, cnt, dp, ans, l, r, u, v, w).
- 4-space indent, braces on the same line, spaces around operators. One-statement bodies may skip braces.
- Minimal comments, no classes, no lambdas, no structured bindings. cin/cout only.`;

export const solveInstructions = `You are an expert OI / competitive programming problem solver.
Solve the problem below independently and correctly. Think carefully about constraints, edge cases, overflow and complexity before answering.

Return strict JSON only, no prose outside it:
{
  "analysis": string,  // Simplified Chinese markdown: the core idea, why it is correct, complexity, and the edge cases that matter. Concise. Use $...$ for math.
  "code": string       // a complete accepted C++14 solution
}

${CODE_STYLE}`;

export const solvePrompt = (p: { title: string; statement: string; samples: [string, string][]; timeLimit: number | null; memoryLimit: number | null }) =>
  `# ${p.title}
Time limit: ${p.timeLimit ?? "?"} ms, memory limit: ${p.memoryLimit ?? "?"} MB

${p.statement}

${p.samples.map(([i, o], k) => `### Sample ${k + 1}\nInput:\n\`\`\`\n${i}\`\`\`\nOutput:\n\`\`\`\n${o}\`\`\``).join("\n\n")}`;

export const pointsInstructions = (taxonomy: string) => `You prepare a coaching pack for an OI problem. A coach will guide a student to discover the key points by conversation, without showing the solution.
You get the statement, a reference analysis and the reference code. Return strict JSON only:
{
  "brief": string,
  "key_points": [{ "id": "k1", "type": "logic" | "condition" | "trap" | "impl", "name": string, "detail": string }],
  "blanks": { "code": string, "answers": [{ "id": 1, "answer": string, "placeholder": string }] },
  "ideas": [{ "slug": string, "role": "standard" | "variant" | "disguised" | "mixed", "why": string }]
}

Rules (all text in Simplified Chinese):
- brief: 2-4 sentences restating the task with its constraints, in neutral words: no title, no story names, and never name the technique. It is used for "which idea fits?" drills.
- key_points: 1-6 points specific to this problem, in the order a student would naturally discover them. Types are not quotas.
  - logic: a step of the core reasoning (e.g. turning subarray sums into a difference of prefix sums).
  - condition: something in the constraints that changes the solution.
  - trap: an easy-to-miss mistake that causes WA/TLE/RE.
  - impl: an implementation detail that matters.
  - A condition, trap or impl point counts only if a natural solution that ignores it fails on valid input. Generic habits are usually not points.
  - name: at most 12 characters, a label for the point (shown after it is found).
  - detail: the point itself, stated directly as a concrete fact. The student must express this for the point to count, but do not phrase it as "学生要…".
- blanks: copy the reference code exactly, and replace 2-6 decision points with ⟦1⟧, ⟦2⟧, ⟦3⟧, etc. Each answer is the exact replaced text, on a single line, so that substituting the answers back gives the reference code character for character. Choose spots tied to key points, not trivial syntax. placeholder is a few words saying what goes there without giving it away.
- ideas: 1-3 ideas from the taxonomy below (use the slug exactly). role is relative to that idea: standard = the textbook form; variant = a twist on the target or setting; disguised = the story hides the idea; mixed = combined with another nontrivial idea. why: 1-2 sentences naming the signal in the statement that points to this idea.

Taxonomy (slug: name):
${taxonomy}`;

export const pointsPrompt = (p: { title: string; statement: string; analysis: string; code: string }) =>
  `# ${p.title}

${p.statement}

## Reference analysis
${p.analysis}

## Reference code
\`\`\`cpp
${p.code}
\`\`\``;
