import { useState } from 'react';
import { Landmark, Award, Inbox, Vote, ThumbsUp, ThumbsDown } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const MOCK_PROPOSALS = [
  {
    id: 1,
    title: 'DIP-01: Increase USDC Liquidation Threshold to 85%',
    description: 'Adjust risk parameters to improve borrowing power for stablecoin depositors.',
    status: 'Active',
    votesFor: 1294000,
    votesAgainst: 284000,
    endBlock: 18491024,
  },
  {
    id: 2,
    title: 'DIP-02: Deploy InterestRateModel V2 to Arbitrum',
    description: 'Upgrade kink curve parameters to adjust utilization rates for Arbitrum deployment.',
    status: 'Succeeded',
    votesFor: 2500000,
    votesAgainst: 130000,
    endBlock: 18471200,
  },
];

export default function Governance() {
  const [proposals, setProposals] = useState(MOCK_PROPOSALS);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [votingPower] = useState(15000); // mock power

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId);

  const handleVote = (support: boolean) => {
    if (!selectedProposalId) return;
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProposalId) return p;
        return {
          ...p,
          votesFor: support ? p.votesFor + votingPower : p.votesFor,
          votesAgainst: !support ? p.votesAgainst + votingPower : p.votesAgainst,
        };
      })
    );
    alert('Vote cast successfully!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">DAO Governance</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Propose modifications and vote on risk thresholds, models, and upgrades.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              My Voting Power
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {votingPower.toLocaleString()} PRT
            </div>
          </div>
          <Award className="h-8 w-8 text-brand-light opacity-80" />
        </Card>

        <Card className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              Total Delegated Power
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              12,492,015 PRT
            </div>
          </div>
          <Vote className="h-8 w-8 text-info opacity-80" />
        </Card>

        <Card className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              Active Proposals
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {proposals.filter((p) => p.status === 'Active').length}
            </div>
          </div>
          <Inbox className="h-8 w-8 text-success opacity-80" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposal List */}
        <Card className="glass-card lg:col-span-2 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark className="h-4 w-4 text-brand-light" />
            Governance Proposals
          </h3>

          <div className="space-y-3">
            {proposals.map((proposal) => {
              const totalVotes = proposal.votesFor + proposal.votesAgainst || 1;
              const forPct = Math.round((proposal.votesFor / totalVotes) * 100);
              return (
                <div
                  key={proposal.id}
                  onClick={() => setSelectedProposalId(proposal.id)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedProposalId === proposal.id
                      ? 'bg-brand/10 border-brand/40 shadow-md'
                      : 'bg-bg-3/30 border-border-subtle hover:border-brand/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        proposal.status === 'Active'
                          ? 'bg-success/15 text-success'
                          : 'bg-info/15 text-info'
                      }`}
                    >
                      {proposal.status}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      End block: {proposal.endBlock}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-2">
                    {proposal.title}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {proposal.description}
                  </p>

                  {/* Vote slider bar */}
                  <div className="mt-4 space-y-1">
                    <div className="h-1.5 w-full bg-bg-4 rounded-full overflow-hidden flex">
                      <div className="h-full bg-success" style={{ width: `${forPct}%` }} />
                      <div className="h-full bg-error flex-1" />
                    </div>
                    <div className="flex justify-between text-[9px] text-text-muted font-mono">
                      <span>For: {forPct}%</span>
                      <span>Against: {100 - forPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Voting Drawer Console */}
        <Card className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Vote className="h-4 w-4 text-brand-light" />
              Voting Console
            </h3>

            {selectedProposal ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white">{selectedProposal.title}</h4>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {selectedProposal.description}
                  </p>
                </div>

                <div className="bg-bg-3/40 rounded-xl p-3 border border-border-subtle space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-secondary">My Power</span>
                    <span className="font-mono text-white font-bold">{votingPower.toLocaleString()} PRT</span>
                  </div>
                </div>

                {selectedProposal.status === 'Active' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleVote(true)}
                      icon={<ThumbsUp className="h-4 w-4" />}
                      className="flex-1 min-h-[44px]"
                    >
                      For
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => handleVote(false)}
                      icon={<ThumbsDown className="h-4 w-4" />}
                      className="flex-1 min-h-[44px]"
                    >
                      Against
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-medium text-center py-2 bg-bg-4/40 rounded-lg">
                    This voting period is closed.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-16 space-y-2 text-text-muted">
                <Vote className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs">
                  Select a proposal to cast your vote.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
