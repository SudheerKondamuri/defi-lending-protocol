import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits, parseUnits } from 'viem';
import {
  Landmark,
  TrendingUp,
  Shield,
  Percent,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Undo2,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';

import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import HealthFactorDisplay from '../components/ui/HealthFactorDisplay';
import {
  useUserAccountData,
  useUserHealthFactor,
  useUserCollateral,
  useUserBorrows,
  useDeposit,
  useWithdraw,
  useBorrow,
  useRepay,
  useAssetData,
} from '../hooks/useLendingPool';
import { useTokenBalance, useTokenAllowance, useTokenApproval } from '../hooks/useTokenBalance';
import { CONTRACTS } from '../config/abis';

const ASSETS = [
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: CONTRACTS.weth,
    decimals: 18,
    color: '#627EEA',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: CONTRACTS.usdc,
    decimals: 6,
    color: '#2775CA',
  },
] as const;

const BLOCKS_PER_YEAR = 2102400n;

type TabId = 'deposit' | 'withdraw' | 'borrow' | 'repay';

const TABS: { id: TabId; label: string; icon: typeof ArrowDownToLine }[] = [
  { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { id: 'borrow', label: 'Borrow', icon: HandCoins },
  { id: 'repay', label: 'Repay', icon: Undo2 },
];

// ── Utility Functions ─────────────────────────────────────────────────

function formatUSD(value: bigint | undefined, decimals = 18): string {
  if (value === undefined) return '$0.00';
  const num = parseFloat(formatUnits(value, decimals));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatTokenAmount(value: bigint | undefined, decimals = 18): string {
  if (value === undefined) return '0.0000';
  const num = parseFloat(formatUnits(value, decimals));
  if (num === 0) return '0.0000';
  if (num < 0.0001) return '<0.0001';
  return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

// ── Skeleton Loader ───────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded-lg bg-bg-4', className)}
      aria-hidden="true"
    />
  );
}

// ── Dashboard Component ───────────────────────────────────────────────

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('deposit');
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(0);
  const [amount, setAmount] = useState('');

  const selectedAsset = ASSETS[selectedAssetIdx];

  // ── Contract Reads ────────────────────────────────────────────────
  const { data: accountData, isLoading: accountLoading } = useUserAccountData(address);
  const { data: healthFactor } = useUserHealthFactor(address);
  const { data: collateral } = useUserCollateral(address, selectedAsset.address);
  const { data: borrows } = useUserBorrows(address, selectedAsset.address);
  const { data: walletBalance } = useTokenBalance(selectedAsset.address, address);
  const { data: allowance } = useTokenAllowance(
    selectedAsset.address,
    address,
    CONTRACTS.lendingPool,
  );
  
  const { data: assetData } = useAssetData(selectedAsset.address);
  const depositRatePerBlock = assetData?.[2] ?? 0n;
  const borrowRatePerBlock = assetData?.[3] ?? 0n;
  
  const currentDepositAPY = Number((depositRatePerBlock * BLOCKS_PER_YEAR * 10000n) / 10n**18n) / 100;
  const currentBorrowAPY = Number((borrowRatePerBlock * BLOCKS_PER_YEAR * 10000n) / 10n**18n) / 100;

  // ── Contract Writes ───────────────────────────────────────────────
  const depositHook = useDeposit();
  const withdrawHook = useWithdraw();
  const borrowHook = useBorrow();
  const repayHook = useRepay();
  const approvalHook = useTokenApproval(selectedAsset.address, CONTRACTS.lendingPool);

  // Reset amount when tab or asset changes
  useEffect(() => {
    setAmount('');
  }, [activeTab, selectedAssetIdx]);

  // ── Derived Values ────────────────────────────────────────────────
  const healthFactorNum = useMemo(() => {
    if (!healthFactor) return undefined;
    return parseFloat(formatUnits(healthFactor, 18));
  }, [healthFactor]);

  const needsApproval = useMemo(() => {
    if (activeTab !== 'deposit' && activeTab !== 'repay') return false;
    if (!amount || !allowance) return false;
    try {
      const parsedAmount = parseUnits(amount, selectedAsset.decimals);
      return allowance < parsedAmount;
    } catch {
      return false;
    }
  }, [activeTab, amount, allowance, selectedAsset.decimals]);

  // ── Max Balance ───────────────────────────────────────────────────
  const maxBalance = useMemo(() => {
    switch (activeTab) {
      case 'deposit':
        return walletBalance ? formatUnits(walletBalance, selectedAsset.decimals) : '0';
      case 'withdraw':
        return collateral ? formatUnits(collateral, selectedAsset.decimals) : '0';
      case 'borrow':
        return accountData?.[2] ? formatUnits(accountData[2], 18) : '0';
      case 'repay':
        return borrows ? formatUnits(borrows, selectedAsset.decimals) : '0';
      default:
        return '0';
    }
  }, [activeTab, walletBalance, collateral, borrows, accountData, selectedAsset.decimals]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleMax = useCallback(() => {
    setAmount(maxBalance);
  }, [maxBalance]);

  const handleSubmit = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) return;

    switch (activeTab) {
      case 'deposit':
        depositHook.deposit(selectedAsset.address, amount, selectedAsset.decimals);
        break;
      case 'withdraw':
        withdrawHook.withdraw(selectedAsset.address, amount, selectedAsset.decimals);
        break;
      case 'borrow':
        borrowHook.borrow(selectedAsset.address, amount, selectedAsset.decimals);
        break;
      case 'repay':
        repayHook.repay(selectedAsset.address, amount, selectedAsset.decimals);
        break;
    }
  }, [activeTab, amount, selectedAsset, depositHook, withdrawHook, borrowHook, repayHook]);

  const isSubmitting =
    depositHook.isPending ||
    depositHook.isConfirming ||
    withdrawHook.isPending ||
    withdrawHook.isConfirming ||
    borrowHook.isPending ||
    borrowHook.isConfirming ||
    repayHook.isPending ||
    repayHook.isConfirming;

  const submitLabel = useMemo(() => {
    if (needsApproval) return `Approve ${selectedAsset.symbol}`;
    const labels: Record<TabId, string> = {
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      borrow: 'Borrow',
      repay: 'Repay',
    };
    return labels[activeTab];
  }, [activeTab, needsApproval, selectedAsset.symbol]);

  // ── Not Connected State ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-subtle">
            <Wallet className="h-10 w-10 text-brand" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">
              Connect Your Wallet
            </h2>
            <p className="max-w-md text-text-secondary">
              Connect your wallet to view your positions, deposit collateral, borrow assets,
              and manage your DeFi lending portfolio.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Connected Dashboard ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Health Factor Warning Banner */}
      <AnimatePresence>
        {healthFactorNum !== undefined && healthFactorNum < 1.5 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={clsx(
              'rounded-xl border p-4 flex items-center gap-3',
              healthFactorNum < 1.0
                ? 'bg-error/10 border-error/30 animate-pulse'
                : 'bg-warning/10 border-warning/30',
            )}
            role="alert"
          >
            <AlertTriangle
              className={clsx(
                'h-5 w-5 shrink-0',
                healthFactorNum < 1.0 ? 'text-error' : 'text-warning',
              )}
              aria-hidden="true"
            />
            <div>
              <p
                className={clsx(
                  'text-sm font-semibold',
                  healthFactorNum < 1.0 ? 'text-error' : 'text-warning',
                )}
              >
                {healthFactorNum < 1.0
                  ? 'Liquidation Risk — Immediate Action Required'
                  : 'Position At Risk — Consider Adding Collateral'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {healthFactorNum < 1.0
                  ? 'Your health factor is below 1.0. Your position can be liquidated at any time.'
                  : 'Your health factor is between 1.0 and 1.5. Consider repaying debt or adding collateral.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accountLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[120px] rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              icon={<Landmark className="h-5 w-5" />}
              label="Total Collateral"
              value={formatUSD(accountData?.[0])}
              index={0}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Borrowed"
              value={formatUSD(accountData?.[1])}
              index={1}
            />
            <StatCard
              icon={<Shield className="h-5 w-5" />}
              label="Health Factor"
              value={
                healthFactor
                  ? parseFloat(formatUnits(healthFactor, 18)) >= 100
                    ? '∞'
                    : parseFloat(formatUnits(healthFactor, 18)).toFixed(2)
                  : '—'
              }
              change={
                healthFactorNum !== undefined
                  ? healthFactorNum >= 1.5
                    ? 'Healthy'
                    : healthFactorNum >= 1.0
                      ? 'At Risk'
                      : 'Critical'
                  : undefined
              }
              changeType={
                healthFactorNum !== undefined
                  ? healthFactorNum >= 1.5
                    ? 'positive'
                    : healthFactorNum >= 1.0
                      ? 'neutral'
                      : 'negative'
                  : 'neutral'
              }
              index={2}
            />
            <StatCard
              icon={<Percent className="h-5 w-5" />}
              label="Net APY"
              value="+4.32%"
              change="Earning"
              changeType="positive"
              index={3}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Market Overview — Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Factor Card */}
          <Card
            header={
              <h2 className="text-base font-semibold text-text-primary">
                Health Factor
              </h2>
            }
          >
            <HealthFactorDisplay healthFactor={healthFactor} />
          </Card>

          {/* Market Overview */}
          <Card
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-primary">
                  Market Overview
                </h2>
                <Badge variant="info" dot>
                  {ASSETS.length} Assets
                </Badge>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Table Header */}
              <div className="hidden sm:grid sm:grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">
                <span className="col-span-2">Asset</span>
                <span className="text-right">Deposit APY</span>
                <span className="text-right">Borrow APY</span>
                <span className="text-right">Your Deposits</span>
                <span className="text-right">Your Borrows</span>
              </div>

              {/* Asset Rows */}
              {ASSETS.map((asset, idx) => (
                <AssetRow
                  key={asset.symbol}
                  asset={asset}
                  index={idx}
                  isSelected={selectedAssetIdx === idx}
                  onSelect={() => setSelectedAssetIdx(idx)}
                  userAddress={address}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Action Panel — Right 1/3 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-bg-3 p-1 mb-5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium cursor-pointer',
                      'transition-all duration-200 min-h-[44px]',
                      activeTab === tab.id
                        ? 'bg-brand text-white shadow-md shadow-brand/30'
                        : 'text-text-muted hover:text-text-secondary',
                    )}
                    aria-pressed={activeTab === tab.id}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline lg:hidden xl:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Asset Selector */}
            <div className="flex gap-2 mb-4">
              {ASSETS.map((asset, idx) => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAssetIdx(idx)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium cursor-pointer',
                    'border transition-all duration-200 min-h-[44px]',
                    selectedAssetIdx === idx
                      ? 'border-brand bg-brand-subtle text-text-primary'
                      : 'border-border-subtle bg-bg-3 text-text-secondary hover:border-border-default',
                  )}
                >
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ background: asset.color }}
                    aria-hidden="true"
                  />
                  {asset.symbol}
                </button>
              ))}
            </div>

            {/* Amount Input */}
            <div className="space-y-4">
              <Input
                type="number"
                label={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Amount`}
                placeholder="0.0000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onMax={handleMax}
                tokenSymbol={selectedAsset.symbol}
                min="0"
                step="any"
                helperText={`Available: ${parseFloat(maxBalance).toFixed(4)} ${selectedAsset.symbol}`}
              />

              {/* Info Row */}
              {activeTab === 'borrow' && (
                <div className="rounded-xl bg-bg-3 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Borrow APY</span>
                    <span className="text-text-primary font-medium">{currentBorrowAPY.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Available to Borrow</span>
                    <span className="text-text-primary font-medium">
                      {parseFloat(maxBalance).toFixed(4)} {selectedAsset.symbol}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="rounded-xl bg-bg-3 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Deposit APY</span>
                    <span className="text-success font-medium">{currentDepositAPY.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Wallet Balance</span>
                    <span className="text-text-primary font-medium">
                      {parseFloat(maxBalance).toFixed(4)} {selectedAsset.symbol}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'repay' && borrows && (
                <div className="rounded-xl bg-bg-3 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Outstanding Debt</span>
                    <span className="text-text-primary font-medium">
                      {formatTokenAmount(borrows, selectedAsset.decimals)} {selectedAsset.symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                variant={needsApproval ? 'secondary' : 'primary'}
                size="lg"
                className="w-full"
                loading={isSubmitting || approvalHook.isPending}
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={
                  needsApproval
                    ? () => approvalHook.approve()
                    : handleSubmit
                }
              >
                {isSubmitting ? 'Confirming...' : submitLabel}
              </Button>

              {/* Transaction Success */}
              <AnimatePresence>
                {(depositHook.isSuccess ||
                  withdrawHook.isSuccess ||
                  borrowHook.isSuccess ||
                  repayHook.isSuccess) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-success/10 border border-success/30 p-3 text-center"
                  >
                    <p className="text-sm text-success font-medium">
                      Transaction Confirmed
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Asset Row Sub-Component ───────────────────────────────────────────

interface AssetRowProps {
  asset: (typeof ASSETS)[number];
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  userAddress: `0x${string}` | undefined;
}

function AssetRow({ asset, index, isSelected, onSelect, userAddress }: AssetRowProps) {
  const { data: collateral } = useUserCollateral(userAddress, asset.address);
  const { data: borrows } = useUserBorrows(userAddress, asset.address);
  
  const { data: assetData } = useAssetData(asset.address);
  const depositRatePerBlock = assetData?.[2] ?? 0n;
  const borrowRatePerBlock = assetData?.[3] ?? 0n;
  
  const depositAPY = Number((depositRatePerBlock * BLOCKS_PER_YEAR * 10000n) / 10n**18n) / 100;
  const borrowAPY = Number((borrowRatePerBlock * BLOCKS_PER_YEAR * 10000n) / 10n**18n) / 100;

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      onClick={onSelect}
      className={clsx(
        'w-full grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4 items-center',
        'rounded-xl px-4 py-3 text-left cursor-pointer',
        'transition-all duration-200',
        isSelected
          ? 'bg-brand-subtle border border-brand/30'
          : 'hover:bg-white/5 border border-transparent',
      )}
    >
      {/* Asset Info */}
      <div className="col-span-2 flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full shrink-0"
          style={{ background: asset.color }}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-text-primary">{asset.symbol}</p>
          <p className="text-xs text-text-muted">{asset.name}</p>
        </div>
      </div>

      {/* Deposit APY */}
      <div className="text-right">
        <p className="text-xs text-text-muted sm:hidden">Deposit APY</p>
        <p className="text-sm font-medium text-success">{depositAPY.toFixed(2)}%</p>
      </div>

      {/* Borrow APY */}
      <div className="text-right">
        <p className="text-xs text-text-muted sm:hidden">Borrow APY</p>
        <p className="text-sm font-medium text-warning">{borrowAPY.toFixed(2)}%</p>
      </div>

      {/* Your Deposits */}
      <div className="text-right">
        <p className="text-xs text-text-muted sm:hidden">Your Deposits</p>
        <p className="text-sm font-medium text-text-primary font-mono">
          {formatTokenAmount(collateral, asset.decimals)}
        </p>
      </div>

      {/* Your Borrows */}
      <div className="text-right">
        <p className="text-xs text-text-muted sm:hidden">Your Borrows</p>
        <p className="text-sm font-medium text-text-primary font-mono">
          {formatTokenAmount(borrows, asset.decimals)}
        </p>
      </div>
    </motion.button>
  );
}
