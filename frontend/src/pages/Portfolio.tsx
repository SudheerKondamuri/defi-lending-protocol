import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Landmark, ArrowUpRight, ArrowDownLeft, ShieldAlert, History, ExternalLink } from 'lucide-react';
import { formatUnits } from 'viem';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import HealthFactorDisplay from '../components/ui/HealthFactorDisplay';
import { useUserAccountData, useUserHealthFactor } from '../hooks/useLendingPool';
import { useUserActivityLogs } from '../hooks/useUserActivityLogs';

function formatUSD(value: bigint | undefined): string {
  if (value === undefined) return '$0.00';
  const num = parseFloat(formatUnits(value, 18));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export default function Portfolio() {
  const { address } = useAccount();
  const { data: accountData, isLoading: accountLoading } = useUserAccountData(address);
  const { data: healthFactor } = useUserHealthFactor(address);
  const { logs, isLoading: logsLoading } = useUserActivityLogs(address);

  // Collateral vs Borrow limit percent
  const utilizationPct = useMemo(() => {
    if (!accountData) return 0;
    const collateralVal = parseFloat(formatUnits(accountData[0], 18));
    const debtVal = parseFloat(formatUnits(accountData[1], 18));
    if (collateralVal === 0) return 0;
    return Math.min(100, Math.round((debtVal / (collateralVal * 0.8)) * 100)); // threshold approx 80%
  }, [accountData]);

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-4 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-bg-3 animate-pulse rounded-2xl border border-border-subtle" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">My Portfolio</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Manage your collateralized assets, debt positions, and transaction logs.
        </p>
      </div>

      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Landmark className="h-5 w-5 text-brand-light" />}
          label="Collateral Supplied"
          value={formatUSD(accountData?.[0])}
          index={0}
        />
        <StatCard
          icon={<ArrowUpRight className="h-5 w-5 text-error" />}
          label="Outstanding Borrows"
          value={formatUSD(accountData?.[1])}
          index={1}
        />
        <StatCard
          icon={<ArrowDownLeft className="h-5 w-5 text-success" />}
          label="Remaining Borrow Capacity"
          value={formatUSD(accountData?.[2])}
          index={2}
        />
        <Card className="glass-card flex flex-col justify-between p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              Health Factor
            </span>
            <ShieldAlert className="h-4 w-4 text-text-muted" />
          </div>
          <div className="mt-2">
            <HealthFactorDisplay healthFactor={healthFactor} />
          </div>
        </Card>
      </div>

      {/* Borrow Capacity Utilization Bar */}
      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Borrow Power Utilization</h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              Your safety buffer against asset market volatility.
            </p>
          </div>
          <span className="font-mono text-sm font-black text-brand-light">
            {utilizationPct}%
          </span>
        </div>

        <div className="h-2 w-full bg-bg-4 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-success via-warning to-error"
            style={{ width: `${utilizationPct}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-text-muted font-mono">
          <span>Safe (0%)</span>
          <span>Moderate (50%)</span>
          <span>Liquidation Risk (100%)</span>
        </div>
      </Card>

      {/* Assets Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplied collateral assets */}
        <Card className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            Supplied Assets
          </h3>
          <div className="divide-y divide-border-subtle">
            <div className="flex justify-between py-3">
              <span className="text-xs font-semibold text-text-secondary">WETH Collateral</span>
              <span className="font-mono text-xs text-white font-bold">
                {formatUSD(accountData?.[0])}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs font-semibold text-text-secondary">USDC Collateral</span>
              <span className="font-mono text-xs text-white font-bold">$0.00</span>
            </div>
          </div>
        </Card>

        {/* Borrowed debt assets */}
        <Card className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-error" />
            Borrowed Assets
          </h3>
          <div className="divide-y divide-border-subtle">
            <div className="flex justify-between py-3">
              <span className="text-xs font-semibold text-text-secondary">WETH Debt</span>
              <span className="font-mono text-xs text-white font-bold">$0.00</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs font-semibold text-text-secondary">USDC Debt</span>
              <span className="font-mono text-xs text-white font-bold">
                {formatUSD(accountData?.[1])}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction History Log */}
      <Card className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="h-4 w-4 text-brand-light" />
          Recent Operations
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle text-[10px] text-text-muted uppercase font-bold tracking-wider">
                <th className="py-2.5">Type</th>
                <th className="py-2.5">Asset</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Tx ID</th>
                <th className="py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-muted text-xs">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-muted text-xs">
                    No recent activity found.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx} className="text-xs hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'Deposit' || log.type === 'Repay'
                            ? 'bg-success/15 text-success'
                            : 'bg-error/15 text-error'
                        }`}
                      >
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 text-text-primary font-semibold">{log.asset}</td>
                    <td className="py-3 font-mono font-bold text-text-secondary">{log.amount}</td>
                    <td className="py-3 font-mono text-brand-light">
                      <a 
                        href={`https://etherscan.io/tx/${log.tx}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {log.tx.substring(0, 6)}...{log.tx.substring(log.tx.length - 4)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-3 text-right text-text-muted font-mono">
                      {new Date(log.timestamp).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
