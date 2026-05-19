import {
  ALLOWED_LEGAL_IDS,
  KNOWLEDGE_BASE_LEGAL,
  getLegalSourceById,
  legalSourceToBasis,
} from "../../data/knowledgeBase";
import type { LegalBasis, ProjectAnalysis } from "../../types/architecture";

const ARTICLE_PATTERN =
  /\b(art\.|artykuł|§|rozdział|ust\.|pkt)\s*[\d]+[\w\d./\-]*/gi;

const VERIFY_NOTE = " — do weryfikacji w aktualnych przepisach i dla konkretnej inwestycji.";

function basisFromKbId(id: string): LegalBasis | null {
  const source = getLegalSourceById(id);
  if (source) return legalSourceToBasis(source);
  const kb = KNOWLEDGE_BASE_LEGAL.find((l) => l.id === id);
  if (kb) return { ...kb, verificationRequired: kb.verificationRequired ?? false };
  return null;
}

function sanitizeDescription(text: string, allowExactArticle: boolean): string {
  const hadArticle = ARTICLE_PATTERN.test(text);
  ARTICLE_PATTERN.lastIndex = 0;
  let desc = text.replace(ARTICLE_PATTERN, "").trim();
  ARTICLE_PATTERN.lastIndex = 0;
  if (!allowExactArticle && hadArticle) {
    desc = `${desc}${VERIFY_NOTE}`;
  }
  return desc;
}

function generalBasisForScope(scope: string): LegalBasis {
  const fallback = KNOWLEDGE_BASE_LEGAL.find((l) => l.scope === scope) ?? KNOWLEDGE_BASE_LEGAL[0];
  return {
    ...fallback,
    description: `${fallback.description}${VERIFY_NOTE}`,
    verificationRequired: true,
  };
}

/** Ensures legal basis entries reference only the knowledge base; strips invented articles. */
export function applySourceGuard(analysis: ProjectAnalysis): ProjectAnalysis {
  const legalBasis: LegalBasis[] = [];

  for (const entry of analysis.legalBasis) {
    const id = entry.id?.trim();
    if (id && ALLOWED_LEGAL_IDS.has(id)) {
      const canonical = basisFromKbId(id);
      if (canonical) {
        const source = getLegalSourceById(id);
        legalBasis.push({
          ...canonical,
          title: entry.title || canonical.title,
          description: sanitizeDescription(
            entry.description || canonical.description,
            source?.exactArticleAvailable === true
          ),
          scope: entry.scope || canonical.scope,
          verificationRequired:
            canonical.verificationRequired === true ||
            entry.verificationRequired === true ||
            source?.verificationRequired === true,
        });
        continue;
      }
    }

    const hasInventedArticle = ARTICLE_PATTERN.test(
      `${entry.sourceRef ?? ""} ${entry.description} ${entry.title}`
    );
    if (hasInventedArticle || !id || !ALLOWED_LEGAL_IDS.has(id)) {
      legalBasis.push(generalBasisForScope(entry.scope || "other"));
    } else {
      legalBasis.push({
        ...entry,
        description: sanitizeDescription(entry.description, false),
        verificationRequired: true,
      });
    }
  }

  const verifyLegalBasis = legalBasis.some((l) => l.verificationRequired === true);

  return {
    ...analysis,
    legalBasis: dedupeLegal(legalBasis),
    meta: {
      ...analysis.meta,
      source: analysis.meta?.source ?? "ai",
      usedFallback: analysis.meta?.usedFallback ?? false,
      needsClarification: analysis.meta?.needsClarification ?? false,
      verifyLegalBasis: verifyLegalBasis || (analysis.meta?.verifyLegalBasis ?? false),
    },
  };
}

function dedupeLegal(items: LegalBasis[]): LegalBasis[] {
  const map = new Map<string, LegalBasis>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}
