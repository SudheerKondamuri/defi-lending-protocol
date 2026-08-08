import { useState, useMemo } from 'react';
import { ShieldAlert, Info, Search, Skull } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useLiquidate } from '../hooks/useLendingPool';
import { useLiquidatableAccounts, BorrowerAccount } from '../hooks/useLiquidatableAccounts';

export default function Liquidations() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<BorrowerAccount | null>(null);
  const [coverAmount, setCoverAmount] = useState('');

  const liquidationHook = useLiquidate();
  const { accounts, isLoading } = useLiquidatableAccounts();

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Auction House</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Liquidate positions with Health Factor &lt; 1.0 to earn a liquidation bonus.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-bg-3 border border-border-subtle pl-10 pr-4 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Mechanics Explanation */}
      <Card className="glass-card bg-bg-2/30 border-border-subtle p-6 flex flex-col md:flex-row gap-4 items-start">
        <div className="h-10 w-10 shrink-0 bg-brand-subtle border border-brand/20 rounded-xl flex items-center justify-center">
          <Info className="h-5 w-5 text-brand-light" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white">How Liquidations Work</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            When a borrower's Health Factor drops below 1.0, they are undercollateralized. Liquidators can step in to pay up to 50% of the active debt in exchange for seizing the equivalent value of the borrower's collateral asset at a 10% discount (Liquidation Bonus).
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Accounts List */}
        <Card className="glass-card lg:col-span-2 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-error h-4 w-4" />
            Active Borrower Accounts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="py-2.5">Borrower</th>
                  <th className="py-2.5">Collateral</th>
                  <th className="py-2.5">Debt</th>
                  <th className="py-2.5">Health Factor</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                      Scanning chain for borrower accounts...
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                      No active borrower accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc, idx) => {
                    const isLiquidatable = acc.healthFactor > 0 && acc.healthFactor < 1.0;
                    return (
                      <tr key={idx} className="text-xs hover:bg-white/5 transition-colors">
                        <td className="py-3 font-mono text-text-secondary">
                          {acc.address.slice(0, 6)}…{acc.address.slice(-4)}
                        </td>
                        <td className="py-3 text-text-primary font-semibold">
                          {acc.collateralValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} ({acc.collateralAsset})
                        </td>
                        <td className="py-3 text-text-primary font-semibold">
                          {acc.debtValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} ({acc.debtAsset})
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-mono font-bold ${
                              isLiquidatable ? 'text-error' : 'text-success'
                            }`}
                          >
                            {acc.healthFactor > 1000 ? '∞' : acc.healthFactor.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {isLiquidatable ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleSelect(acc)}
                              className="min-h-[32px] px-2.5 font-bold"
                            >
                              Liquidate
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded">
                              Healthy
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
        </Card>

        {/* Selected Liquidation Execution Panel */}
        <Card className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Skull className="h-4 w-4 text-brand-light" />
              Liquidation Console
            </h3>

            {selectedUser ? (
              <div className="space-y-4">
                <div className="bg-bg-3/50 rounded-xl p-3 border border-border-subtle space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Borrower</span>
                    <span className="font-mono text-white">
                      {selectedUser.address.slice(0, 8)}…{selectedUser.address.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Collateral to Seize</span>
                    <span className="font-bold text-success">
                      {selectedUser.collateralAsset} (+10% Bonus)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Debt to Repay</span>
                    <span className="font-bold text-brand-light">
                      {selectedUser.debtAsset}
                    </span>
                  </div>
                </div>

                <Input
                  label={`Debt to Cover (${selectedUser.debtAsset})`}
                  value={coverAmount}
                  onChange={(e) => setCoverAmount(e.target.value)}
                  type="number"
                  placeholder="0.00"
                />

                <Button
                  variant="danger"
                  size="md"
                  onClick={handleExecute}
                  loading={liquidationHook.isPending || liquidationHook.isConfirming}
                  className="w-full min-h-[44px]"
                >
                  Execute Liquidation
                </Button>

                {liquidationHook.isSuccess && (
                  <p className="text-center text-xs text-success font-semibold mt-2">
                    Liquidation executed successfully!
                  </p>
                )}
                {liquidationHook.error && (
                  <p className="text-center text-xs text-error font-semibold mt-2">
                    Error: {liquidationHook.error.message.slice(0, 60)}...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2 text-text-muted">
                <Skull className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs">
                  Select an undercollateralized user position to begin.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
