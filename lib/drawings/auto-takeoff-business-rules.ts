/**
 * EXPERIMENTAL — Fase 15D
 * Reglas de negocio para convertir sugerencias BOM en propuesta de palillería.
 */

import { normalizeTakeoffDescription } from "@/lib/drawings/experimental-auto-takeoff-compare";
import type { ExperimentalTakeoffCandidateRow } from "@/lib/drawings/experimental-auto-takeoff-parse";
import {
  classifyExtractedRows,
  matchBusinessExpectedRows,
  type BusinessExpectedRow,
} from "@/lib/drawings/auto-takeoff-business-validate";

export const BUSINESS_RULE_CATEGORIES = [
  "pipe",
  "flange",
  "valve",
  "fitting",
  "bolt",
  "gasket",
  "blind",
  "support",
  "exclusion",
  "unknown",
] as const;

export type BusinessRuleCategory = (typeof BUSINESS_RULE_CATEGORIES)[number];

export type BusinessAction = "include" | "exclude" | "review";

export type BusinessConfidence = "high" | "medium" | "low";

export type BusinessRuleSuggestionInput = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
};

export type AppliedBusinessRule = {
  businessCategory: BusinessRuleCategory;
  businessAction: BusinessAction;
  businessReason: string;
  businessConfidence: BusinessConfidence;
};

export type BusinessRuleApplication = {
  suggestion: ExperimentalTakeoffCandidateRow;
  suggestionIndex: number;
  businessCategory: BusinessRuleCategory;
  businessAction: BusinessAction;
  businessReason: string;
  businessConfidence: BusinessConfidence;
};

export type BusinessRulesCaseMetrics = {
  caseId: string;
  totalSuggestions: number;
  includeCount: number;
  reviewCount: number;
  excludeCount: number;
  utilityBefore: number | null;
  utilityAfter: number | null;
  actionLabeledCount: number;
  actionCorrectCount: number;
  falseIncludeCount: number;
  falseExcludeCount: number;
  categoryCounts: Record<BusinessRuleCategory, number>;
  applications: BusinessRuleApplication[];
};

export type BusinessRulesAggregateMetrics = {
  pdfsEvaluated: number;
  totalSuggestions: number;
  includeCount: number;
  reviewCount: number;
  excludeCount: number;
  utilityBefore: number | null;
  utilityAfter: number | null;
  actionLabeledCount: number;
  actionCorrectCount: number;
  falseIncludeCount: number;
  falseExcludeCount: number;
  categoryCounts: Record<BusinessRuleCategory, number>;
};

function normalizeForRules(description: string | null | undefined): string {
  return normalizeTakeoffDescription(description).toUpperCase();
}

function hasReference(suggestion: ExperimentalTakeoffCandidateRow): boolean {
  const reference = suggestion.reference?.trim();

  return reference != null && reference.length > 0 && reference !== "-";
}

type RuleMatch = {
  businessCategory: BusinessRuleCategory;
  businessAction: BusinessAction;
  businessReason: string;
  businessConfidence: BusinessConfidence;
};

function matchExclusionRule(description: string): RuleMatch | null {
  if (
    description.includes("FIGURA 8") ||
    description.includes("FIG. 8") ||
    description.includes("FIG 8") ||
    description.includes("ESPACIADOR") ||
    description.includes("PADDLE SPACER")
  ) {
    return {
      businessCategory: "exclusion",
      businessAction: "exclude",
      businessReason:
        "Elemento BOM no requerido como palillería final según business set",
      businessConfidence: "high",
    };
  }

  return null;
}

function matchSupportRule(description: string): RuleMatch | null {
  if (
    description.includes("SOPORTE") ||
    description.includes("STD-PS") ||
    description.includes("SUP-")
  ) {
    return {
      businessCategory: "support",
      businessAction: "review",
      businessReason:
        "Soporte detectado; requiere revisión manual antes de palillería final",
      businessConfidence: "medium",
    };
  }

  return null;
}

function matchBlindRule(
  description: string,
  suggestion: ExperimentalTakeoffCandidateRow,
): RuleMatch | null {
  if (
    description.includes("DISCO CIEGO") ||
    description.includes("BRIDA CIEGA")
  ) {
    if (!hasReference(suggestion)) {
      return {
        businessCategory: "blind",
        businessAction: "review",
        businessReason:
          "Disco o brida ciega sin referencia SAP; revisar antes de incluir",
        businessConfidence: "medium",
      };
    }

    return {
      businessCategory: "blind",
      businessAction: "include",
      businessReason: "Elemento ciego con referencia o descripción clara en BOM",
      businessConfidence: "high",
    };
  }

  return null;
}

export function applyBusinessRulesToSuggestionInput(
  suggestion: BusinessRuleSuggestionInput,
): AppliedBusinessRule {
  return applyBusinessRulesToSuggestion({
    ...suggestion,
    warnings: [],
    rawLine: "",
    lineNumber: 0,
  });
}

export function applyBusinessRulesToSuggestion(
  suggestion: ExperimentalTakeoffCandidateRow,
): AppliedBusinessRule {
  const description = normalizeForRules(suggestion.description);

  const exclusion = matchExclusionRule(description);

  if (exclusion) {
    return exclusion;
  }

  const support = matchSupportRule(description);

  if (support) {
    return support;
  }

  const blind = matchBlindRule(description, suggestion);

  if (blind) {
    return blind;
  }

  if (description.includes("TUBERIA") || description.includes("PIPE")) {
    return {
      businessCategory: "pipe",
      businessAction: "include",
      businessReason: "Tubería principal; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  if (description.includes("VALVULA")) {
    return {
      businessCategory: "valve",
      businessAction: "include",
      businessReason: "Válvula; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  if (description.includes("BRIDA")) {
    return {
      businessCategory: "flange",
      businessAction: "include",
      businessReason: "Brida; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  if (
    description.includes("CODO") ||
    description.includes(" TE ") ||
    description.startsWith("TE ") ||
    description.includes("REDUCCION") ||
    description.includes("RED EXC") ||
    description.includes("CAP ROSC") ||
    description.includes("CAP ") ||
    description.includes("TAPON") ||
    description.includes("TAPÓN") ||
    description.includes("COUPLING") ||
    description.includes("HALF COUPLING")
  ) {
    return {
      businessCategory: "fitting",
      businessAction: "include",
      businessReason: "Accesorio de línea; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  if (
    description.includes("ESPARRAGO") ||
    description.includes("TORNILLO") ||
    description.includes("TUERCA")
  ) {
    return {
      businessCategory: "bolt",
      businessAction: "include",
      businessReason: "Elemento de fijación; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  if (description.includes("JUNTA")) {
    return {
      businessCategory: "gasket",
      businessAction: "include",
      businessReason: "Junta; incluir en propuesta de palillería",
      businessConfidence: "high",
    };
  }

  return {
    businessCategory: "unknown",
    businessAction: "review",
    businessReason: "Descripción no clasificada; requiere revisión manual",
    businessConfidence: "low",
  };
}

export function applyBusinessRulesToSuggestions(
  suggestions: ExperimentalTakeoffCandidateRow[],
): BusinessRuleApplication[] {
  return suggestions.map((suggestion, suggestionIndex) => ({
    suggestion,
    suggestionIndex,
    ...applyBusinessRulesToSuggestion(suggestion),
  }));
}

export function countBusinessActions(
  applications: ReadonlyArray<Pick<AppliedBusinessRule, "businessAction">>,
): Record<BusinessAction, number> {
  return {
    include: applications.filter((row) => row.businessAction === "include").length,
    review: applications.filter((row) => row.businessAction === "review").length,
    exclude: applications.filter((row) => row.businessAction === "exclude").length,
  };
}

function expectedActionForBusinessRow(
  expected: BusinessExpectedRow,
): BusinessAction {
  if (!expected.businessRequired) {
    return "exclude";
  }

  if (expected.bomExtractable === false) {
    return "review";
  }

  return "include";
}

function createEmptyCategoryCounts(): Record<BusinessRuleCategory, number> {
  return {
    pipe: 0,
    flange: 0,
    valve: 0,
    fitting: 0,
    bolt: 0,
    gasket: 0,
    blind: 0,
    support: 0,
    exclusion: 0,
    unknown: 0,
  };
}

export function evaluateBusinessRulesForCase(params: {
  caseId: string;
  suggestions: ExperimentalTakeoffCandidateRow[];
  expectedBusinessRows: BusinessExpectedRow[];
}): BusinessRulesCaseMetrics {
  const applications = applyBusinessRulesToSuggestions(params.suggestions);
  const rowMatches = matchBusinessExpectedRows({
    expectedRows: params.expectedBusinessRows,
    suggestions: params.suggestions,
  });
  const classifications = classifyExtractedRows({
    suggestions: params.suggestions,
    rowMatches,
  });

  const usefulBefore = classifications.filter((row) => row.usefulForTakeoff).length;
  const includeApplications = applications.filter(
    (application) => application.businessAction === "include",
  );
  const usefulIncludeMatches = includeApplications.filter((application) => {
    const match = rowMatches.find(
      (row) => row.matchedSuggestionIndex === application.suggestionIndex,
    );

    if (match) {
      return (
        match.expected.businessRequired === true &&
        match.expected.bomExtractable !== false
      );
    }

    return application.businessCategory !== "exclusion";
  }).length;

  let actionLabeledCount = 0;
  let actionCorrectCount = 0;
  let falseIncludeCount = 0;
  let falseExcludeCount = 0;

  for (const match of rowMatches) {
    if (!match.matched || match.matchedSuggestionIndex == null) {
      continue;
    }

    if (match.expected.bomExtractable === false) {
      continue;
    }

    const application = applications[match.matchedSuggestionIndex];
    const expectedAction = expectedActionForBusinessRow(match.expected);

    actionLabeledCount += 1;

    if (application.businessAction === expectedAction) {
      actionCorrectCount += 1;
    }

    if (application.businessAction === "include" && expectedAction === "exclude") {
      falseIncludeCount += 1;
    }

    if (application.businessAction === "exclude" && expectedAction === "include") {
      falseExcludeCount += 1;
    }
  }

  const categoryCounts = createEmptyCategoryCounts();

  for (const application of applications) {
    categoryCounts[application.businessCategory] += 1;
  }

  const totalSuggestions = params.suggestions.length;

  return {
    caseId: params.caseId,
    totalSuggestions,
    includeCount: applications.filter((row) => row.businessAction === "include").length,
    reviewCount: applications.filter((row) => row.businessAction === "review").length,
    excludeCount: applications.filter((row) => row.businessAction === "exclude").length,
    utilityBefore:
      totalSuggestions > 0
        ? Number((usefulBefore / totalSuggestions).toFixed(4))
        : null,
    utilityAfter:
      includeApplications.length > 0
        ? Number((usefulIncludeMatches / includeApplications.length).toFixed(4))
        : null,
    actionLabeledCount,
    actionCorrectCount,
    falseIncludeCount,
    falseExcludeCount,
    categoryCounts,
    applications,
  };
}

export function aggregateBusinessRulesMetrics(
  cases: BusinessRulesCaseMetrics[],
): BusinessRulesAggregateMetrics {
  const categoryCounts = createEmptyCategoryCounts();
  let totalSuggestions = 0;
  let includeCount = 0;
  let reviewCount = 0;
  let excludeCount = 0;
  let usefulBefore = 0;
  let usefulIncludeMatches = 0;
  let includeTotal = 0;
  let actionLabeledCount = 0;
  let actionCorrectCount = 0;
  let falseIncludeCount = 0;
  let falseExcludeCount = 0;

  for (const caseMetrics of cases) {
    totalSuggestions += caseMetrics.totalSuggestions;
    includeCount += caseMetrics.includeCount;
    reviewCount += caseMetrics.reviewCount;
    excludeCount += caseMetrics.excludeCount;
    usefulBefore += (caseMetrics.utilityBefore ?? 0) * caseMetrics.totalSuggestions;
    includeTotal += caseMetrics.includeCount;
    usefulIncludeMatches +=
      (caseMetrics.utilityAfter ?? 0) * caseMetrics.includeCount;
    actionLabeledCount += caseMetrics.actionLabeledCount;
    actionCorrectCount += caseMetrics.actionCorrectCount;
    falseIncludeCount += caseMetrics.falseIncludeCount;
    falseExcludeCount += caseMetrics.falseExcludeCount;

    for (const category of BUSINESS_RULE_CATEGORIES) {
      categoryCounts[category] += caseMetrics.categoryCounts[category];
    }
  }

  return {
    pdfsEvaluated: cases.length,
    totalSuggestions,
    includeCount,
    reviewCount,
    excludeCount,
    utilityBefore:
      totalSuggestions > 0
        ? Number((usefulBefore / totalSuggestions).toFixed(4))
        : null,
    utilityAfter:
      includeTotal > 0
        ? Number((usefulIncludeMatches / includeTotal).toFixed(4))
        : null,
    actionLabeledCount,
    actionCorrectCount,
    falseIncludeCount,
    falseExcludeCount,
    categoryCounts,
  };
}

export const BUSINESS_RULES_CATALOG = [
  {
    id: "exclusion-spacer",
    patterns: ["FIGURA 8", "FIG. 8", "ESPACIADOR", "PADDLE SPACER"],
    category: "exclusion" as const,
    action: "exclude" as const,
  },
  {
    id: "support",
    patterns: ["SOPORTE", "STD-PS", "SUP-"],
    category: "support" as const,
    action: "review" as const,
  },
  {
    id: "pipe",
    patterns: ["TUBERIA", "PIPE"],
    category: "pipe" as const,
    action: "include" as const,
  },
  {
    id: "valve",
    patterns: ["VALVULA", "VÁLVULA"],
    category: "valve" as const,
    action: "include" as const,
  },
  {
    id: "flange",
    patterns: ["BRIDA"],
    category: "flange" as const,
    action: "include" as const,
  },
  {
    id: "fitting",
    patterns: [
      "CODO",
      "TE",
      "REDUCCION",
      "RED EXC",
      "CAP",
      "TAPON",
      "COUPLING",
    ],
    category: "fitting" as const,
    action: "include" as const,
  },
  {
    id: "bolt",
    patterns: ["ESPARRAGO", "TORNILLO", "TUERCA"],
    category: "bolt" as const,
    action: "include" as const,
  },
  {
    id: "gasket",
    patterns: ["JUNTA"],
    category: "gasket" as const,
    action: "include" as const,
  },
  {
    id: "blind",
    patterns: ["DISCO CIEGO", "BRIDA CIEGA"],
    category: "blind" as const,
    action: "include/review" as const,
  },
] as const;
