export type ElectionStatus = "draft" | "scheduled" | "active" | "paused" | "ended" | "published";

export interface Election {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: ElectionStatus;
  results_published: boolean;
  created_at: string;
}

export interface Position {
  id: string;
  election_id: string;
  title: string;
  description: string | null;
  display_order: number;
}

export interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  manifesto: string | null;
  photo_url: string | null;
  approved: boolean;
}

export interface Vote {
  id: string;
  election_id: string;
  position_id: string;
  candidate_id: string;
  voter_id: string;
  receipt: string;
  created_at: string;
}
