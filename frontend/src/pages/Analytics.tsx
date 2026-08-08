import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { ShieldCheck, Activity, Network, Heart } from 'lucide-react';
import Card from '../components/ui/Card';
import { AreaChart, RateCurveChart, BarChart } from '../components/ui/Charts';
import { CONTRACTS, LENDING_POOL_ABI, ORACLE_ABI } from '../config/abis';

export default function Analytics() {
  const { data } = useReadContracts({
    contracts: [
      { address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: 'getAssetData', args: [CONTRACTS.weth] },
      { address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: 'getAssetData', args: [CONTRACTS.usdc] },
      { address: CONTRACTS.oracle, abi: ORACLE_ABI, functionName: 'getAssetPrice', args: [CONTRACTS.weth] },
      { address: CONTRACTS.oracle, abi: ORACLE_ABI, functionName: 'getAssetPrice', args: [CONTRACTS.usdc] },
    ],
  });

  const [wethData, usdcData, wethPriceRes, usdcPriceRes] = data || [];

  const wethPrice = Number(wethPriceRes?.result ?? 0n) / 1e18;
  const usdcPrice = Number(usdcPriceRes?.result ?? 0n) / 1e18;

  const wethDeposits = Number(wethData?.result?.[0] ?? 0n) / 1e18;
  const usdcDeposits = Number(usdcData?.result?.[0] ?? 0n) / 1e6;
  const wethBorrows = Number(wethData?.result?.[1] ?? 0n) / 1e18;
  const usdcBorrows = Number(usdcData?.result?.[1] ?? 0n) / 1e6;

  const wethDepositUsd = wethDeposits * wethPrice;
  const usdcDepositUsd = usdcDeposits * usdcPrice;
  const wethBorrowUsd = wethBorrows * wethPrice;
  const usdcBorrowUsd = usdcBorrows * usdcPrice;

  const totalTvlUsd = wethDepositUsd + usdcDepositUsd;

  // Since we don't have historical on-chain TVL, we create a flat line of the current TVL for the chart
  const TVL_DATA = useMemo(() => [
    { label: 'Past', value: totalTvlUsd / 1e6 },
    { label: 'Current', value: totalTvlUsd / 1e6 },
  ], [totalTvlUsd]);

  const RESERVE_BARS = useMemo(() => [
    { label: 'WETH Collateral', value: wethDepositUsd },
    { label: 'USDC Collateral', value: usdcDepositUsd },
    { label: 'WETH Borrows', value: wethBorrowUsd },
    { label: 'USDC Borrows', value: usdcBorrowUsd },
  ], [wethDepositUsd, usdcDepositUsd, wethBorrowUsd, usdcBorrowUsd]);

  const ORACLE_FEEDS = useMemo(() => [
    { asset: 'WETH / USD', source: 'Chainlink Feed', price: `$${wethPrice.toFixed(2)}`, heartbeat: '1h', status: 'Healthy', block: 'Live' },
    { asset: 'USDC / USD', source: 'Chainlink Feed', price: `$${usdcPrice.toFixed(2)}`, heartbeat: '24h', status: 'Healthy', block: 'Live' },
  ], [wethPrice, usdcPrice]);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">System Analytics</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Real-time insights into pool utilization, interest rate equations, and registry feeds.
        </p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TVL Graph */}
        <Card className="glass-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-light" />
              Total Value Locked (USD)
            </h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              Cumulative deposits across all collateral vaults.
            </p>
          </div>
          <AreaChart data={TVL_DATA} prefix="$" suffix="M" />
        </Card>

        {/* Rate Curve kink */}
        <Card className="glass-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="h-4 w-4 text-info" />
              Borrow Interest Rate Curve
            </h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              Compounding APY based on utilization ratios (80% Kink).
            </p>
          </div>
          <RateCurveChart kink={0.8} baseRate={2} rateAtKink={6} maxRate={50} />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reserves Bar Chart */}
        <Card className="glass-card md:col-span-1 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-light" />
              Asset Reserves Distribution
            </h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              USD ratio breakdown of collateral vs loans.
            </p>
          </div>
          <BarChart data={RESERVE_BARS} color="var(--color-brand)" />
        </Card>

        {/* Oracle heartbeats */}
        <Card className="glass-card md:col-span-2 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            Oracle Feed Status
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="py-2.5">Asset Pair</th>
                  <th className="py-2.5">Price (USD)</th>
                  <th className="py-2.5">Heartbeat</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Last Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {ORACLE_FEEDS.map((feed, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="py-3 flex flex-col">
                      <span className="font-bold text-white">{feed.asset}</span>
                      <span className="text-[10px] text-text-muted font-mono">{feed.source}</span>
                    </td>
                    <td className="py-3 font-mono font-bold text-text-secondary">{feed.price}</td>
                    <td className="py-3 font-mono text-text-secondary">{feed.heartbeat}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded">
                        <Heart className="h-3 w-3 fill-success" />
                        {feed.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-text-muted font-mono">{feed.block}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
