import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { LedgerGroup, LedgerRow } from '../components/ui/StatCard';
import { useGovernance, useGovernanceProposals } from '../hooks/useGovernance';

export default function Governance() {
  const { data: proposals, isLoading, isError, refetch } = useGovernanceProposals();
  const { votingPower, castVote, isVoting } = useGovernance();
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedProposal = proposals?.find((p) => p.id === selectedProposalId);

  const handleVote = async (support: boolean) => {
    if (!selectedProposalId) return;
    setVoteFeedback(null);
    try {
      await castVote(selectedProposalId, support);
      setVoteFeedback({
        type: 'success',
        message: `Vote successfully recorded ${support ? 'FOR' : 'AGAINST'} Proposal #${selectedProposalId}.`,
      });
    } catch (error: any) {
      console.error(error);
      setVoteFeedback({
        type: 'error',
        message: error?.shortMessage || error?.message || 'Failed to submit vote transaction.',
      });
    }
  };

  const activeProposalsCount = proposals?.filter((p) => p.status === 'Active').length || 0;
  const totalProposalsCount = proposals?.length || 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-900">
          DAO Governance & Voting
        </h1>
        <p className="text-xs text-ink-600 mt-0.5">
          Participate in decentralized governance, cast votes on risk parameters, rate models, and protocol upgrades.
        </p>
      </div>

      {/* Governance Ledger Summary */}
      <LedgerGroup title="Governance Register">
        <LedgerRow
          label="My Registered Voting Power"
          value={`${votingPower.toLocaleString()} PRT`}
          change="Available"
          changeType="positive"
        />
        <LedgerRow
          label="Active Voting Ballots"
          value={activeProposalsCount.toString()}
          change={activeProposalsCount > 0 ? 'Open' : 'None'}
          changeType={activeProposalsCount > 0 ? 'positive' : 'neutral'}
        />
        <LedgerRow
          label="Total Proposals Recorded"
          value={totalProposalsCount.toString()}
        />
      </LedgerGroup>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposal List */}
        <div className="paper-card lg:col-span-2 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-200 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
              Governance Proposals Log
            </h2>
            {refetch && (
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1 text-[11px] font-mono text-ink-600 hover:text-ink-900 cursor-pointer"
                aria-label="Refresh proposals list"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-600 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-signal" />
              <span className="text-xs font-mono">Loading proposals from contract...</span>
            </div>
          ) : isError ? (
            <ErrorState
              title="Failed to Load Proposals"
              description="Could not query proposal data from Governor contract. Please verify RPC connection."
              onRetry={() => refetch?.()}
            />
          ) : proposals?.length === 0 ? (
            <EmptyState
              title="No Proposals Found"
              description="There are currently no governance proposals on-chain. Proposals created by DAO delegates will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {proposals?.map((proposal) => {
                const totalVotes = proposal.votesFor + proposal.votesAgainst || 1;
                const forPct = Math.round((proposal.votesFor / totalVotes) * 100);
                const isSelected = selectedProposalId === proposal.id;

                return (
                  <div
                    key={proposal.id}
                    onClick={() => {
                      setSelectedProposalId(proposal.id);
                      setVoteFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProposalId(proposal.id);
                        setVoteFeedback(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`p-3.5 rounded border transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-signal/8 border-signal'
                        : 'bg-paper-100 border-paper-200 hover:bg-paper-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          proposal.status === 'Active'
                            ? 'bg-safe/10 text-safe border-safe/25'
                            : 'bg-paper-200 text-ink-600 border-paper-300'
                        }`}
                      >
                        {proposal.status}
                      </span>
                      <span className="text-[10px] text-ink-600 font-mono">
                        #{proposal.id} • End block: {proposal.endBlock}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-ink-900 mt-1.5 font-display">
                      {proposal.title}
                    </h3>
                    <p className="text-xs text-ink-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>

                    {/* Vote proportional bar */}
                    <div className="mt-3 space-y-1">
                      <div className="h-1.5 w-full bg-paper-200 rounded overflow-hidden flex">
                        <div className="h-full bg-safe" style={{ width: `${forPct}%` }} />
                        <div className="h-full bg-danger flex-1" />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-600 font-mono">
                        <span className="text-safe">For: {forPct}% ({proposal.votesFor.toLocaleString()})</span>
                        <span className="text-danger">Against: {100 - forPct}% ({proposal.votesAgainst.toLocaleString()})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Voting Drawer Console */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600 font-mono">
              Voting Desk
            </h2>

            {selectedProposal ? (
              <div className="space-y-3">
                <div>
                  <h3 id="selected-proposal-title" className="text-xs font-bold text-ink-900">
                    {selectedProposal.title}
                  </h3>
                  <p className="text-[11px] text-ink-600 mt-1 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedProposal.description}
                  </p>
                </div>

                <div className="bg-paper-50 rounded p-2.5 border border-paper-200 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Available Weight</span>
                    <span className="text-ink-900 font-bold">{votingPower.toLocaleString()} PRT</span>
                  </div>
                </div>

                {selectedProposal.status === 'Active' ? (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleVote(true)}
                        icon={<ThumbsUp className="h-3.5 w-3.5" />}
                        className="flex-1"
                        loading={isVoting}
                        aria-describedby="selected-proposal-title"
                      >
                        Vote For
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleVote(false)}
                        icon={<ThumbsDown className="h-3.5 w-3.5" />}
                        className="flex-1"
                        loading={isVoting}
                        aria-describedby="selected-proposal-title"
                      >
                        Vote Against
                      </Button>
                    </div>

                    {/* Inline Feedback */}
                    {voteFeedback && (
                      <div
                        className={`rounded p-2 text-xs flex items-start gap-1.5 ${
                          voteFeedback.type === 'success'
                            ? 'bg-safe/10 border border-safe/25 text-safe'
                            : 'bg-danger/8 border border-danger/25 text-danger'
                        }`}
                        role="alert"
                      >
                        {voteFeedback.type === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span>{voteFeedback.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-600 font-mono text-center py-2 bg-paper-200/50 rounded">
                    Voting period concluded.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 space-y-1 text-ink-600">
                <p className="text-xs">
                  Select a proposal from the list to cast your vote.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
