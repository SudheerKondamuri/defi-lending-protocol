import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACTS } from '../config/abis';

export interface ActivityLog {
  type: string;
  asset: string;
  amount: string;
  tx: string;
  timestamp: number;
}

export function useUserActivityLogs(userAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userAddress || !publicClient) return;

    async function fetchLogs() {
      setIsLoading(true);
      try {
        const fromBlock = 'earliest'; // Or a specific block to avoid fetching too far back
        
        const eventSignatures = [
          { type: 'Deposit', abiItem: parseAbiItem('event Deposit(address indexed user, address indexed asset, uint256 amount)') },
          { type: 'Withdraw', abiItem: parseAbiItem('event Withdraw(address indexed user, address indexed asset, uint256 amount)') },
          { type: 'Borrow', abiItem: parseAbiItem('event Borrow(address indexed user, address indexed asset, uint256 amount)') },
          { type: 'Repay', abiItem: parseAbiItem('event Repay(address indexed user, address indexed asset, uint256 amount)') }
        ];

        let allLogs: any[] = [];
        for (const { type, abiItem } of eventSignatures) {
          const fetched = await publicClient!.getLogs({
            address: CONTRACTS.lendingPool,
            event: abiItem,
            args: { user: userAddress },
            fromBlock,
          });
          
          allLogs = allLogs.concat(
            fetched.map(l => ({ ...l, actionType: type }))
          );
        }

        // Fetch block timestamps (could be slow if many logs, but okay for local testing)
        // Group by block to minimize RPC calls
        const blockCache: Record<string, bigint> = {};
        const formattedLogs: ActivityLog[] = [];

        for (const log of allLogs) {
          const blockNum = log.blockNumber?.toString();
          if (blockNum && !blockCache[blockNum]) {
            const block = await publicClient!.getBlock({ blockNumber: log.blockNumber! });
            blockCache[blockNum] = block.timestamp;
          }
          
          let assetSymbol = 'Unknown';
          let decimals = 18;
          if (log.args.asset.toLowerCase() === CONTRACTS.weth.toLowerCase()) {
            assetSymbol = 'WETH';
          } else if (log.args.asset.toLowerCase() === CONTRACTS.usdc.toLowerCase()) {
            assetSymbol = 'USDC';
            decimals = 6;
          }

          formattedLogs.push({
            type: log.actionType,
            asset: assetSymbol,
            amount: parseFloat(formatUnits(log.args.amount ?? 0n, decimals)).toFixed(4),
            tx: log.transactionHash ?? '',
            timestamp: Number(blockCache[blockNum || '0'] ?? 0n) * 1000,
          });
        }

        // Sort by timestamp descending
        formattedLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(formattedLogs);

      } catch (error) {
        console.error('Error fetching logs', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [userAddress, publicClient]);

  return { logs, isLoading };
}
