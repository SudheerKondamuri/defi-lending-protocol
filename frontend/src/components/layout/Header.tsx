import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useState, useCallback } from 'react';
import { formatUnits } from 'viem';
import clsx from 'clsx';
import Button from '../ui/Button';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  const formattedBalance = balance ? formatUnits(balance.value, balance.decimals) : '0';

  return (
    <header className="glass-panel sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Protocol Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/30">
            <span className="text-sm font-bold text-white">DL</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary leading-tight">
              DeFi Lending
            </h1>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
              Protocol
            </p>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="relative">
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              {/* Balance chip */}
              {balance && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-bg-3 px-3 py-1.5 text-xs font-mono text-text-secondary">
                  {parseFloat(formattedBalance).toFixed(4)} {balance.symbol}
                </span>
              )}

              {/* Connected address button */}
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer',
                  'bg-bg-3 border border-border-subtle',
                  'hover:border-brand/40 transition-colors duration-200',
                  'min-h-[44px]',
                )}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Wallet menu"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand to-info" aria-hidden="true" />
                <span className="text-sm font-medium text-text-primary font-mono">
                  {truncateAddress(address)}
                </span>
                <ChevronDown
                  className={clsx(
                    'h-4 w-4 text-text-muted transition-transform duration-200',
                    menuOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-14 z-50 w-56 glass-card p-2 space-y-1"
                    >
                      <button
                        onClick={copyAddress}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary cursor-pointer transition-colors duration-150"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        {copied ? 'Copied!' : 'Copy Address'}
                      </button>
                      <a
                        href={`https://etherscan.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary cursor-pointer transition-colors duration-150"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        View on Explorer
                      </a>
                      <div className="border-t border-border-subtle my-1" />
                      <button
                        onClick={() => {
                          disconnect();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-error hover:bg-error/10 cursor-pointer transition-colors duration-150"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Disconnect
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {connectors.slice(0, 2).map((connector) => (
                <Button
                  key={connector.uid}
                  variant={connector.name === 'MetaMask' ? 'primary' : 'secondary'}
                  size="md"
                  loading={isPending}
                  icon={<Wallet className="h-4 w-4" />}
                  onClick={() => connect({ connector })}
                >
                  <span className="hidden sm:inline">{connector.name}</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
