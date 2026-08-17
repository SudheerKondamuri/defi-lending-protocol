import { useMemo } from 'react';
import { useReadContracts, useBlockNumber } from 'wagmi';
import { RefreshCw } from 'lucide-react';
import TokenIcon from '../components/ui/TokenIcon';
import ErrorState from '../components/ui/ErrorState';
import { LedgerGroup, LedgerRow } from '../components/ui/StatCard';
import { RateCurveChart, BarChart } from '../components/ui/Charts';
import { CONTRACTS, LENDING_POOL_ABI, ORACLE_ABI } from '../config/abis';

export default function Analytics() {
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'getAssetData',
        args: [CONTRACTS.weth],
      },
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'getAssetData',
        args: [CONTRACTS.usdc],
      },
      {
        address: CONTRACTS.oracle,
        abi: ORACLE_ABI,
        functionName: 'getAssetPrice',
        args: [CONTRACTS.weth],
      },
      {
        address: CONTRACTS.oracle,
        abi: ORACLE_ABI,
        functionName: 'getAssetPrice',
        args: [CONTRACTS.usdc],
      },
    ],
  });

  const [wethData, usdcData, wethPriceRes, usdcPriceRes] = data || [];

  const wethPrice = Number(wethPriceRes?.result ?? 0n) / 1e18;
  const usdcPrice = Number(usdcPriceRes?.result ?? 0n) / 1e18;

  const wethDeposits = Number(wethData?.result?.[0] ?? 0n) / 1e18;
  const usdcDeposits = Number(usdcData?.result?.[0] ?? 0n) / 1e6;
  const wethBorrows = Number(wethData?.result?.[1] ?? 0n) / 1e18;
  const usdcBorrows = Number(usdcData?.result?.[1] ?? 0n) / 1e6;

  const wethDepositUsd = wethDeposits * (wethPrice || 0);
  const usdcDepositUsd = usdcDeposits * (usdcPrice || 0);
  const wethBorrowUsd = wethBorrows * (wethPrice || 0);
  const usdcBorrowUsd = usdcBorrows * (usdcPrice || 0);

  const totalTvlUsd = wethDepositUsd + usdcDepositUsd;
  const totalBorrowUsd = wethBorrowUsd + usdcBorrowUsd;

  const RESERVE_BARS = useMemo(
    () => [
      { label: 'WETH Supply', value: Math.round(wethDepositUsd) },
      { label: 'USDC Supply', value: Math.round(usdcDepositUsd) },
      { label: 'WETH Debt', value: Math.round(wethBorrowUsd) },
      { label: 'USDC Debt', value: Math.round(usdcBorrowUsd) },
    ],
    [wethDepositUsd, usdcDepositUsd, wethBorrowUsd, usdcBorrowUsd],
  );

  const ORACLE_FEEDS = useMemo(
    () => [
      {
        symbol: 'WETH',
        asset: 'WETH / USD',
        source: 'PriceOracleRegistry',
        price: wethPrice ? `$${wethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        contract: CONTRACTS.oracle,
      },
      {
        symbol: 'USDC',
        asset: 'USDC / USD',
        source: 'PriceOracleRegistry',
        price: usdcPrice ? `$${usdcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        contract: CONTRACTS.oracle,
      },
    ],
    [wethPrice, usdcPrice],
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-900">
            System Analytics & Oracle Feeds
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Real-time on-chain reserves distribution, interest rate model parameters, and verified oracle feeds.
          </p>
        </div>
        {refetch && (
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-paper-100 border border-paper-200 px-3 py-1.5 text-xs font-mono font-medium text-ink-600 hover:text-ink-900 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refetch State</span>
          </button>
        )}
      </div>

      {isError ? (
        <ErrorState
          variant="page"
          title="Failed to Load Analytics"
          description="Could not query asset data and oracle price feeds from the lending protocol."
          onRetry={() => refetch?.()}
        />
      ) : (
        <>
          {/* Top Aggregate Summary (Ledger Pattern) */}
          <LedgerGroup title="Protocol Aggregates">
            <LedgerRow
              label="Total Protocol Collateral Value"
              value={isLoading ? 'Loading...' : `$${totalTvlUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              change="Solvent"
              changeType="positive"
            />
            <LedgerRow
              label="Total Active Borrow Debt"
              value={isLoading ? 'Loading...' : `$${totalBorrowUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              change="Monitored"
              changeType="neutral"
            />
            <LedgerRow
              label="Latest Synchronized Block"
              value={blockNumber ? `#${blockNumber.toString()}` : 'Live'}
            />
          </LedgerGroup>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reserves Pool Composition */}
            <div className="paper-card p-5 space-y-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                  Pool Reserves Composition (USD)
                </h2>
                <p className="text-[11px] text-ink-600 mt-0.5">
                  Collateral supply versus outstanding borrow debt.
                </p>
              </div>
              <BarChart data={RESERVE_BARS} color="#1F3B5C" />
            </div>

            {/* Rate Curve kink */}
            <div className="paper-card p-5 space-y-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                  Interest Rate Model Curve
                </h2>
                <p className="text-[11px] text-ink-600 mt-0.5">
                  Dynamic piecewise curve escalating sharply at 80% Kink.
                </p>
              </div>
              <RateCurveChart kink={0.8} baseRate={2} rateAtKink={18} maxRate={58} />
            </div>
          </div>

          {/* Oracle Feeds Table */}
          <div className="paper-card p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
              Verified Oracle Price Feeds
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-paper-200 text-[10px] text-ink-600 uppercase font-mono font-medium tracking-wider">
                    <th className="py-2">Asset Pair</th>
                    <th className="py-2">Price Feed (USD)</th>
                    <th className="py-2">Oracle Registry</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Block</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200/60">
                  {ORACLE_FEEDS.map((feed) => (
                    <tr key={feed.asset} className="text-xs hover:bg-paper-200/50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <TokenIcon symbol={feed.symbol} size="sm" />
                          <div>
                            <span className="font-semibold text-ink-900 font-mono block">{feed.asset}</span>
                            <span className="text-[10px] text-ink-600 font-mono">{feed.source}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono font-bold text-ink-900">
                        {feed.price}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-ink-600">
                        {feed.contract.slice(0, 8)}…{feed.contract.slice(-6)}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-safe bg-safe/10 border border-safe/25 px-2 py-0.5 rounded">
                          <span className="h-1 w-1 rounded-full bg-safe" />
                          Active
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-ink-600 font-mono text-[11px]">
                        {blockNumber ? `#${blockNumber.toString()}` : 'Live'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
