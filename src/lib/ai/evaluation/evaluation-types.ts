export type EvaluationDecision = 'answer' | 'clarify' | 'fallback' | 'conflict' | 'insufficient';
export type EntityMatchStrength = 'full_name' | 'alias' | 'weak_similarity' | 'none';
export type EvidenceValueKind = 'general' | 'exact_value';

export type EvaluationSource = {
  documentId: string;
  chunkId: string;
  documentStatus?: 'ready' | 'processing' | 'failed';
  supportingText?: string;
  duplicateOf?: string;
};

export type FactEvidence = {
  id: string;
  valueKind?: EvidenceValueKind;
  directlySupportsAnswer: boolean;
  inferred?: boolean;
  sources: EvaluationSource[];
};

export type EvaluationConflict = { field: string; values: unknown[]; sources: EvaluationSource[] };
export type EvaluationInput = {
  entity: { found: boolean; ambiguous: boolean; matchStrength: EntityMatchStrength };
  facts: FactEvidence[];
  conflicts?: EvaluationConflict[];
  retrieval?: { topSimilarityScore?: number; relevantChunkCount?: number; textSupportsAnswer?: boolean };
  requiresExactValue?: boolean;
};
export type KnowledgeEvaluation = {
  decision: EvaluationDecision;
  confidence: number;
  reasons: string[];
  supportedFacts: FactEvidence[];
  rejectedFacts: FactEvidence[];
  conflicts: EvaluationConflict[];
  sources: EvaluationSource[];
  sourceCount: number;
  independentDocumentCount: number;
};
