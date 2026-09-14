import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type {
  Club,
  Country,
  Discipline,
  EntryWithPlayer,
  FAQ,
  Player,
  Region,
  Table,
  Tournament,
  TournamentDivision,
} from "./types";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof Error ? e.message : "Something went wrong",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}

// ============================================================
// Domain fetchers
// ============================================================

export async function fetchTournaments(filters?: { status?: string; featuredOnly?: boolean }) {
  let q = supabase
    .from("tournaments")
    .select("*, disciplines(name, color, icon)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.featuredOnly) q = q.eq("featured", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as (Tournament & { disciplines: Discipline | null })[];
}

export async function fetchTournament(slug: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, disciplines(*)")
    .eq("slug", slug)
    .single();
  if (error) throw new Error(error.message);
  return data as Tournament & { disciplines: Discipline | null };
}

export async function fetchTournamentById(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, disciplines(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Tournament & { disciplines: Discipline | null };
}

export async function fetchDivisions(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_divisions")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data as TournamentDivision[];
}

export async function fetchEntries(tournamentId: string): Promise<EntryWithPlayer[]> {
  const { data, error } = await supabase
    .from("tournament_entries")
    .select("*, players(*)")
    .eq("tournament_id", tournamentId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as EntryWithPlayer[];
}

export async function fetchCommittee(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_committee")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTig(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_tig")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPlayers(search?: string) {
  let q = supabase
    .from("players")
    .select("*, countries(name), clubs(name)")
    .order("ranking_pts", { ascending: false });
  if (search) {
    q = q.or(`full_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as (Player & { countries: { name: string } | null; clubs: { name: string } | null })[];
}

export async function fetchPlayer(id: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*, countries(*), regions(*), clubs(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await supabase.from("countries").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRegions(countryId?: string): Promise<Region[]> {
  let q = supabase.from("regions").select("*").order("name");
  if (countryId) q = q.eq("country_id", countryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await supabase.from("clubs").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchDisciplines(): Promise<Discipline[]> {
  const { data, error } = await supabase.from("disciplines").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTables(): Promise<Table[]> {
  const { data, error } = await supabase.from("tables").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchFaq(): Promise<FAQ[]> {
  const { data, error } = await supabase
    .from("faq")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMatches(tournamentId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, players_a:players!player_a_id(*), players_b:players!player_b_id(*), tables(*)")
    .eq("tournament_id", tournamentId)
    .order("round_no")
    .order("match_no");
  if (error) throw new Error(error.message);
  return data;
}

export interface MatchWithJoins {
  id: string;
  tournament_id: string;
  round_no: number;
  match_no: number;
  entry_a_id: string | null;
  entry_b_id: string | null;
  player_a_id: string | null;
  player_b_id: string | null;
  table_id: string | null;
  scheduled_at: string | null;
  score_a: number;
  score_b: number;
  status: string;
  on_tv: boolean;
  tv_position: number | null;
  tournaments?: { id: string; name: string; slug: string } | null;
  players_a?: Player | null;
  players_b?: Player | null;
  tables?: Table | null;
  entries_a?: { id: string } | null;
  entries_b?: { id: string } | null;
}

/** All matches for the public schedule page, optionally filtered by tournament. */
export async function fetchScheduleMatches(tournamentId?: string): Promise<MatchWithJoins[]> {
  let q = supabase
    .from("matches")
    .select("*, tournaments(id, name, slug), players_a:players!player_a_id(*), players_b:players!player_b_id(*), tables(*), entries_a:tournament_entries!entry_a_id(id), entries_b:tournament_entries!entry_b_id(id)")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("match_no");
  if (tournamentId) q = q.eq("tournament_id", tournamentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as MatchWithJoins[];
}

/** Live + scheduled matches for the live scores page (status live or scheduled). */
export async function fetchLiveMatches(tournamentId?: string): Promise<MatchWithJoins[]> {
  let q = supabase
    .from("matches")
    .select("*, tournaments(id, name, slug), players_a:players!player_a_id(*), players_b:players!player_b_id(*), tables(*), entries_a:tournament_entries!entry_a_id(id), entries_b:tournament_entries!entry_b_id(id)")
    .in("status", ["live", "scheduled"])
    .order("status")
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (tournamentId) q = q.eq("tournament_id", tournamentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as MatchWithJoins[];
}

/** Tournaments with a confirmed draw for the brackets list page. */
export async function fetchBracketsList() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, disciplines(name, color, icon)")
    .not("status", "in", '("setup","cancelled")')
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as (Tournament & { disciplines: Discipline | null })[];
}

export async function fetchDisciplineBySlug(slugOrCode: string) {
  const { data, error } = await supabase
    .from("disciplines")
    .select("*")
    .or(`code.eq.${slugOrCode},name.ilike.%${slugOrCode}%`)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Discipline | null;
}

export async function fetchTournamentsByDiscipline(disciplineId: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, disciplines(name, color, icon)")
    .eq("discipline_id", disciplineId)
    .not("status", "in", '("cancelled")')
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as (Tournament & { disciplines: Discipline | null })[];
}

export async function fetchMatchDetails(matchId: string) {
  const { data, error } = await supabase
    .from("match_details")
    .select("*")
    .eq("match_id", matchId)
    .order("leg_no");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyPlayer(userId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}