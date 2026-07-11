import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { LENDING_POOL_ABI, CONTRACTS } from '../config/abis';

const lendingPoolConfig = {
  address: CONTRACTS.lendingPool,
  abi: LENDING_POOL_ABI,
} as const;

// ── Read Hooks ────────────────────────────────────────────────────────

export function useUserHealthFactor(userAddress: `0x${string}` | undefined) {
  return useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserHealthFactor',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 12_000, // every ~1 block
    },
  });
}

export function useUserCollateral(
  userAddress: `0x${string}` | undefined,
  asset: `0x${string}` | undefined,
) {
  return useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserCollateral',
    args: userAddress && asset ? [userAddress, asset] : undefined,
    query: {
      enabled: !!userAddress && !!asset,
      refetchInterval: 12_000,
    },
  });
}

export function useUserBorrows(
  userAddress: `0x${string}` | undefined,
  asset: `0x${string}` | undefined,
) {
  return useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserBorrows',
    args: userAddress && asset ? [userAddress, asset] : undefined,
    query: {
      enabled: !!userAddress && !!asset,
      refetchInterval: 12_000,
    },
  });
}

export function useUserAccountData(userAddress: `0x${string}` | undefined) {
  return useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserAccountData',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 12_000,
    },
  });
}

export function useAssetData(asset: `0x${string}` | undefined) {
  return useReadContract({
    ...lendingPoolConfig,
    functionName: 'getAssetData',
    args: asset ? [asset] : undefined,
    query: {
      enabled: !!asset,
      refetchInterval: 15_000,
    },
  });
}

// ── Write Hooks ───────────────────────────────────────────────────────

export function useDeposit() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (asset: `0x${string}`, amount: string, decimals: number = 18) => {
    writeContract({
      ...lendingPoolConfig,
      functionName: 'deposit',
      args: [asset, parseUnits(amount, decimals)],
    });
  };

  return { deposit, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (asset: `0x${string}`, amount: string, decimals: number = 18) => {
    writeContract({
      ...lendingPoolConfig,
      functionName: 'withdraw',
      args: [asset, parseUnits(amount, decimals)],
    });
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useBorrow() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const borrow = (asset: `0x${string}`, amount: string, decimals: number = 18) => {
    writeContract({
      ...lendingPoolConfig,
      functionName: 'borrow',
      args: [asset, parseUnits(amount, decimals)],
    });
  };

  return { borrow, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useRepay() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const repay = (asset: `0x${string}`, amount: string, decimals: number = 18) => {
    writeContract({
      ...lendingPoolConfig,
      functionName: 'repay',
      args: [asset, parseUnits(amount, decimals)],
    });
  };

  return { repay, hash, isPending, isConfirming, isSuccess, error, reset };
}
