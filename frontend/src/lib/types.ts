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
  status: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED' | 'ERROR' | 'APPEALED';
  reason: string;
  deposit: string;
  distributed: boolean;
  ai_confidence: number;
  appeals: number;
}

export interface Counts {
  works: number;
  claims: number;
  forfeited_pool?: string;
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
}
