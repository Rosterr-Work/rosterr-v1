import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { loginState } from "@/state";
import { fmtDate } from "@/utils/formatDate";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { FullRanking, PresenceCards, Podium, StatStrip } from "@/components/leaderboard/Board";
import { OrderRanking } from "@/components/orders/parts";
import type { OrderBoard } from "@/utils/orders/service";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const PERIODS = [["current", "This period"], ["last", "Last period"], ["all", "All time"]] as const;
const METRICS = [["minutes", "Time"], ["orders", "Orders"]] as const;

const Leaderboard: pageWithLayout<{}> = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const [period, setPeriod] = useState<"current" | "last" | "all">("current");
  const { board, style, loading } = useLeaderboard(id, period);
  // Café, restaurant and shop groups can rank by orders served too; the switch only shows once the workspace has logged an order.
  const [metric, setMetric] = useState<"minutes" | "orders">("minutes");
  useEffect(() => {
    if (router.query.metric === "orders") setMetric("orders");
  }, [router.query.metric]);
  const { data: orders } = useSWR<{ board: OrderBoard }>(id ? `/api/workspace/${id}/orders/leaderboard?period=${period}` : null, (u: string) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false, shouldRetryOnError: false });
  const orderBoard = orders?.board;
  const byOrders = metric === "orders" && Boolean(orderBoard?.hasOrders);
  const login = useRecoilValue(loginState);
  const top = board?.topStaff ?? [];
  const range = board?.periodStart ? `${fmtDate(board.periodStart, { day: "numeric", month: "short" })} to ${board.periodEnd ? fmtDate(board.periodEnd, { day: "numeric", month: "short" }) : "now"}` : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div>
            <h1 className="text-h2 text-zinc-900 dark:text-white">Leaderboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{byOrders ? (range ? `Orders served, ${range}` : "Orders served across the workspace") : range ? `Time on duty, ${range}` : "Time on duty across the workspace"}</p>
          </div>
          {orderBoard?.hasOrders && (
            <div role="group" aria-label="Rank by" className="ml-auto inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5">
              {METRICS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMetric(value)} aria-pressed={metric === value} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${metric === value ? "bg-primary text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>{label}</button>
              ))}
            </div>
          )}
          <div role="group" aria-label="Period" className={`${orderBoard?.hasOrders ? "" : "ml-auto "}inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5`}>
            {PERIODS.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${period === value ? "bg-primary text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>{label}</button>
            ))}
          </div>
        </div>

        {board && !board.available && <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">There is no last period yet: the activity hasn&apos;t been reset.</p>}

        {byOrders && orderBoard ? (
          <div className="space-y-6">
            {orderBoard.people.some((p) => p.orders > 0) ? (
              <OrderRanking people={orderBoard.people} me={login?.userId} />
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">Nobody has served an order in this period yet.</p>
            )}
          </div>
        ) : loading && !board ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading the leaderboard…</p>
        ) : (
          <div className="space-y-6">
            <StatStrip top={top} inGame={board?.activeUsers.length ?? 0} onLeave={board?.inactiveUsers.length ?? 0} />
            {top.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">Nobody has any time on duty in this period yet.</p>
            ) : (
              <>
                {style === "podium" && <Podium top={top} withHeading={false} />}
                <FullRanking top={top} me={login?.userId} />
              </>
            )}
            <PresenceCards className="md:grid-cols-2" active={board?.activeUsers ?? []} away={board?.inactiveUsers ?? []} />
          </div>
        )}
      </div>
    </div>
  );
};

Leaderboard.layout = workspace;

export default Leaderboard;
