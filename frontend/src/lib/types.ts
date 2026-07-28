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
  status: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED' | 'ERROR';
  reason: string;
  deposit: string;
  distributed: boolean;
}

export interface Counts {
  works: number;
  claims: number;
}
