// Domain types — mirror the Supabase schema

export type Role = "superadmin" | "admin" | "scorer" | "public";

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: Role;
  active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Country {
  id: string;
  name: string;
  code: string | null;
  flag: string | null;
}

export interface Region {
  id: string;
  country_id: string | null;
  name: string;
  code: string | null;
  flag: string | null;
}

export interface City {
  id: string;
  province_id: string | null;
  country_id: string | null;
  name: string;
}

export interface Club {
  id: string;
  country_id: string | null;
  region_id: string | null;
  name: string;
  short_name: string | null;
}

export interface Discipline {
  id: string;
  name: string;
  code: string;
  category: "pool" | "snooker" | "english_billiards" | "carom";
  subcategory: string | null;
  scoring_type: "racks" | "frames" | "points" | "innings";
  icon: string | null;
  color: string | null;
  description: string | null;
}

export interface Player {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  alias: string | null;
  gender: string | null;
  country_id: string | null;
  region_id: string | null;
  club_id: string | null;
  photo: string | null;
  birth_date: string | null;
  ranking_pts: number;
  license_no: string | null;
  phone: string | null;
  email: string | null;
  handedness: string | null;
  active: boolean;
}

export type TournamentStatus =
  | "setup"
  | "registration"
  | "draw"
  | "ongoing"
  | "completed"
  | "cancelled";

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  discipline_id: string | null;
  format: "single" | "double" | "mixed";
  bracket_type: "elimination" | "double_elimination" | "round_robin" | "swiss";
  gender: string | null;
  draw_size: number;
  team_based: boolean;
  players_per_team: number;
  seeding_mode: "manual" | "ranking" | "random";
  separation_rules: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  description: string | null;
  logo: string | null;
  is_public: boolean;
  featured: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TournamentDivision {
  id: string;
  tournament_id: string;
  discipline_id: string | null;
  name: string;
  draw_size: number | null;
  best_of: number | null;
  gender: string | null;
  status: string;
  sort_order: number;
  rack_to: number | null;
}

export type EntryStatus = "confirmed" | "waitlist" | "withdrawn";

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  player_id: string | null;
  team_id: string | null;
  seed_no: number | null;
  bracket_slot: number | null;
  entry_status: EntryStatus;
  checked_in: boolean;
  division_id: string | null;
  remark: string | null;
  created_at: string;
}

export interface EntryWithPlayer extends TournamentEntry {
  players: Player | null;
}

export interface Table {
  id: string;
  name: string;
  code: string | null;
  table_type: "pool" | "snooker" | "carom" | "english_billiards";
  venue: string | null;
  active: boolean;
}

export interface CommitteeMember {
  id: string;
  tournament_id: string;
  name: string;
  role: string | null;
  organization: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
}

export interface TIG {
  id: string;
  tournament_id: string;
  title: string | null;
  content: string | null;
  file_path: string | null;
  rules_content: string | null;
  rules_file: string | null;
}

export interface Match {
  id: string;
  tournament_id: string;
  round_id: string | null;
  bracket: string;
  round_no: number;
  match_no: number;
  slot_a: number | null;
  slot_b: number | null;
  entry_a_id: string | null;
  entry_b_id: string | null;
  player_a_id: string | null;
  player_b_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  table_id: string | null;
  scheduled_at: string | null;
  best_of: number | null;
  score_a: number;
  score_b: number;
  winner_entry_id: string | null;
  loser_entry_id: string | null;
  status: "pending" | "scheduled" | "live" | "completed" | "bye" | "walkover";
  referee_id: string | null;
  scorer_id: string | null;
  on_tv: boolean;
  tv_position: number | null;
  started_at: string | null;
  finished_at: string | null;
  rack_to: number | null;
}

export interface MatchDetail {
  id: string;
  match_id: string;
  leg_no: number;
  score_a: number;
  score_b: number;
  break_a: number;
  break_b: number;
  winner: "A" | "B" | null;
  inning: number | null;
  cannon_a: number;
  cannon_b: number;
  hazard_a: number;
  hazard_b: number;
  notes: string | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string | null;
  category: string | null;
  sort_order: number;
  active: boolean;
}

export interface BracketMatch {
  round: number;
  index: number;
  matchNo: number;
  slotA: number | null;
  slotB: number | null;
  entryAId: string | null;
  entryBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerEntryId: string | null;
  status: string;
}