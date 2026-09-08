export interface Work {
  id: string;
  artist: string;
  title: string;
  source_url: string;
  license_terms: string;
  created_at: number;
}

export interface Claim {
  id: string;
  work_id: string;
  remixer: string;
  remix_url: string;
  declaration: string;
  proposed_split_bps: number;
  final_split_bps: number;
  status: ClaimStatus;
  reason: string;
  deposit: string;
  /** Original submit_claim escrow. Never mutated — the appeal stake is priced off it. */
  base_deposit?: string;
  /** This claim's share of `forfeited_pool`, refundable if an appeal overturns. */
  forfeited?: string;
  distributed: boolean;
  ai_confidence: number;
  appeals: number;
  /** v2.0.0 — artist contests used (cap = max_contests). */
  contests?: number;
  /** v2.0.0 — the artist's most recent contest stake, wei string. */
  contest_stake?: string;
  /** v2.0.0 — the artist's dispute argument, fed to the jury on re-adjudication. */
  contest_reason?: string;
  /** v2.0.0 — "" | "ARTIST_WON" | "REMIXER_WON". */
  contest_outcome?: ContestOutcome;
  /** v2.0.0 — stake refundable to the artist after a won contest, wei string. */
  artist_refund?: string;
}

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
export type ContestOutcome = '' | 'ARTIST_WON' | 'REMIXER_WON';

/** v2.0.0 — a decided ruling in a work's on-chain case law (get_precedents). */
export interface Precedent {
  id: string;
  status: ClaimStatus;
  final_split_bps: number;
  ai_confidence: number;
  appeals: number;
  contests: number;
  contest_outcome: ContestOutcome;
  reason: string;
}

/** Row shape returned by the contract's `list_claims()` global feed. */
export interface ClaimSummary {
  id: string;
  work_id: string;
  work_title: string;
  remixer: string;
  remix_url: string;
  status: ClaimStatus;
  proposed_split_bps: number;
  final_split_bps: number;
  ai_confidence: number;
  appeals: number;
  /** v2.0.0 — artist contests used on this claim. */
  contests?: number;
  /** v2.0.0 — outcome of the artist's contest, if any. */
  contest_outcome?: ContestOutcome;
  distributed: boolean;
  reason: string;
}

export interface Counts {
  works: number;
  claims: number;
  /** Rejected deposits still appeal-eligible. Locked — not sweepable. */
  forfeited_pool?: string;
  /** Rejected deposits from claims that used up their appeals. Owner-sweepable. */
  forfeited_final?: string;
}

export interface Reputation {
  address: string;
  approved: number;
  modified: number;
  rejected: number;
}

export interface ContractConfig {
  claim_deposit_min: string;
  settlement_min: string;
  appeal_stake_multiplier: number;
  max_appeals: number;
  /** v2.0.0 */
  contest_stake_multiplier?: number;
  max_contests?: number;
  precedent_lookback?: number;
}
