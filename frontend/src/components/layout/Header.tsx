import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Menu, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatUnits } from 'viem';
import clsx from 'clsx';
import Button from '../ui/Button';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const NAV_ITEMS = [
  { path: '/', label: 'Overview' },
  { path: '/markets', label: 'Markets' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/liquidations', label: 'Auctions' },
  { path: '/governance', label: 'Governance' },
  { path: '/analytics', label: 'Analytics' },
];

export default function Header() {
  const location = useLocation();
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
    <header className="sticky top-0 z-50 bg-paper-50/95 backdrop-blur-none border-b border-paper-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Protocol Name */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer select-none no-underline"
          aria-label="DeFi Lending Protocol Home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-white">
            <span className="text-xs font-bold font-mono tracking-tight">DL</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-ink-900 leading-tight block font-display">
              DeFi Lending
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-ink-600 block">
              Protocol Ledger
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'py-2 text-xs transition-colors duration-150 cursor-pointer select-none no-underline relative',
                  isActive
                    ? 'text-signal font-semibold border-b-2 border-signal -mb-[2px]'
                    : 'text-ink-600 font-medium hover:text-ink-900',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side Actions */}
        <div className="flex items-center gap-2">
          {/* Wallet Connection */}
          <div className="relative">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                {/* Balance chip */}
                {balance && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-paper-100 border border-paper-200 px-2.5 py-1 text-xs font-mono font-medium text-ink-600">
                    {parseFloat(formattedBalance).toFixed(4)} {balance.symbol}
                  </span>
                )}

                {/* Account button */}
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className={clsx(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer select-none',
                    'bg-paper-100 border border-paper-200 text-ink-900',
                    'hover:bg-paper-200 transition-colors duration-150',
                    'min-h-[36px]',
                  )}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Wallet menu"
                >
                  <span className="h-2 w-2 rounded-full bg-safe" aria-hidden="true" />
                  <span className="text-xs font-semibold text-ink-900 font-mono">
                    {truncateAddress(address)}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 text-ink-600 transition-transform duration-150',
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
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-11 z-50 w-48 paper-card p-1.5 space-y-0.5 shadow-md"
                      >
                        <button
                          onClick={copyAddress}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-ink-900 hover:bg-paper-200 cursor-pointer transition-colors duration-150"
                        >
                          <Copy className="h-3.5 w-3.5 text-ink-600" aria-hidden="true" />
                          <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                        </button>
                        <a
                          href={`https://etherscan.io/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-ink-900 hover:bg-paper-200 cursor-pointer transition-colors duration-150 no-underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-ink-600" aria-hidden="true" />
                          <span>View Explorer</span>
                        </a>
                        <div className="border-t border-paper-200 my-1" />
                        <button
                          onClick={() => {
                            disconnect();
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-danger hover:bg-danger/10 cursor-pointer transition-colors duration-150"
                        >
                          <LogOut className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                          <span>Disconnect</span>
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
                    size="sm"
                    loading={isPending}
                    icon={<Wallet className="h-3.5 w-3.5" />}
                    onClick={() => connect({ connector })}
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
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-md bg-paper-100 border border-paper-200 text-ink-900 hover:bg-paper-200"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
            className="md:hidden border-t border-paper-200 bg-paper-50"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'block w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150 no-underline',
                      isActive
                        ? 'bg-paper-200 text-signal font-semibold'
                        : 'text-ink-600 hover:text-ink-900 hover:bg-paper-100',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
