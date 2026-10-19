export type PointType = "logic" | "condition" | "trap" | "impl";
export type Role = "standard" | "variant" | "disguised" | "mixed";
export type Visibility = "private" | "shared" | "assigned";
export type Lang = "zh" | "en";

export type KeyPoint = { id: string; type: PointType; name: string; detail: string };
export type Blanks = { code: string; answers: { id: number; answer: string; placeholder: string }[] };
export type ProblemIdea = { slug: string; role: Role; why: string };

export type Problem = {
  id: string;
  url: string;
  title: string | null;
  statement: string | null;
  samples: [string, string][];
  time_limit: number | null;
  memory_limit: number | null;
  solution: string | null;
  code: string | null;
  blanks: Blanks | null;
  key_points: KeyPoint[] | null;
  ideas: ProblemIdea[];
  brief: string | null;
  stage: "new" | "fetched" | "solved" | "ready";
};

export type Attempt = {
  id: string;
  user_id: string;
  problem_id: string;
  list_id: string | null;
  status: "active" | "done";
  messages: unknown[];
  found: Record<string, string>;
  hinted: string[];
  hints_left: number;
  verdicts: { verdict: string; at: string }[];
  rating: string | null;
  updated_at: string;
};

export type Profile = { id: string; name: string; contest_name: string | null; contest_date: string | null };

export type IdeaDetails = {
  slug: string;
  intro: { when: string[]; core: string; example: string };
  template: string;
  traps: { type: PointType; text: string }[];
};

export const POINT_TYPES: PointType[] = ["logic", "condition", "trap", "impl"];
export const ROLES: Role[] = ["standard", "variant", "disguised", "mixed"];
export const HINTS_PER_PROBLEM = 2;
export const VERDICTS = ["AC", "WA", "TLE", "MLE", "RE", "CE"] as const;
