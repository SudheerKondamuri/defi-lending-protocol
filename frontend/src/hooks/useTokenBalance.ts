import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { maxUint256 } from 'viem';
import { ERC20_ABI } from '../config/abis';

/**
 * Read the ERC-20 balance of a user for a given token.
 */
export function useTokenBalance(
  tokenAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined,
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      refetchInterval: 12_000,
    },
  });
}

/**
 * Read the ERC-20 allowance a user has granted to a spender.
 */
export function useTokenAllowance(
  tokenAddress: `0x${string}` | undefined,
  ownerAddress: `0x${string}` | undefined,
  spenderAddress: `0x${string}` | undefined,
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
      refetchInterval: 15_000,
    },
  });
}

/**
 * Read the ERC-20 token symbol.
 */
export function useTokenSymbol(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * Read the ERC-20 token decimals.
 */
export function useTokenDecimals(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * Approve a spender to spend max (or specific) amount of tokens.
 */
export function useTokenApproval(
  tokenAddress: `0x${string}` | undefined,
  spenderAddress: `0x${string}` | undefined,
) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount?: bigint) => {
    if (!tokenAddress || !spenderAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount ?? maxUint256],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error, reset };
}
