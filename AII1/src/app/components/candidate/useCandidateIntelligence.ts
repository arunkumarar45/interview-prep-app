// src/app/components/candidate/useCandidateIntelligence.ts
// Custom hook that fetches Candidate Intelligence data from Supabase.
//
// Data sources (both RLS-protected — user sees only their own rows):
//   - competency_scores: mastery level per competency
//   - misconceptions:    unresolved detected incorrect beliefs
//
// The anon client is safe to use here because:
//   - RLS is enabled on both tables (auth.uid() = user_id)
//   - We only SELECT — no inserts or updates go through this hook
//   - Mutations (resolve) go through the authenticated backend API

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

export type MasteryLevel = "weak" | "developing" | "competent" | "strong" | "mastered";
export type InterviewDomain = "technical" | "hr" | "project";

export interface CompetencyScore {
  id: string;
  domain: InterviewDomain;
  competency: string;
  attempts: number;
  last_score: number;
  recent_scores: number[];
  mastery_level: MasteryLevel;
  updated_at: string;
}

export interface Misconception {
  id: string;
  domain: InterviewDomain;
  competency: string;
  description: string;
  incorrect_belief: string;
  correction: string;
  resolved: boolean;
  created_at: string;
}

export interface CandidateIntelligenceData {
  competencyScores: CompetencyScore[];
  unresolvedMisconceptions: Misconception[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCandidateIntelligence(): CandidateIntelligenceData {
  const [competencyScores, setCompetencyScores] = useState<CompetencyScore[]>([]);
  const [unresolvedMisconceptions, setUnresolvedMisconceptions] = useState<Misconception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Not authenticated — return empty state silently
          if (!cancelled) {
            setCompetencyScores([]);
            setUnresolvedMisconceptions([]);
            setLoading(false);
          }
          return;
        }

        // Parallel fetch: competency scores + unresolved misconceptions
        const [scoresRes, misconceptionsRes] = await Promise.all([
          supabase
            .from("competency_scores")
            .select("id, domain, competency, attempts, last_score, recent_scores, mastery_level, updated_at")
            .order("updated_at", { ascending: false }),
          supabase
            .from("misconceptions")
            .select("id, domain, competency, description, incorrect_belief, correction, resolved, created_at")
            .eq("resolved", false)
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (scoresRes.error) {
          console.warn("[useCandidateIntelligence] competency_scores fetch error:", scoresRes.error.message);
        }
        if (misconceptionsRes.error) {
          console.warn("[useCandidateIntelligence] misconceptions fetch error:", misconceptionsRes.error.message);
        }

        setCompetencyScores((scoresRes.data ?? []) as CompetencyScore[]);
        setUnresolvedMisconceptions((misconceptionsRes.data ?? []) as Misconception[]);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? "Failed to load Candidate Intelligence data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { competencyScores, unresolvedMisconceptions, loading, error, refresh };
}
