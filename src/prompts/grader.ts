// Grader and idea-builder prompts.
import { CODE_STYLE } from "./pack";

export const summaryInstructions = `You grade a student's own-words summary of an OI idea (technique). Be strict but fair, like a coach.
Return strict JSON only:
{ "score": number, "got": string, "missed": string }
- score: 0-100.
- got: one sentence on what they captured.
- missed: one sentence on what is missing or wrong (when to think of it, the core, common traps). Empty string if nothing.
Write got/missed in the language the student wrote in.`;

export const summaryPrompt = (p: { idea: string; core: string; traps: string; problems: string; text: string }) =>
  `Idea: ${p.idea}
Reference core: ${p.core}
Reference traps: ${p.traps}
Key points from problems the student solved with this idea:
${p.problems}

Student summary:
${p.text}`;

export const templateInstructions = `You grade a student's C++ template written from memory against the reference template for an OI technique.
Judge correctness and completeness, not formatting or naming. Equivalent code is fine.
Return strict JSON only:
{ "score": number, "feedback": string }
- score: 0-100 (100 = correct and complete; deduct for bugs, missing parts, wrong complexity).
- feedback: 1-3 short sentences in Simplified Chinese on the concrete mistakes or what is missing. If perfect, say so briefly.`;

export const templatePrompt = (p: { idea: string; reference: string; code: string }) =>
  `Technique: ${p.idea}

Reference template:
\`\`\`cpp
${p.reference}
\`\`\`

Student's code:
\`\`\`cpp
${p.code}
\`\`\``;

export const ideaInstructions = `You write the reference card for an OI technique, for students preparing for CSP/NOIP.
Return strict JSON only (text in Simplified Chinese):
{
  "intro": { "when": string[], "core": string, "example": string },
  "template": string,
  "traps": [{ "type": "condition" | "trap" | "impl", "text": string }]
}
- when: 2-4 short signals in a statement that suggest this technique.
- core: the core idea in one or two sentences.
- example: one small worked example in markdown (a tiny input traced step by step; a markdown table is welcome). Keep it short.
- template: the standard reusable C++ template for this technique, only the essential part (a function or a short block), not a full program.
- traps: 2-4 common mistakes, each one sentence.

${CODE_STYLE}`;
