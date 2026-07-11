import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Menu, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { formatUnits } from 'viem';
import clsx from 'clsx';
import Button from '../ui/Button';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'landing', label: 'Home' },
  { id: 'markets', label: 'Markets' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'liquidations', label: 'Auctions' },
  { id: 'governance', label: 'Governance' },
  { id: 'analytics', label: 'Analytics' },
];

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onNavigate('landing')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/35">
            <span className="text-sm font-black text-white">DL</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">
              DeFi Lending
            </h1>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              Protocol
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none',
                currentPage === item.id
                  ? 'bg-brand/10 text-brand-light border border-brand/20'
                  : 'text-text-secondary border border-transparent hover:text-white hover:bg-white/5',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side Actions */}
        <div className="flex items-center gap-2">
          {/* Wallet Connection */}
          <div className="relative">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                {/* Balance chip */}
                {balance && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-bg-3/80 border border-border-subtle px-3 py-1.5 text-xs font-mono font-bold text-text-secondary">
                    {parseFloat(formattedBalance).toFixed(4)} {balance.symbol}
                  </span>
                )}

                {/* Account button */}
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer select-none',
                    'bg-bg-3 border border-border-subtle',
                    'hover:border-brand/40 transition-colors duration-200',
                    'min-h-[44px]',
                  )}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Wallet menu"
                >
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand to-info" aria-hidden="true" />
                  <span className="text-xs font-bold text-text-primary font-mono">
                    {truncateAddress(address)}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 text-text-muted transition-transform duration-200',
                      menuOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown Menu */}
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
                        className="absolute right-0 top-14 z-50 w-52 glass-card p-1.5 space-y-1"
                      >
                        <button
                          onClick={copyAddress}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-text-secondary hover:bg-white/5 hover:text-white cursor-pointer transition-colors duration-150"
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          {copied ? 'Copied!' : 'Copy Address'}
                        </button>
                        <a
                          href={`https://etherscan.io/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-text-secondary hover:bg-white/5 hover:text-white cursor-pointer transition-colors duration-150"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          View Explorer
                        </a>
                        <div className="border-t border-border-subtle my-1" />
                        <button
                          onClick={() => {
                            disconnect();
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-error hover:bg-error/10 cursor-pointer transition-colors duration-150"
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
              <div className="flex items-center gap-1.5">
                {connectors.slice(0, 1).map((connector) => (
                  <Button
                    key={connector.uid}
                    variant="primary"
                    size="md"
                    loading={isPending}
                    icon={<Wallet className="h-4 w-4" />}
                    onClick={() => connect({ connector })}
                    className="shadow-lg shadow-brand/35 text-xs"
                  >
                    Connect Wallet
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Hamburger Mobile Icon */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl bg-bg-3 border border-border-subtle hover:bg-bg-4 text-white"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border-subtle bg-bg-2"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={clsx(
                    'block w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-150',
                    currentPage === item.id
                      ? 'bg-brand/10 text-brand-light'
                      : 'text-text-secondary hover:text-white hover:bg-white/5',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
