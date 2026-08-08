import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS, GOVERNOR_ABI, GOVERNANCE_TOKEN_ABI } from '../config/abis';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  endBlock: number;
}

const STATE_MAP: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed',
};

export function useGovernanceProposals() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['governance-proposals'],
    queryFn: async () => {
      if (!publicClient) return [];
      
      const logs = await publicClient.getLogs({
        address: CONTRACTS.governor,
        event: parseAbiItem(
          'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'
        ),
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const proposals: Proposal[] = await Promise.all(
        logs.map(async (log) => {
          const { proposalId, description, voteEnd } = log.args;
          const id = proposalId!.toString();
          
          // Get title from description (first line)
          const title = description?.split('\n')[0] || 'Unknown Proposal';
          
          // Read state
          const stateData = await publicClient.readContract({
            address: CONTRACTS.governor,
            abi: GOVERNOR_ABI,
            functionName: 'state',
            args: [proposalId!],
          });
          
          // Read votes
          const votesData = await publicClient.readContract({
            address: CONTRACTS.governor,
            abi: GOVERNOR_ABI,
            functionName: 'proposalVotes',
            args: [proposalId!],
          }) as [bigint, bigint, bigint];
          
          return {
            id,
            title,
            description: description || '',
            status: STATE_MAP[stateData] || 'Unknown',
            votesAgainst: Number(votesData[0] / 10n**18n),
            votesFor: Number(votesData[1] / 10n**18n),
            endBlock: Number(voteEnd!),
          };
        })
      );
      
      return proposals.reverse(); // newest first
    },
    enabled: !!publicClient,
  });
}

export function useGovernance() {
  const { address } = useAccount();

  // Get voting power
  const { data: votingPowerData } = useReadContract({
    address: CONTRACTS.govToken,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'getVotes',
    args: [address!],
    query: { enabled: !!address },
  });

  const { writeContractAsync: castVoteAsync, isPending: isVoting } = useWriteContract();

  const castVote = async (proposalId: string, support: boolean) => {
    return castVoteAsync({
      address: CONTRACTS.governor,
      abi: GOVERNOR_ABI,
      functionName: 'castVote',
      args: [BigInt(proposalId), support ? 1 : 0],
    });
  };

  return {
    votingPower: votingPowerData ? Number(votingPowerData / 10n**18n) : 0,
    castVote,
    isVoting,
  };
}
