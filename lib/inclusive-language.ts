// Rule-based inclusive-language checker for job descriptions. Deterministic
// (no AI) — better for compliance/DEI review than a model. Flags gendered,
// ageist, ableist, exclusionary-jargon and masculine-coded wording common in
// Canadian recruiting, with a suggested alternative for each.

export type InclusiveCategory =
  | "gendered"
  | "ageist"
  | "ableist"
  | "jargon"
  | "masculine-coded"
  | "exclusionary";

export interface InclusiveFlag {
  term: string;
  category: InclusiveCategory;
  suggestion: string;
}

interface Rule {
  // Matched case-insensitively on word boundaries.
  pattern: RegExp;
  category: InclusiveCategory;
  suggestion: string;
  label: string;
}

const RULES: Rule[] = [
  // Gendered
  { label: "he/she", pattern: /\b(he\/she|s\/he|his\/her|him\/her)\b/gi, category: "gendered", suggestion: "use “they/their”" },
  { label: "chairman", pattern: /\bchairman\b/gi, category: "gendered", suggestion: "“chair” or “chairperson”" },
  { label: "salesman", pattern: /\bsales ?man\b/gi, category: "gendered", suggestion: "“salesperson”" },
  { label: "foreman", pattern: /\bforeman\b/gi, category: "gendered", suggestion: "“supervisor”" },
  { label: "manpower", pattern: /\bmanpower\b/gi, category: "gendered", suggestion: "“workforce” or “staffing”" },
  { label: "man-hours", pattern: /\bman[-\s]?hours\b/gi, category: "gendered", suggestion: "“person-hours”" },
  { label: "guys", pattern: /\bguys\b/gi, category: "gendered", suggestion: "“team” or “folks”" },
  // Ageist
  { label: "young", pattern: /\byoung\b/gi, category: "ageist", suggestion: "focus on skills, not age" },
  { label: "energetic", pattern: /\benergetic\b/gi, category: "ageist", suggestion: "“motivated” or “driven”" },
  { label: "recent graduate", pattern: /\brecent grad(uate)?\b/gi, category: "ageist", suggestion: "“early-career” (or drop it)" },
  { label: "digital native", pattern: /\bdigital native\b/gi, category: "ageist", suggestion: "“comfortable with digital tools”" },
  { label: "mature", pattern: /\bmature\b/gi, category: "ageist", suggestion: "“experienced” or “professional”" },
  // Ableist
  { label: "crazy", pattern: /\bcrazy\b/gi, category: "ableist", suggestion: "“exciting” or “fast-paced”" },
  { label: "insane", pattern: /\binsane\b/gi, category: "ableist", suggestion: "“remarkable” or “intense”" },
  { label: "sanity check", pattern: /\bsanity check\b/gi, category: "ableist", suggestion: "“quick check” or “review”" },
  { label: "able-bodied", pattern: /\bable[-\s]?bodied\b/gi, category: "ableist", suggestion: "describe the actual physical task" },
  { label: "walk-in", pattern: /\bstand( up)? all day\b/gi, category: "ableist", suggestion: "state the real requirement" },
  // Exclusionary jargon
  { label: "rockstar", pattern: /\brock ?star\b/gi, category: "jargon", suggestion: "“skilled” or “high-performing”" },
  { label: "ninja", pattern: /\bninja\b/gi, category: "jargon", suggestion: "“expert” or “specialist”" },
  { label: "guru", pattern: /\bguru\b/gi, category: "jargon", suggestion: "“expert”" },
  { label: "wizard", pattern: /\bwizard\b/gi, category: "jargon", suggestion: "“expert”" },
  { label: "superstar", pattern: /\bsuperstar\b/gi, category: "jargon", suggestion: "“strong performer”" },
  // Masculine-coded (research-backed terms that deter women applicants)
  { label: "aggressive", pattern: /\baggressive\b/gi, category: "masculine-coded", suggestion: "“proactive” or “results-focused”" },
  { label: "dominant", pattern: /\bdominant\b/gi, category: "masculine-coded", suggestion: "“leading” or “strong”" },
  { label: "competitive", pattern: /\bcompetitive\b/gi, category: "masculine-coded", suggestion: "“motivated” (unless about pay)" },
  { label: "fearless", pattern: /\bfearless\b/gi, category: "masculine-coded", suggestion: "“confident”" },
  { label: "whatever it takes", pattern: /\bwhatever it takes\b/gi, category: "masculine-coded", suggestion: "“committed to results”" },
  // Exclusionary requirements
  { label: "native English speaker", pattern: /\bnative (english )?speaker\b/gi, category: "exclusionary", suggestion: "“fluent in English”" },
  { label: "cultural fit", pattern: /\bculture fit\b/gi, category: "exclusionary", suggestion: "“values alignment” / “culture add”" },
];

export function checkInclusiveLanguage(text: string): InclusiveFlag[] {
  if (!text) return [];
  const found = new Map<string, InclusiveFlag>();
  for (const rule of RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const m of matches) {
        const key = m.toLowerCase();
        if (!found.has(key)) {
          found.set(key, { term: m, category: rule.category, suggestion: rule.suggestion });
        }
      }
    }
  }
  return [...found.values()];
}

export const CATEGORY_LABELS: Record<InclusiveCategory, string> = {
  gendered: "Gendered",
  ageist: "Age bias",
  ableist: "Ableist",
  jargon: "Exclusionary jargon",
  "masculine-coded": "Masculine-coded",
  exclusionary: "Exclusionary requirement",
};
