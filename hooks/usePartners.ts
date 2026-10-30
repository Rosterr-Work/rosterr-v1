import useSWR from "swr";
import type { OrgBadgeName } from "@/utils/orgBadge";

type PartnersAnswer = { groupIds: number[]; badges?: Record<string, OrgBadgeName> };

const load = (url: string) => fetch(url).then((r) => r.json() as Promise<PartnersAnswer>);

/** The workspaces platform staff have marked Verified or Partner, and which badge each has. Fetched once and kept for five minutes. */
export function usePartners() {
  const { data, error } = useSWR("/api/partners", load, { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 });
  const badges = data?.badges ?? {};

  return {
    partnerIds: data?.groupIds ?? [],
    badgeFor: (groupId: number | string): OrgBadgeName | null => badges[String(groupId)] ?? null,
    isLoading: !error && !data,
    isError: Boolean(error),
  };
}
