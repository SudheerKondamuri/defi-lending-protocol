import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACTS, LENDING_POOL_ABI } from '../config/abis';

export interface BorrowerAccount {
  address: `0x${string}`;
  collateralAsset: string;
  collateralAddress: `0x${string}`;
  collateralValue: number;
  debtAsset: string;
  debtAddress: `0x${string}`;
  debtValue: number;
  healthFactor: number;
  maxDebtToCover: string;
  decimals: number;
  bonusPct: number;
}

export function useLiquidatableAccounts() {
  const publicClient = usePublicClient();
  const [accounts, setAccounts] = useState<BorrowerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!publicClient) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // Fetch asset configs for liquidation bonus
      const [wethConfig, usdcConfig] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.lendingPool,
          abi: LENDING_POOL_ABI,
          functionName: 'assetConfigs',
          args: [CONTRACTS.weth],
        }) as unknown as Promise<[bigint, bigint, bigint, number, boolean]>,
        publicClient.readContract({
          address: CONTRACTS.lendingPool,
          abi: LENDING_POOL_ABI,
          functionName: 'assetConfigs',
          args: [CONTRACTS.usdc],
        }) as unknown as Promise<[bigint, bigint, bigint, number, boolean]>,
      ]);

      const wethBonus = parseFloat(formatUnits(wethConfig[1] ?? 50000000000000000n, 18)) * 100;
      const usdcBonus = parseFloat(formatUnits(usdcConfig[1] ?? 50000000000000000n, 18)) * 100;

      // 1. Find all users who ever borrowed
      const borrowLogs = await publicClient.getLogs({
        address: CONTRACTS.lendingPool,
        event: parseAbiItem('event Borrow(address indexed user, address indexed asset, uint256 amount)'),
        fromBlock: 'earliest',
      });

      const uniqueUsers = Array.from(
        new Set(
          borrowLogs
            .map((log) => log.args.user as `0x${string}` | undefined)
            .filter((user): user is `0x${string}` => !!user),
        ),
      );

      // 2. Fetch data in parallel for all users
      const results = await Promise.all(
        uniqueUsers.map(async (user): Promise<BorrowerAccount | null> => {
          try {
            const [accountData, wethPositions, usdcPositions, wethDebt, usdcDebt] = await Promise.all([
              publicClient.readContract({
                address: CONTRACTS.lendingPool,
                abi: LENDING_POOL_ABI,
                functionName: 'getUserAccountData',
                args: [user],
              }) as Promise<readonly [bigint, bigint, bigint, bigint]>,
              publicClient.readContract({
                address: CONTRACTS.lendingPool,
                abi: LENDING_POOL_ABI,
                functionName: 'userPositions',
                args: [user, CONTRACTS.weth],
              }) as Promise<[bigint, bigint, bigint]>,
              publicClient.readContract({
                address: CONTRACTS.lendingPool,
                abi: LENDING_POOL_ABI,
                functionName: 'userPositions',
                args: [user, CONTRACTS.usdc],
              }) as Promise<[bigint, bigint, bigint]>,
              publicClient.readContract({
                address: CONTRACTS.lendingPool,
                abi: LENDING_POOL_ABI,
                functionName: 'getUserDebt',
                args: [user, CONTRACTS.weth],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: CONTRACTS.lendingPool,
                abi: LENDING_POOL_ABI,
                functionName: 'getUserDebt',
                args: [user, CONTRACTS.usdc],
              }) as Promise<bigint>,
            ]);

            const healthFactor = Number(accountData[3]) / 1e18;
            const wethCollateral = wethPositions[0];
            const usdcCollateral = usdcPositions[0];

            // Primary collateral asset
            let colAsset = 'WETH';
            let colAddress = CONTRACTS.weth;
            let colVal = parseFloat(formatUnits(wethCollateral, 18));
            if (usdcCollateral > wethCollateral) {
              colAsset = 'USDC';
              colAddress = CONTRACTS.usdc;
              colVal = parseFloat(formatUnits(usdcCollateral, 6));
            }

            // Primary debt asset
            let debtAsset = 'USDC';
            let debtAddress = CONTRACTS.usdc;
            let debtDecimals = 6;
            let rawDebt = usdcDebt;
            if (wethDebt > usdcDebt) {
              debtAsset = 'WETH';
              debtAddress = CONTRACTS.weth;
              debtDecimals = 18;
              rawDebt = wethDebt;
            }

            const debtVal = parseFloat(formatUnits(rawDebt, debtDecimals));
            const maxCover = rawDebt / 2n;

            const bonusPct = colAsset === 'WETH' ? wethBonus : usdcBonus;

            return {
              address: user,
              collateralAsset: colAsset,
              collateralAddress: colAddress,
              collateralValue: colVal,
              debtAsset: debtAsset,
              debtAddress: debtAddress,
              debtValue: debtVal,
              healthFactor: healthFactor,
              maxDebtToCover: formatUnits(maxCover, debtDecimals),
              decimals: debtDecimals,
              bonusPct: bonusPct,
            };
          } catch (e) {
            console.warn(`Could not read borrower state for ${user}:`, e);
            return null;
          }
        }),
      );

      setAccounts(results.filter((a): a is BorrowerAccount => a !== null));
    } catch (error) {
      console.error('Failed to fetch liquidatable accounts:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 20000);
    return () => clearInterval(interval);
  }, [fetchAccounts]);

  return { accounts, isLoading, isError, refetch: fetchAccounts };
}
