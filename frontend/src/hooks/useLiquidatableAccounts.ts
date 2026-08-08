import { useState, useEffect } from 'react';
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
}

export function useLiquidatableAccounts() {
  const publicClient = usePublicClient();
  const [accounts, setAccounts] = useState<BorrowerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!publicClient) return;

    async function fetchAccounts() {
      setIsLoading(true);
      try {
        // 1. Find all users who ever borrowed
        const borrowLogs = await publicClient!.getLogs({
          address: CONTRACTS.lendingPool,
          event: parseAbiItem('event Borrow(address indexed user, address indexed asset, uint256 amount)'),
          fromBlock: 'earliest',
        });

        const uniqueUsers = Array.from(new Set(borrowLogs.map((log) => log.args.user as `0x${string}`)));

        const results: BorrowerAccount[] = [];

        // 2. Fetch data for each user
        for (const user of uniqueUsers) {
          if (!user) continue;

          // Fetch account data
          const accountData = await publicClient!.readContract({
            address: CONTRACTS.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getUserAccountData',
            args: [user],
          }) as [bigint, bigint, bigint, bigint, bigint, bigint];

          const healthFactor = Number(accountData[5]) / 1e18;

          // Fetch specific balances to guess primary collateral/debt
          const wethCollateral = await publicClient!.readContract({
            address: CONTRACTS.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getUserCollateral',
            args: [user, CONTRACTS.weth],
          }) as bigint;

          const usdcBorrows = await publicClient!.readContract({
            address: CONTRACTS.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getUserBorrows',
            args: [user, CONTRACTS.usdc],
          }) as bigint;
          
          const wethBorrows = await publicClient!.readContract({
            address: CONTRACTS.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getUserBorrows',
            args: [user, CONTRACTS.weth],
          }) as bigint;

          const usdcCollateral = await publicClient!.readContract({
            address: CONTRACTS.lendingPool,
            abi: LENDING_POOL_ABI,
            functionName: 'getUserCollateral',
            args: [user, CONTRACTS.usdc],
          }) as bigint;

          // Determine primary collateral and debt for UI
          let colAsset = 'WETH';
          let colAddress = CONTRACTS.weth;
          let colVal = parseFloat(formatUnits(wethCollateral, 18));
          if (usdcCollateral > wethCollateral) {
            colAsset = 'USDC';
            colAddress = CONTRACTS.usdc;
            colVal = parseFloat(formatUnits(usdcCollateral, 6));
          }

          let debtAsset = 'USDC';
          let debtAddress = CONTRACTS.usdc;
          let debtDecimals = 6;
          let rawDebt = usdcBorrows;
          if (wethBorrows > usdcBorrows) {
            debtAsset = 'WETH';
            debtAddress = CONTRACTS.weth;
            debtDecimals = 18;
            rawDebt = wethBorrows;
          }
          
          let debtVal = parseFloat(formatUnits(rawDebt, debtDecimals));

          // Max debt to cover is 50% of the debt
          const maxCover = rawDebt / 2n;

          results.push({
            address: user,
            collateralAsset: colAsset,
            collateralAddress: colAddress,
            collateralValue: colVal, // in native units for simplicity, or we could fetch price.
            debtAsset: debtAsset,
            debtAddress: debtAddress,
            debtValue: debtVal,
            healthFactor: healthFactor,
            maxDebtToCover: formatUnits(maxCover, debtDecimals),
            decimals: debtDecimals,
          });
        }

        setAccounts(results);
      } catch (error) {
        console.error('Failed to fetch liquidatable accounts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
    // Re-run periodically or rely on mount
    const interval = setInterval(fetchAccounts, 15000);
    return () => clearInterval(interval);
  }, [publicClient]);

  return { accounts, isLoading };
}
