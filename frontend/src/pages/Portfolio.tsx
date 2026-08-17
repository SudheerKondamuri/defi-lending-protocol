import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { ExternalLink, Wallet, ArrowRight } from 'lucide-react';
import { formatUnits } from 'viem';
import Card from '../components/ui/Card';
import HealthFactorDisplay from '../components/ui/HealthFactorDisplay';
import TokenIcon from '../components/ui/TokenIcon';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { LedgerGroup, LedgerRow } from '../components/ui/StatCard';
import { useUserAccountData, useUserHealthFactor } from '../hooks/useLendingPool';
import { useUserActivityLogs } from '../hooks/useUserActivityLogs';
import { CONTRACTS, LENDING_POOL_ABI, ORACLE_ABI } from '../config/abis';
import { formatUSD, formatTokenAmount } from '../utils/format';

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
    refetch: refetchAccount,
  } = useUserAccountData(address);
  const { data: healthFactor } = useUserHealthFactor(address);
  const { logs, isLoading: logsLoading } = useUserActivityLogs(address);

  // Read per-asset positions and oracle prices
  const { data: positionReads } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'userPositions',
        args: [address || '0x0000000000000000000000000000000000000000', CONTRACTS.weth],
      },
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'userPositions',
        args: [address || '0x0000000000000000000000000000000000000000', CONTRACTS.usdc],
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

  const assetPositions = useMemo(() => {
    if (!positionReads || positionReads.length < 4) {
      return {
        weth: { collateral: 0n, borrow: 0n, collateralUsd: 0, borrowUsd: 0 },
        usdc: { collateral: 0n, borrow: 0n, collateralUsd: 0, borrowUsd: 0 },
      };
    }

    const wethPos = positionReads[0]?.result as [bigint, bigint, bigint] | undefined;
    const usdcPos = positionReads[1]?.result as [bigint, bigint, bigint] | undefined;
    const wethPrice = positionReads[2]?.result as bigint | undefined;
    const usdcPrice = positionReads[3]?.result as bigint | undefined;

    const wethPriceUsd = wethPrice ? parseFloat(formatUnits(wethPrice, 18)) : 0;
    const usdcPriceUsd = usdcPrice ? parseFloat(formatUnits(usdcPrice, 18)) : 0;

    const wethCol = wethPos?.[0] ?? 0n;
    const wethBor = wethPos?.[1] ?? 0n;
    const usdcCol = usdcPos?.[0] ?? 0n;
    const usdcBor = usdcPos?.[1] ?? 0n;

    return {
      weth: {
        collateral: wethCol,
        borrow: wethBor,
        collateralUsd: parseFloat(formatUnits(wethCol, 18)) * wethPriceUsd,
        borrowUsd: parseFloat(formatUnits(wethBor, 18)) * wethPriceUsd,
      },
      usdc: {
        collateral: usdcCol,
        borrow: usdcBor,
        collateralUsd: parseFloat(formatUnits(usdcCol, 6)) * usdcPriceUsd,
        borrowUsd: parseFloat(formatUnits(usdcBor, 6)) * usdcPriceUsd,
      },
    };
  }, [positionReads]);

  const utilizationPct = useMemo(() => {
    if (!accountData) return 0;
    const collateralVal = parseFloat(formatUnits(accountData[0] || 0n, 18));
    const debtVal = parseFloat(formatUnits(accountData[1] || 0n, 18));
    if (collateralVal === 0) return 0;
    return Math.min(100, Math.round((debtVal / (collateralVal * 0.8)) * 100));
  }, [accountData]);

  const hasAnyPosition = useMemo(() => {
    if (!accountData) return false;
    return (accountData[0] > 0n) || (accountData[1] > 0n);
  }, [accountData]);

  // ── Not Connected State ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-paper-100 border border-paper-200">
            <Wallet className="h-6 w-6 text-signal" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-display text-ink-900">Connect Web3 Wallet</h1>
            <p className="text-xs text-ink-600 leading-relaxed">
              Connect your account to inspect your collateral positions, monitor outstanding obligations, and browse the on-chain operations log.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-paper-200 animate-pulse rounded" />
        <div className="paper-card p-6 h-36 bg-paper-100 animate-pulse" />
      </div>
    );
  }

  if (accountError) {
    return (
      <ErrorState
        variant="page"
        title="Failed to Load Portfolio"
        description="Could not query your account positions from the lending protocol."
        onRetry={() => refetchAccount()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-900">
          Account Portfolio & Positions
        </h1>
        <p className="text-xs text-ink-600 mt-0.5">
          Real-time collateral allocations, outstanding borrow debts, and verified on-chain activity logs.
        </p>
      </div>

      {/* Main Metrics Ledger Statement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2">
          <LedgerGroup title="Position Balances">
            <LedgerRow
              label="Supplied Collateral"
              value={formatUSD(accountData?.[0])}
              change="Safe"
              changeType="positive"
            />
            <LedgerRow
              label="Outstanding Debt"
              value={formatUSD(accountData?.[1])}
              change={accountData?.[1] && accountData[1] > 0n ? 'Liability' : 'Zero'}
              changeType={accountData?.[1] && accountData[1] > 0n ? 'negative' : 'neutral'}
            />
            <LedgerRow
              label="Available Borrow Line"
              value={formatUSD(accountData?.[2])}
            />
            <LedgerRow
              label="Borrow Limit Usage"
              value={`${utilizationPct}%`}
              change={utilizationPct > 80 ? 'High' : 'Normal'}
              changeType={utilizationPct > 80 ? 'negative' : 'positive'}
            />
          </LedgerGroup>
        </div>

        <div className="md:col-span-1">
          <Card
            header={
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                Health Status
              </h2>
            }
          >
            <HealthFactorDisplay healthFactor={healthFactor} />
          </Card>
        </div>
      </div>

      {/* Zero Position Empty State or Position Details */}
      {!hasAnyPosition ? (
        <EmptyState
          title="No Active Positions Recorded"
          description="You currently have no supplied collateral or borrowed debt in the protocol. Deposit collateral in the Markets desk to start earning yield."
          actionText="Open Markets Desk"
          actionIcon={<ArrowRight className="h-3.5 w-3.5" />}
          onAction={() => {
            window.location.href = '/markets';
          }}
        />
      ) : (
        <>
          {/* Assets Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplied Collateral Assets */}
            <div className="paper-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-safe" aria-hidden="true" />
                Supplied Collateral Breakdown
              </h2>
              <div className="divide-y divide-paper-200">
                <div className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol="WETH" size="sm" />
                    <div>
                      <p className="font-semibold text-ink-900 font-mono">WETH</p>
                      <p className="text-[10px] text-ink-600 font-mono">
                        {formatTokenAmount(assetPositions.weth.collateral, 18)} WETH
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-ink-900 font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      assetPositions.weth.collateralUsd,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol="USDC" size="sm" />
                    <div>
                      <p className="font-semibold text-ink-900 font-mono">USDC</p>
                      <p className="text-[10px] text-ink-600 font-mono">
                        {formatTokenAmount(assetPositions.usdc.collateral, 6)} USDC
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-ink-900 font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      assetPositions.usdc.collateralUsd,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Borrowed Debt Assets */}
            <div className="paper-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
                Outstanding Debt Breakdown
              </h2>
              <div className="divide-y divide-paper-200">
                <div className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol="WETH" size="sm" />
                    <div>
                      <p className="font-semibold text-ink-900 font-mono">WETH</p>
                      <p className="text-[10px] text-ink-600 font-mono">
                        {formatTokenAmount(assetPositions.weth.borrow, 18)} WETH
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-ink-900 font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      assetPositions.weth.borrowUsd,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol="USDC" size="sm" />
                    <div>
                      <p className="font-semibold text-ink-900 font-mono">USDC</p>
                      <p className="text-[10px] text-ink-600 font-mono">
                        {formatTokenAmount(assetPositions.usdc.borrow, 6)} USDC
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-ink-900 font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      assetPositions.usdc.borrowUsd,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transaction History Log */}
      <div className="paper-card p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
          On-Chain Operations Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-paper-200 text-[10px] text-ink-600 uppercase font-mono font-medium tracking-wider">
                <th className="py-2">Type</th>
                <th className="py-2">Asset</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Transaction</th>
                <th className="py-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200/60">
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-600 text-xs font-mono">
                    Scanning block logs for user transactions...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-600 text-xs font-mono">
                    No recent transaction events recorded for this account.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx} className="text-xs hover:bg-paper-200/50 transition-colors">
                    <td className="py-2.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                          log.type === 'Deposit' || log.type === 'Repay'
                            ? 'bg-safe/10 text-safe'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-900 font-semibold font-mono">
                      <div className="flex items-center gap-1.5">
                        <TokenIcon symbol={log.asset} size="sm" />
                        <span>{log.asset}</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-ink-900">{log.amount}</td>
                    <td className="py-2.5 font-mono text-signal">
                      <a
                        href={`https://etherscan.io/tx/${log.tx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline cursor-pointer inline-flex items-center gap-1"
                        aria-label={`View transaction ${log.tx.substring(0, 6)} on block explorer`}
                      >
                        {log.tx.substring(0, 6)}…{log.tx.substring(log.tx.length - 4)}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="py-2.5 text-right text-ink-600 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
