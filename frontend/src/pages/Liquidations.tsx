import { useState, useMemo } from 'react';
import { Info, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TokenIcon from '../components/ui/TokenIcon';
import ErrorState from '../components/ui/ErrorState';
import { useLiquidate } from '../hooks/useLendingPool';
import { useLiquidatableAccounts, type BorrowerAccount } from '../hooks/useLiquidatableAccounts';

export default function Liquidations() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<BorrowerAccount | null>(null);
  const [coverAmount, setCoverAmount] = useState('');

  const liquidationHook = useLiquidate();
  const { accounts, isLoading, isError, refetch } = useLiquidatableAccounts();

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch = acc.address.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [search, accounts]);

  const handleSelect = (user: BorrowerAccount) => {
    setSelectedUser(user);
    setCoverAmount(user.maxDebtToCover);
  };

  const handleExecute = () => {
    if (!selectedUser || !coverAmount) return;
    liquidationHook.liquidate(
      selectedUser.address,
      selectedUser.debtAddress,
      selectedUser.collateralAddress,
      coverAmount,
      selectedUser.decimals,
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-900">
            Liquidations & Auction Desk
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Monitor undercollateralized loans (Health Factor &lt; 1.00) and execute liquidations to earn the on-chain liquidation bonus.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-72">
          <label htmlFor="borrower-search" className="sr-only">Search borrowers by address</label>
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-600" aria-hidden="true" />
          <input
            id="borrower-search"
            type="text"
            placeholder="Search borrower address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md bg-paper-100 border border-paper-200 pl-9 pr-3 py-1.5 text-xs font-mono text-ink-900 placeholder:text-ink-600 focus:border-signal focus:outline-none"
          />
        </div>
      </div>

      {/* Mechanics Explanation */}
      <div className="paper-card p-4 flex flex-col md:flex-row gap-3 items-start bg-paper-100/80">
        <Info className="h-4 w-4 text-signal shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-900 font-mono">
            Liquidation Mechanics
          </h2>
          <p className="text-xs text-ink-600 leading-relaxed">
            When a borrower's Health Factor falls below 1.00, any third-party liquidator may repay up to 50% of the active debt on their behalf to seize the corresponding collateral value plus the protocol liquidation bonus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Accounts List */}
        <div className="paper-card lg:col-span-2 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-200 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
              Borrower Accounts Register
            </h2>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 text-[11px] font-mono text-ink-600 hover:text-ink-900 cursor-pointer"
              aria-label="Refresh borrower accounts list"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>

          {isError ? (
            <ErrorState
              title="Failed to scan borrower accounts"
              description="Could not query borrow event logs from the contract. Ensure RPC is reachable."
              onRetry={() => refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-paper-200 text-[10px] text-ink-600 uppercase font-mono font-medium tracking-wider">
                    <th className="py-2">Borrower</th>
                    <th className="py-2">Collateral</th>
                    <th className="py-2">Debt</th>
                    <th className="py-2">Health Factor</th>
                    <th className="py-2 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-600 text-xs font-mono">
                        Scanning on-chain event logs for borrower positions...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-600 text-xs font-mono">
                        {search
                          ? `No borrower matching "${search}" found.`
                          : 'No active borrower accounts found on chain.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc, idx) => {
                      const isLiquidatable = acc.healthFactor > 0 && acc.healthFactor < 1.0;
                      return (
                        <tr key={idx} className="text-xs hover:bg-paper-200/50 transition-colors">
                          <td className="py-2.5 font-mono text-ink-900">
                            {acc.address.slice(0, 6)}…{acc.address.slice(-4)}
                          </td>
                          <td className="py-2.5 text-ink-900 font-semibold font-mono">
                            <div className="flex items-center gap-1.5">
                              <TokenIcon symbol={acc.collateralAsset} size="sm" />
                              <span>{acc.collateralValue.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-ink-900 font-semibold font-mono">
                            <div className="flex items-center gap-1.5">
                              <TokenIcon symbol={acc.debtAsset} size="sm" />
                              <span>{acc.debtValue.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                isLiquidatable
                                  ? 'bg-danger/10 text-danger border border-danger/25'
                                  : 'text-safe'
                              }`}
                            >
                              {acc.healthFactor > 1000 ? '∞' : acc.healthFactor.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            {isLiquidatable ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleSelect(acc)}
                                className="!min-h-[28px] !px-2.5 text-[11px]"
                              >
                                Liquidate
                              </Button>
                            ) : (
                              <span className="text-[10px] font-mono text-safe font-medium">
                                Solvent
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Liquidation Execution Panel */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
              Liquidation Console
            </h2>

            {selectedUser ? (
              <div className="space-y-3">
                <div className="bg-paper-50 rounded p-3 border border-paper-200 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Target Borrower</span>
                    <span className="text-ink-900 font-semibold">
                      {selectedUser.address.slice(0, 6)}…{selectedUser.address.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Collateral to Seize</span>
                    <span className="text-safe font-semibold">
                      {selectedUser.collateralAsset} (+{selectedUser.bonusPct.toFixed(1)}% Bonus)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Debt Asset</span>
                    <span className="text-ink-900 font-semibold">
                      {selectedUser.debtAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Max Repayable</span>
                    <span className="text-ink-900 font-bold">
                      {selectedUser.maxDebtToCover} {selectedUser.debtAsset}
                    </span>
                  </div>
                </div>

                <Input
                  label={`Debt to Cover (${selectedUser.debtAsset})`}
                  value={coverAmount}
                  onChange={(e) => setCoverAmount(e.target.value)}
                  type="number"
                  placeholder="0.00"
                  tokenSymbol={selectedUser.debtAsset}
                />

                <Button
                  variant="danger"
                  size="md"
                  onClick={handleExecute}
                  loading={liquidationHook.isPending || liquidationHook.isConfirming}
                  className="w-full"
                >
                  Execute Liquidation
                </Button>

                {liquidationHook.isSuccess && (
                  <div className="rounded bg-safe/10 border border-safe/25 p-2 flex items-center justify-center gap-1.5 text-xs text-safe font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Liquidation confirmed successfully!</span>
                  </div>
                )}
                {liquidationHook.error && (
                  <div className="rounded bg-danger/8 border border-danger/25 p-2 text-xs text-danger font-mono" role="alert">
                    <span>Failed: {liquidationHook.error.message.slice(0, 70)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 space-y-1 text-ink-600">
                <p className="text-xs">
                  Select an undercollateralized borrower account from the table to prepare liquidation.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
