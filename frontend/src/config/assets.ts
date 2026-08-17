import { useReadContract } from 'wagmi';
import { CONTRACTS, LENDING_POOL_ABI } from './abis';

export interface AssetConfig {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  color?: string;
}

export const ASSET_METADATA: Record<string, Omit<AssetConfig, 'address'>> = {
  [CONTRACTS.weth.toLowerCase()]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    color: '#627EEA',
  },
  [CONTRACTS.usdc.toLowerCase()]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    color: '#2775CA',
  },
};

export const DEFAULT_ASSETS: AssetConfig[] = [
  {
    address: CONTRACTS.weth,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    color: '#627EEA',
  },
  {
    address: CONTRACTS.usdc,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    color: '#2775CA',
  },
];

/**
 * Hook to retrieve supported assets from contract with fallback to default assets.
 */
export function useSupportedAssets(): { assets: AssetConfig[]; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useReadContract({
    address: CONTRACTS.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: 'getSupportedAssets',
  });

  if (isLoading) {
    return { assets: DEFAULT_ASSETS, isLoading: true, isError: false };
  }

  if (isError || !data || !Array.isArray(data) || data.length === 0) {
    return { assets: DEFAULT_ASSETS, isLoading: false, isError: !!isError };
  }

  const assets: AssetConfig[] = data.map((addr) => {
    const lower = addr.toLowerCase();
    const meta = ASSET_METADATA[lower];
    if (meta) {
      return {
        address: addr as `0x${string}`,
        ...meta,
      };
    }
    return {
      address: addr as `0x${string}`,
      symbol: `${addr.slice(0, 6)}...`,
      name: 'Unknown Asset',
      decimals: 18,
      color: '#8251EE',
    };
  });

  return { assets, isLoading: false, isError: false };
}
