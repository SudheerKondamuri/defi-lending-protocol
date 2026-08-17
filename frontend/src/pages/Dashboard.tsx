import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits, parseUnits } from 'viem';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Undo2,
  AlertTriangle,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import HealthFactorDisplay from '../components/ui/HealthFactorDisplay';
import TokenIcon from '../components/ui/TokenIcon';
import ErrorState from '../components/ui/ErrorState';
import { LedgerGroup, LedgerRow } from '../components/ui/StatCard';
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
import { CONTRACTS, LENDING_POOL_ABI, ORACLE_ABI } from '../config/abis';
import { useSupportedAssets } from '../config/assets';
import { formatUSD, formatTokenAmount, formatAPY, calculateAPYNumber } from '../utils/format';

type TabId = 'deposit' | 'withdraw' | 'borrow' | 'repay';

const TABS: { id: TabId; label: string; icon: typeof ArrowDownToLine }[] = [
  { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { id: 'borrow', label: 'Borrow', icon: HandCoins },
  { id: 'repay', label: 'Repay', icon: Undo2 },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('deposit');
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(0);
  const [amount, setAmount] = useState('');
  const tabListRef = useRef<HTMLDivElement>(null);

  const { assets } = useSupportedAssets();
  const selectedAsset = assets[selectedAssetIdx] || assets[0];

  // ── Contract Reads ────────────────────────────────────────────────
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
    refetch: refetchAccount,
  } = useUserAccountData(address);
  const { data: healthFactor } = useUserHealthFactor(address);
  const { data: collateral } = useUserCollateral(address, selectedAsset.address);
  const { data: borrows } = useUserBorrows(address, selectedAsset.address);
  const { data: walletBalance } = useTokenBalance(selectedAsset.address, address);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    selectedAsset.address,
    address,
    CONTRACTS.lendingPool,
  );

  // Read oracle price for selected asset
  const { data: selectedAssetPrice } = useReadContract({
    address: CONTRACTS.oracle,
    abi: ORACLE_ABI,
    functionName: 'getAssetPrice',
    args: [selectedAsset.address],
    query: {
      enabled: !!selectedAsset.address,
      refetchInterval: 12_000,
    },
  });

  // Read pool liquidity for selected asset
  const { data: poolLiquidity } = useTokenBalance(selectedAsset.address, CONTRACTS.lendingPool);

  const { data: assetData } = useAssetData(selectedAsset.address);
  const depositRatePerBlock = assetData?.[2] ?? 0n;
  const borrowRatePerBlock = assetData?.[3] ?? 0n;

  const currentDepositAPY = calculateAPYNumber(depositRatePerBlock);
  const currentBorrowAPY = calculateAPYNumber(borrowRatePerBlock);

  const totalCollateralUSD = accountData?.[0] ?? 0n;
  const availableBorrowUSD = accountData?.[2] ?? 0n;
  const userDebt = borrows ?? 0n;
  const hasCollateral = totalCollateralUSD > 0n;
  const hasDebt = userDebt > 0n;

  // Max borrowable in token units (capped by user borrow capacity & pool liquidity)
  const maxBorrowTokens = useMemo(() => {
    if (!availableBorrowUSD || availableBorrowUSD <= 0n || !selectedAssetPrice || selectedAssetPrice <= 0n) {
      return 0n;
    }
    const decimalsFactor = 10n ** BigInt(selectedAsset.decimals);
    const maxTokensByPower = (availableBorrowUSD * decimalsFactor) / selectedAssetPrice;
    const poolCash = poolLiquidity ?? 0n;
    return maxTokensByPower < poolCash ? maxTokensByPower : poolCash;
  }, [availableBorrowUSD, selectedAssetPrice, selectedAsset.decimals, poolLiquidity]);

  // Max repayable in token units (capped by current debt & wallet balance)
  const maxRepayTokens = useMemo(() => {
    const debt = borrows ?? 0n;
    const balance = walletBalance ?? 0n;
    return debt < balance ? debt : balance;
  }, [borrows, walletBalance]);

  // ── Read all assets data & prices for Net APY calculation ─────────
  const { data: rawMarketReads } = useReadContracts({
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
    ],
  });

  // Calculate Net APY
  const { netApy, netApyLabel, netApyType } = useMemo(() => {
    if (!rawMarketReads || rawMarketReads.length < 6 || !accountData) {
      return { netApy: 0, netApyLabel: 'Neutral', netApyType: 'neutral' as const };
    }

    const wethAssetData = rawMarketReads[0]?.result as [bigint, bigint, bigint, bigint, boolean] | undefined;
    const usdcAssetData = rawMarketReads[1]?.result as [bigint, bigint, bigint, bigint, boolean] | undefined;
    const wethPrice = rawMarketReads[2]?.result as bigint | undefined;
    const usdcPrice = rawMarketReads[3]?.result as bigint | undefined;
    const wethPos = rawMarketReads[4]?.result as [bigint, bigint, bigint] | undefined;
    const usdcPos = rawMarketReads[5]?.result as [bigint, bigint, bigint] | undefined;

    const totalCollateralVal = accountData[0] ? parseFloat(formatUnits(accountData[0], 18)) : 0;

    if (!wethAssetData || !usdcAssetData || !wethPrice || !usdcPrice || totalCollateralVal === 0) {
      return { netApy: 0, netApyLabel: 'No Position', netApyType: 'neutral' as const };
    }

    const wethDepAPY = calculateAPYNumber(wethAssetData[2]) / 100;
    const wethBorAPY = calculateAPYNumber(wethAssetData[3]) / 100;
    const usdcDepAPY = calculateAPYNumber(usdcAssetData[2]) / 100;
    const usdcBorAPY = calculateAPYNumber(usdcAssetData[3]) / 100;

    const wethPriceUsd = parseFloat(formatUnits(wethPrice, 18));
    const usdcPriceUsd = parseFloat(formatUnits(usdcPrice, 18));

    const wethColVal = wethPos ? parseFloat(formatUnits(wethPos[0], 18)) * wethPriceUsd : 0;
    const wethBorVal = wethPos ? parseFloat(formatUnits(wethPos[1], 18)) * wethPriceUsd : 0;
    const usdcColVal = usdcPos ? parseFloat(formatUnits(usdcPos[0], 6)) * usdcPriceUsd : 0;
    const usdcBorVal = usdcPos ? parseFloat(formatUnits(usdcPos[1], 6)) * usdcPriceUsd : 0;

    const totalEarningYear = (wethColVal * wethDepAPY) + (usdcColVal * usdcDepAPY);
    const totalCostYear = (wethBorVal * wethBorAPY) + (usdcBorVal * usdcBorAPY);
    const netAnnualUsd = totalEarningYear - totalCostYear;

    const netApyVal = (netAnnualUsd / totalCollateralVal) * 100;

    if (netApyVal > 0.001) {
      return { netApy: netApyVal, netApyLabel: 'Earning', netApyType: 'positive' as const };
    } else if (netApyVal < -0.001) {
      return { netApy: netApyVal, netApyLabel: 'Paying', netApyType: 'negative' as const };
    }
    return { netApy: 0, netApyLabel: 'Neutral', netApyType: 'neutral' as const };
  }, [rawMarketReads, accountData]);

  // ── Contract Writes ───────────────────────────────────────────────
  const queryClient = useQueryClient();
  const depositHook = useDeposit();
  const withdrawHook = useWithdraw();
  const borrowHook = useBorrow();
  const repayHook = useRepay();
  const approvalHook = useTokenApproval(selectedAsset.address, CONTRACTS.lendingPool);

  useEffect(() => {
    setAmount('');
  }, [activeTab, selectedAssetIdx]);

  useEffect(() => {
    if (approvalHook.isSuccess) {
      refetchAllowance();
      queryClient.invalidateQueries();
    }
  }, [approvalHook.isSuccess, refetchAllowance, queryClient]);

  useEffect(() => {
    if (depositHook.isSuccess || withdrawHook.isSuccess || borrowHook.isSuccess || repayHook.isSuccess) {
      setAmount('');
      queryClient.invalidateQueries();
    }
  }, [depositHook.isSuccess, withdrawHook.isSuccess, borrowHook.isSuccess, repayHook.isSuccess, queryClient]);

  const healthFactorNum = useMemo(() => {
    if (!healthFactor) return undefined;
    return parseFloat(formatUnits(healthFactor, 18));
  }, [healthFactor]);

  // Projected Health Factor Simulation
  const projectedHealthFactor = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || !accountData || !selectedAssetPrice || selectedAssetPrice <= 0n) {
      return undefined;
    }
    try {
      const parsedAmount = parseUnits(amount, selectedAsset.decimals);
      if (parsedAmount <= 0n) return undefined;
      const decimalsFactor = 10n ** BigInt(selectedAsset.decimals);
      const amountUSD = (parsedAmount * selectedAssetPrice) / decimalsFactor;

      const currentDebtUSD = accountData[1] ?? 0n;
      const weightedCollateralUSD = (accountData[2] ?? 0n) + currentDebtUSD;

      if (activeTab === 'borrow') {
        const newDebtUSD = currentDebtUSD + amountUSD;
        if (newDebtUSD <= 0n) return undefined;
        const hfWad = (weightedCollateralUSD * 10n ** 18n) / newDebtUSD;
        return parseFloat(formatUnits(hfWad, 18));
      } else if (activeTab === 'repay') {
        if (amountUSD >= currentDebtUSD) return Infinity;
        const newDebtUSD = currentDebtUSD - amountUSD;
        if (newDebtUSD <= 0n) return Infinity;
        const hfWad = (weightedCollateralUSD * 10n ** 18n) / newDebtUSD;
        return parseFloat(formatUnits(hfWad, 18));
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [activeTab, amount, accountData, selectedAssetPrice, selectedAsset.decimals]);

  // Dynamic input validation
  const inputValidation = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return { isValid: false, error: undefined };
    try {
      const parsedAmount = parseUnits(amount, selectedAsset.decimals);
      if (parsedAmount <= 0n) return { isValid: false, error: undefined };

      if (activeTab === 'deposit') {
        if (walletBalance === undefined || walletBalance < parsedAmount) {
          return {
            isValid: false,
            error: `Insufficient ${selectedAsset.symbol} balance (${formatTokenAmount(walletBalance, selectedAsset.decimals)} available in wallet). Note: ERC-20 token is required.`,
          };
        }
      } else if (activeTab === 'withdraw') {
        if (collateral === undefined || collateral < parsedAmount) {
          return {
            isValid: false,
            error: `Amount exceeds supplied collateral (${formatTokenAmount(collateral, selectedAsset.decimals)} ${selectedAsset.symbol}).`,
          };
        }
        if (poolLiquidity !== undefined && poolLiquidity < parsedAmount) {
          return {
            isValid: false,
            error: `Exceeds available pool cash (${formatTokenAmount(poolLiquidity, selectedAsset.decimals)} ${selectedAsset.symbol}).`,
          };
        }
      } else if (activeTab === 'borrow') {
        if (!hasCollateral) {
          return {
            isValid: false,
            error: `Collateral required. Please deposit collateral first before borrowing.`,
          };
        }
        if (poolLiquidity !== undefined && poolLiquidity < parsedAmount) {
          return {
            isValid: false,
            error: `Exceeds available pool liquidity (${formatTokenAmount(poolLiquidity, selectedAsset.decimals)} ${selectedAsset.symbol} available).`,
          };
        }
        if (selectedAssetPrice && selectedAssetPrice > 0n) {
          const decimalsFactor = 10n ** BigInt(selectedAsset.decimals);
          const borrowUSD = (parsedAmount * selectedAssetPrice) / decimalsFactor;
          if (availableBorrowUSD !== undefined && borrowUSD > availableBorrowUSD) {
            return {
              isValid: false,
              error: `Exceeds your borrow capacity (${formatUSD(availableBorrowUSD)} max).`,
            };
          }
        }
        if (projectedHealthFactor !== undefined && projectedHealthFactor < 1.0) {
          return {
            isValid: false,
            error: `Borrow amount causes immediate liquidation risk (Projected HF: ${projectedHealthFactor.toFixed(2)} < 1.0).`,
          };
        }
      } else if (activeTab === 'repay') {
        if (walletBalance === undefined || walletBalance < parsedAmount) {
          return {
            isValid: false,
            error: `Insufficient ${selectedAsset.symbol} balance in wallet (${formatTokenAmount(walletBalance, selectedAsset.decimals)} available).`,
          };
        }
      }
      return { isValid: true, error: undefined };
    } catch {
      return { isValid: false, error: 'Invalid number format' };
    }
  }, [
    activeTab,
    amount,
    walletBalance,
    collateral,
    poolLiquidity,
    hasCollateral,
    selectedAssetPrice,
    availableBorrowUSD,
    projectedHealthFactor,
    selectedAsset.decimals,
    selectedAsset.symbol,
  ]);

  const needsApproval = useMemo(() => {
    if (activeTab !== 'deposit' && activeTab !== 'repay') return false;
    if (!amount || allowance === undefined) return false;
    try {
      const parsedAmount = parseUnits(amount, selectedAsset.decimals);
      if (parsedAmount <= 0n) return false;
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
        return maxBorrowTokens > 0n ? formatUnits(maxBorrowTokens, selectedAsset.decimals) : '0';
      case 'repay':
        return maxRepayTokens > 0n ? formatUnits(maxRepayTokens, selectedAsset.decimals) : '0';
      default:
        return '0';
    }
  }, [activeTab, walletBalance, collateral, maxBorrowTokens, maxRepayTokens, selectedAsset.decimals]);

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
    if (activeTab === 'borrow') {
      if (!hasCollateral) return 'Collateral Required';
      if (projectedHealthFactor !== undefined && projectedHealthFactor < 1.0) {
        return 'Health Factor Too Low (< 1.0)';
      }
      return 'Borrow Asset';
    }
    if (activeTab === 'repay') {
      if (!hasDebt) return 'No Active Debt';
      if (amount && parseUnits(amount, selectedAsset.decimals) >= userDebt) {
        return 'Repay Full Loan';
      }
      return 'Repay Loan';
    }
    const labels: Record<TabId, string> = {
      deposit: 'Deposit Collateral',
      withdraw: 'Withdraw Collateral',
      borrow: 'Borrow Asset',
      repay: 'Repay Loan',
    };
    return labels[activeTab];
  }, [activeTab, needsApproval, hasCollateral, hasDebt, projectedHealthFactor, selectedAsset.symbol, amount, userDebt, selectedAsset.decimals]);

  // Tab Keyboard Navigation (WCAG compliance)
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight') {
      nextIdx = (currentIdx + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(TABS[nextIdx].id);
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIdx]?.focus();
  };

  // ── Not Connected State ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-paper-100 border border-paper-200">
            <Wallet className="h-6 w-6 text-signal" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-display text-ink-900">
              Connect Web3 Wallet
            </h1>
            <p className="text-xs text-ink-600 leading-relaxed">
              Connect your account to supply collateral, draw borrowing lines with block-by-block compounding, and track your ledger health.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected Dashboard ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-900">
          Markets & Lending Desk
        </h1>
        <p className="text-xs text-ink-600 mt-0.5">
          Real-time multi-asset liquidity pools, automated risk monitoring, and instantaneous collateral execution.
        </p>
      </div>

      {/* Health Factor Warning Banner */}
      <AnimatePresence>
        {healthFactorNum !== undefined && healthFactorNum < 1.5 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={clsx(
              'rounded-md border p-3 flex items-center gap-2.5 text-xs',
              healthFactorNum < 1.0
                ? 'bg-danger/8 border-danger/25 text-danger'
                : 'bg-caution/8 border-caution/25 text-caution',
            )}
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {healthFactorNum < 1.0 ? (
                <>
                  <strong>Liquidation Warning:</strong> Your health factor is below 1.0. Your position can be liquidated immediately. Repay debt or supply collateral now.
                </>
              ) : (
                <>
                  <strong>Position Caution:</strong> Your health factor is approaching liquidation risk (below 1.5). Consider supplying collateral or repaying debt.
                </>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Statement (Ledger Row Pattern) */}
      {accountError ? (
        <ErrorState
          title="Unable to load account statistics"
          description="Failed to retrieve your position data from the LendingPool contract."
          onRetry={() => refetchAccount()}
        />
      ) : (
        <LedgerGroup title="Account Ledger Statement">
          <LedgerRow
            label="Total Collateral Value"
            value={formatUSD(accountData?.[0])}
            loading={accountLoading}
            change="Supplied"
            changeType="positive"
          />
          <LedgerRow
            label="Total Outstanding Borrows"
            value={formatUSD(accountData?.[1])}
            loading={accountLoading}
            change="Active Debt"
            changeType={accountData?.[1] && accountData[1] > 0n ? 'negative' : 'neutral'}
          />
          <LedgerRow
            label="Available Borrow Capacity"
            value={formatUSD(accountData?.[2])}
            loading={accountLoading}
          />
          <LedgerRow
            label="Net Compounding APY"
            loading={accountLoading}
            value={netApy === 0 ? '0.00%' : `${netApy > 0 ? '+' : ''}${netApy.toFixed(2)}%`}
            change={netApyLabel}
            changeType={netApyType}
          />
        </LedgerGroup>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2/3: Market Overview & Health Dial */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Factor Dial Card */}
          <Card
            header={
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                Position Health Factor Dial
              </h2>
            }
          >
            <HealthFactorDisplay healthFactor={healthFactor} />
          </Card>

          {/* Market Pools Table */}
          <Card
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                  Market Liquidity Pools
                </h2>
                <Badge variant="info" dot>
                  {assets.length} Active
                </Badge>
              </div>
            }
          >
            <div className="space-y-1">
              {/* Table Header */}
              <div className="hidden sm:grid sm:grid-cols-6 gap-3 px-3 py-2 text-[10px] font-mono font-medium text-ink-600 uppercase tracking-wider border-b border-paper-200">
                <span className="col-span-2">Asset</span>
                <span className="text-right">Deposit APY</span>
                <span className="text-right">Borrow APY</span>
                <span className="text-right">Collateral</span>
                <span className="text-right">Borrows</span>
              </div>

              {/* Asset Rows */}
              {assets.map((asset, idx) => (
                <AssetRow
                  key={asset.address}
                  asset={asset}
                  isSelected={selectedAssetIdx === idx}
                  onSelect={() => setSelectedAssetIdx(idx)}
                  userAddress={address}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Right 1/3: Interactive Action Desk (The ONE surface with soft shadow) */}
        <div className="lg:col-span-1">
          <div className="action-panel p-5 sticky top-24 space-y-4">
            <div className="border-b border-paper-200 pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
                Action Desk
              </h2>
            </div>

            {/* Tab Navigation */}
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="Market action tabs"
              className="flex rounded-md bg-paper-200/70 p-1"
            >
              {TABS.map((tab, idx) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`tabpanel-${tab.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium cursor-pointer',
                      'transition-colors duration-150 min-h-[34px]',
                      isSelected
                        ? 'bg-signal text-white font-semibold shadow-xs'
                        : 'text-ink-600 hover:text-ink-900',
                    )}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Asset Selector */}
            <div className="flex gap-2" role="group" aria-label="Select target asset">
              {assets.map((asset, idx) => (
                <button
                  key={asset.address}
                  type="button"
                  onClick={() => setSelectedAssetIdx(idx)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold cursor-pointer',
                    'border transition-colors duration-150 min-h-[36px]',
                    selectedAssetIdx === idx
                      ? 'border-signal bg-signal/8 text-signal'
                      : 'border-paper-200 bg-paper-100 text-ink-600 hover:bg-paper-200',
                  )}
                  aria-pressed={selectedAssetIdx === idx}
                >
                  <TokenIcon symbol={asset.symbol} size="sm" />
                  <span className="font-mono">{asset.symbol}</span>
                </button>
              ))}
            </div>

            {/* Action Form Tab Panel */}
            <div
              id={`tabpanel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="space-y-3"
            >
              {/* Zero-Collateral State on Borrow */}
              {activeTab === 'borrow' && !hasCollateral ? (
                <div className="rounded-lg border border-caution/30 bg-caution/5 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-caution shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-ink-900 font-mono uppercase tracking-wider">
                        Collateral Required
                      </h3>
                      <p className="text-xs text-ink-600 leading-relaxed">
                        You have not supplied any collateral yet ($0.00). Lending protocols require depositing collateral (such as WETH or USDC) to unlock borrow power.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={() => setActiveTab('deposit')}
                  >
                    <span>Deposit Collateral First</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : activeTab === 'repay' && !hasDebt ? (
                /* Zero-Debt State on Repay */
                <div className="rounded-lg border border-paper-200 bg-paper-50 p-5 text-center space-y-3">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-safe/10 text-safe">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-ink-900 font-mono">
                      No Outstanding {selectedAsset.symbol} Debt
                    </h3>
                    <p className="text-xs text-ink-600 max-w-xs mx-auto">
                      You do not owe any {selectedAsset.symbol} loans. Your position is completely debt-free for this asset.
                    </p>
                  </div>
                  {hasCollateral && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mx-auto"
                      onClick={() => setActiveTab('borrow')}
                    >
                      Borrow {selectedAsset.symbol}
                    </Button>
                  )}
                </div>
              ) : (
                /* Standard Action Form */
                <>
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
                    error={inputValidation.error}
                    helperText={
                      activeTab === 'borrow'
                        ? `Max Borrow: ${formatTokenAmount(maxBorrowTokens, selectedAsset.decimals)} ${selectedAsset.symbol} (${formatUSD(availableBorrowUSD)} capacity)`
                        : activeTab === 'repay'
                        ? `Max Repay: ${formatTokenAmount(maxRepayTokens, selectedAsset.decimals)} ${selectedAsset.symbol} (${formatTokenAmount(borrows, selectedAsset.decimals)} total debt)`
                        : `Available: ${formatTokenAmount(
                            parseUnits(maxBalance || '0', selectedAsset.decimals),
                            selectedAsset.decimals,
                          )} ${selectedAsset.symbol}`
                    }
                  />

                  {/* Dynamic Rate & Risk Info Box */}
                  <div className="rounded bg-paper-50 p-2.5 border border-paper-200 text-xs font-mono space-y-1.5">
                    {activeTab === 'deposit' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-ink-600">Deposit APY</span>
                          <span className="text-safe font-bold">{currentDepositAPY.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Wallet Balance</span>
                          <span className="text-ink-900">
                            {formatTokenAmount(walletBalance, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                      </>
                    )}

                    {activeTab === 'withdraw' && (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Supplied Collateral</span>
                          <span className="text-ink-900 font-bold">
                            {formatTokenAmount(collateral, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Pool Available Cash</span>
                          <span className="text-ink-900">
                            {formatTokenAmount(poolLiquidity, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                      </>
                    )}

                    {activeTab === 'borrow' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-ink-600">Borrow APY</span>
                          <span className="text-ink-900 font-bold">{currentBorrowAPY.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Pool Liquidity</span>
                          <span className="text-ink-900 font-medium">
                            {formatTokenAmount(poolLiquidity, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Borrow Power</span>
                          <span className="text-ink-900 font-medium">{formatUSD(availableBorrowUSD)}</span>
                        </div>
                        {projectedHealthFactor !== undefined && (
                          <div className="pt-1 border-t border-paper-200/80 flex justify-between items-center text-[11px]">
                            <span className="text-ink-600">Projected Health Factor</span>
                            <span
                              className={clsx(
                                'font-bold font-mono px-1.5 py-0.5 rounded text-[10px]',
                                projectedHealthFactor < 1.0
                                  ? 'bg-danger/10 text-danger'
                                  : projectedHealthFactor < 1.5
                                  ? 'bg-caution/10 text-caution'
                                  : 'bg-safe/10 text-safe',
                              )}
                            >
                              {healthFactorNum !== undefined && healthFactorNum < 1000
                                ? healthFactorNum.toFixed(2)
                                : '∞'}{' '}
                              → {projectedHealthFactor.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'repay' && (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Outstanding Debt</span>
                          <span className="text-danger font-bold">
                            {formatTokenAmount(borrows, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-ink-600">Wallet Balance</span>
                          <span className="text-ink-900">
                            {formatTokenAmount(walletBalance, selectedAsset.decimals)} {selectedAsset.symbol}
                          </span>
                        </div>
                        {amount && borrows && parseUnits(amount, selectedAsset.decimals) >= borrows && (
                          <div className="pt-1 border-t border-paper-200/80 flex justify-between items-center text-[11px]">
                            <span className="text-ink-600">Loan Status</span>
                            <span className="bg-safe/10 text-safe font-bold px-1.5 py-0.5 rounded text-[10px]">
                              Full Debt Payoff
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    variant={needsApproval ? 'secondary' : 'primary'}
                    size="md"
                    className="w-full"
                    loading={isSubmitting || approvalHook.isPending}
                    disabled={
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      !inputValidation.isValid ||
                      (activeTab === 'borrow' && (!hasCollateral || (projectedHealthFactor !== undefined && projectedHealthFactor < 1.0))) ||
                      (activeTab === 'repay' && !hasDebt)
                    }
                    onClick={
                      needsApproval
                        ? () => approvalHook.approve()
                        : handleSubmit
                    }
                  >
                    {isSubmitting ? 'Confirming...' : submitLabel}
                  </Button>
                </>
              )}

              {/* Transaction Errors */}
              {(depositHook.error || withdrawHook.error || borrowHook.error || repayHook.error || approvalHook.error) && (
                <div className="rounded bg-danger/8 border border-danger/25 p-2.5 text-xs text-danger flex items-start gap-1.5" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="truncate">
                    <span className="font-bold">Failed: </span>
                    <span>
                      {depositHook.error?.message ||
                        withdrawHook.error?.message ||
                        borrowHook.error?.message ||
                        repayHook.error?.message ||
                        approvalHook.error?.message ||
                        'Action reverted by protocol'}
                    </span>
                  </div>
                </div>
              )}

              {/* Success Banner */}
              <AnimatePresence>
                {(depositHook.isSuccess ||
                  withdrawHook.isSuccess ||
                  borrowHook.isSuccess ||
                  repayHook.isSuccess ||
                  approvalHook.isSuccess) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded bg-safe/10 border border-safe/25 p-2.5 text-center text-xs text-safe font-medium"
                  >
                    Transaction Confirmed on Chain
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Asset Row Sub-Component ───────────────────────────────────────────

interface AssetRowProps {
  asset: {
    address: `0x${string}`;
    symbol: string;
    name: string;
    decimals: number;
    color?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  userAddress: `0x${string}` | undefined;
}

function AssetRow({ asset, isSelected, onSelect, userAddress }: AssetRowProps) {
  const { data: collateral } = useUserCollateral(userAddress, asset.address);
  const { data: borrows } = useUserBorrows(userAddress, asset.address);

  const { data: assetData } = useAssetData(asset.address);
  const depositRatePerBlock = assetData?.[2] ?? 0n;
  const borrowRatePerBlock = assetData?.[3] ?? 0n;

  const depositAPY = formatAPY(depositRatePerBlock);
  const borrowAPY = formatAPY(borrowRatePerBlock);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={clsx(
        'w-full grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4 items-center',
        'rounded px-3 py-2.5 text-left cursor-pointer select-none',
        'transition-colors duration-100',
        isSelected
          ? 'bg-signal/8 border border-signal/30'
          : 'hover:bg-paper-200/60 border border-transparent',
      )}
    >
      {/* Asset Info */}
      <div className="col-span-2 flex items-center gap-2.5">
        <TokenIcon symbol={asset.symbol} size="sm" />
        <div>
          <p className="text-xs font-semibold text-ink-900 font-mono">{asset.symbol}</p>
          <p className="text-[10px] text-ink-600">{asset.name}</p>
        </div>
      </div>

      {/* Deposit APY */}
      <div className="text-right">
        <p className="text-[10px] text-ink-600 sm:hidden">Deposit APY</p>
        <p className="text-xs font-mono font-medium text-safe">{depositAPY}</p>
      </div>

      {/* Borrow APY */}
      <div className="text-right">
        <p className="text-[10px] text-ink-600 sm:hidden">Borrow APY</p>
        <p className="text-xs font-mono font-medium text-ink-900">{borrowAPY}</p>
      </div>

      {/* Your Deposits */}
      <div className="text-right">
        <p className="text-[10px] text-ink-600 sm:hidden">Collateral</p>
        <p className="text-xs font-mono font-medium text-ink-900">
          {formatTokenAmount(collateral, asset.decimals)}
        </p>
      </div>

      {/* Your Borrows */}
      <div className="text-right">
        <p className="text-[10px] text-ink-600 sm:hidden">Borrows</p>
        <p className="text-xs font-mono font-medium text-ink-900">
          {formatTokenAmount(borrows, asset.decimals)}
        </p>
      </div>
    </div>
  );
}
