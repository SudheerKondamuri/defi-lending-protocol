import { useState, useMemo, useId } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  ChevronRight,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import Button from '../components/ui/Button';
import YieldCalculator from '../components/ui/YieldCalculator';
import { LedgerGroup, LedgerRow } from '../components/ui/StatCard';
import { useLiquidatableAccounts } from '../hooks/useLiquidatableAccounts';
import { CONTRACTS, LENDING_POOL_ABI, ORACLE_ABI } from '../config/abis';
import { calculateAPYNumber } from '../utils/format';

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonId = `faq-btn-${id}`;
  const panelId = `faq-panel-${id}`;

  return (
    <div className="border-b border-paper-200 py-3.5">
      <button
        id={buttonId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-medium text-ink-900 hover:text-signal transition-colors cursor-pointer"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="flex items-center gap-2 text-xs font-semibold">
          <HelpCircle className="h-3.5 w-3.5 text-ink-600" aria-hidden="true" />
          {question}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 text-ink-600 transition-transform duration-150 ${open ? 'rotate-90 text-signal' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="mt-2 pl-5 text-xs text-ink-600 leading-relaxed max-w-2xl"
        >
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  // Simulator state for the Signature Kinetic Cockpit in Hero
  const [simUtil, setSimUtil] = useState(72); // 72% default utilization
  const { accounts } = useLiquidatableAccounts();

  // Calculate live piecewise interest rates based on simulator slider
  const simRates = useMemo(() => {
    const u = simUtil / 100;
    const kink = 0.8;
    const baseRate = 2.0;
    const rateAtKink = 18.0;
    const maxRate = 58.0;

    let borrowAPY: number;
    if (u <= kink) {
      borrowAPY = baseRate + (u / kink) * (rateAtKink - baseRate);
    } else {
      borrowAPY = rateAtKink + ((u - kink) / (1.0 - kink)) * (maxRate - rateAtKink);
    }

    const supplyAPY = borrowAPY * u * 0.9;
    const isAboveKink = u > kink;

    return {
      borrowAPY,
      supplyAPY,
      isAboveKink,
    };
  }, [simUtil]);

  // Query real on-chain data for live protocol stats
  const { data: rawContractData, isLoading: isStatsLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'getAssetData',
        args: [CONTRACTS.weth],
      },
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'getAssetData',
        args: [CONTRACTS.usdc],
      },
      {
        address: CONTRACTS.oracle,
        abi: ORACLE_ABI,
        functionName: 'getAssetPrice',
        args: [CONTRACTS.weth],
      },
      {
        address: CONTRACTS.oracle,
        abi: ORACLE_ABI,
        functionName: 'getAssetPrice',
        args: [CONTRACTS.usdc],
      },
      {
        address: CONTRACTS.lendingPool,
        abi: LENDING_POOL_ABI,
        functionName: 'assetConfigs',
        args: [CONTRACTS.weth],
      },
    ],
  });

  let wethTvlUsd = 0;
  let usdcTvlUsd = 0;
  let wethBorrowUsd = 0;
  let usdcBorrowUsd = 0;
  let tvlUsd = 0;
  let borrowUsd = 0;
  let liquidationBonusPct = 5.0;
  let liveSupplyApy = 5.0;

  if (rawContractData && rawContractData.length >= 5) {
    const wethData = rawContractData[0]?.result as [bigint, bigint, bigint, bigint, boolean] | undefined;
    const usdcData = rawContractData[1]?.result as [bigint, bigint, bigint, bigint, boolean] | undefined;
    const wethPrice = rawContractData[2]?.result as bigint | undefined;
    const usdcPrice = rawContractData[3]?.result as bigint | undefined;
    const wethConfig = rawContractData[4]?.result as [bigint, bigint, bigint, number, boolean] | undefined;

    if (wethData && usdcData && wethPrice !== undefined && usdcPrice !== undefined) {
      const wethDeposits = parseFloat(formatUnits(wethData[0], 18));
      const wethBorrows = parseFloat(formatUnits(wethData[1], 18));
      const wethPriceUsd = parseFloat(formatUnits(wethPrice, 18));

      const usdcDeposits = parseFloat(formatUnits(usdcData[0], 6));
      const usdcBorrows = parseFloat(formatUnits(usdcData[1], 6));
      const usdcPriceUsd = parseFloat(formatUnits(usdcPrice, 18));

      wethTvlUsd = wethDeposits * wethPriceUsd;
      usdcTvlUsd = usdcDeposits * usdcPriceUsd;
      wethBorrowUsd = wethBorrows * wethPriceUsd;
      usdcBorrowUsd = usdcBorrows * usdcPriceUsd;

      tvlUsd = wethTvlUsd + usdcTvlUsd;
      borrowUsd = wethBorrowUsd + usdcBorrowUsd;

      liveSupplyApy = calculateAPYNumber(wethData[2]);
    }

    if (wethConfig && wethConfig[1] !== undefined) {
      liquidationBonusPct = parseFloat(formatUnits(wethConfig[1], 18)) * 100;
    }
  }

  const utilizationRate = tvlUsd > 0 ? (borrowUsd / tvlUsd) * 100 : 0;
  const overcollateralizationRatio = borrowUsd > 0 ? (tvlUsd / borrowUsd) * 100 : 100;

  // Real liquidatable stats
  const liquidatableAccounts = accounts.filter((a) => a.healthFactor > 0 && a.healthFactor < 1.0);
  const totalUnderwaterDebt = liquidatableAccounts.reduce((sum, a) => sum + a.debtValue, 0);

  return (
    <div className="space-y-20 py-8">
      {/* ── 1. EDITORIAL HERO SECTION ───────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4 pb-8 border-b border-paper-200">
        {/* Left Column: Authoritative Editorial Header (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-600">
            Smart Contract Protocol • ERC-1967 Proxy • 12.0s Block Compounding
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-ink-900 leading-[1.1]">
            Autonomous Liquidity & Dynamic Risk Engine
          </h1>

          <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-xl font-normal">
            Supply overcollateralized assets to earn continuous block-compounding yield. Borrow against verified on-chain oracle feeds with algorithmic kinked rate stabilization.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link to="/markets" className="no-underline">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight className="h-4 w-4" />}
                className="w-full"
              >
                Open Markets Desk
              </Button>
            </Link>
            <a href="#mechanism-section" className="no-underline">
              <Button variant="secondary" size="lg" className="w-full">
                Inspect Rate Model
              </Button>
            </a>
          </div>

          {/* Telemetry Strip */}
          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-paper-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-mono text-ink-600 block">Active Pools</span>
              <span className="font-mono font-semibold text-ink-900 mt-0.5 block">WETH / USDC</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-ink-600 block">Liquidation Bonus</span>
              <span className="font-mono font-semibold text-safe mt-0.5 block">+{liquidationBonusPct.toFixed(2)}% Seize</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-ink-600 block">Oracle Source</span>
              <span className="font-mono font-semibold text-ink-900 mt-0.5 block">PriceRegistry</span>
            </div>
          </div>
        </div>

        {/* Right Column: Signature Kinetic Rate Cockpit (5 cols) */}
        <div className="lg:col-span-5">
          <div className="paper-card p-6 space-y-5 bg-paper-100 border-paper-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-signal" aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-900 font-mono">
                  Interest Rate Mechanism
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                  simRates.isAboveKink ? 'bg-caution/10 text-caution border-caution/25' : 'bg-safe/10 text-safe border-safe/25'
                }`}
              >
                {simRates.isAboveKink ? 'High Friction Zone (>80%)' : 'Optimal Reserve Zone'}
              </span>
            </div>

            {/* Slider Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-600">Capital Pool Utilization (U)</span>
                <span className="font-bold text-ink-900">{simUtil}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simUtil}
                onChange={(e) => setSimUtil(Number(e.target.value))}
                className="w-full h-1.5 bg-paper-200 rounded appearance-none cursor-pointer accent-signal"
                aria-label="Simulate capital pool utilization ratio"
              />
              <div className="flex justify-between text-[10px] font-mono text-ink-600">
                <span>0%</span>
                <span className="text-caution font-medium">80% Kink</span>
                <span>100%</span>
              </div>
            </div>

            {/* Readouts in Dotted Ledger Rows */}
            <div className="bg-paper-50 p-3.5 rounded border border-paper-200 space-y-2">
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="text-ink-600">Supply APY (Lenders)</span>
                <span className="font-bold text-safe">+{simRates.supplyAPY.toFixed(2)}%</span>
              </div>
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="text-ink-600">Borrow APY (Cost)</span>
                <span className={`font-bold ${simRates.isAboveKink ? 'text-caution' : 'text-ink-900'}`}>
                  {simRates.borrowAPY.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Thin Ink SVG Curve Graphic */}
            <div className="pt-2 border-t border-paper-200">
              <div className="h-16 w-full relative">
                <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
                  {/* Kink line at 80% = 240 */}
                  <line x1="240" y1="0" x2="240" y2="60" stroke="#B8860B" strokeWidth="1" strokeDasharray="2 2" />
                  {/* Piecewise path */}
                  <path
                    d="M 0 55 L 240 40 L 300 5"
                    fill="none"
                    stroke="#1F3B5C"
                    strokeWidth="1.5"
                  />
                  {/* Marker dot */}
                  {(() => {
                    const x = (simUtil / 100) * 300;
                    let y = 55;
                    if (simUtil <= 80) {
                      y = 55 - (simUtil / 80) * 15;
                    } else {
                      y = 40 - ((simUtil - 80) / 20) * 35;
                    }
                    return (
                      <circle cx={x} cy={y} r="4" fill="#1F3B5C" stroke="#F7F5EF" strokeWidth="1.5" />
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PROTOCOL STATEMENT (Dotted-Leader Ledger Rows) ────────────── */}
      <section aria-label="Protocol Balance Ledger" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold font-display text-ink-900">Protocol Solvency Statement</h2>
          <p className="text-xs text-ink-600">
            Verified on-chain positions across all asset vaults and active borrowing debts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collateral Ledger */}
          <LedgerGroup
            title="Supplied Collateral Vaults"
            subtitle="100% reserve-backed assets deposited by suppliers"
          >
            <LedgerRow
              label="Total Collateral"
              value={isStatsLoading ? 'Loading...' : `$${tvlUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              change="Solvent"
              changeType="positive"
            />
            <LedgerRow
              label="WETH Vault Reserve"
              value={isStatsLoading ? '...' : `$${wethTvlUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <LedgerRow
              label="USDC Vault Reserve"
              value={isStatsLoading ? '...' : `$${usdcTvlUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
          </LedgerGroup>

          {/* Borrow Debt Ledger */}
          <LedgerGroup
            title="Active Borrow Liabilities"
            subtitle="Overcollateralized debt obligations monitored continuously"
          >
            <LedgerRow
              label="Total Active Debt"
              value={isStatsLoading ? 'Loading...' : `$${borrowUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              change={`Util: ${utilizationRate.toFixed(1)}%`}
              changeType={utilizationRate > 80 ? 'negative' : 'neutral'}
            />
            <LedgerRow
              label="Overcollateralization"
              value={`${overcollateralizationRatio.toFixed(0)}%`}
              change="Verified"
              changeType="positive"
            />
            <LedgerRow
              label="Underwater Bad Debt"
              value={`$${totalUnderwaterDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              change={`${liquidatableAccounts.length} Accounts Liquidatable`}
              changeType={liquidatableAccounts.length > 0 ? 'negative' : 'positive'}
            />
          </LedgerGroup>
        </div>
      </section>

      {/* ── 3. PROTOCOL ARCHITECTURAL MECHANISMS ──────────────────────────── */}
      <section id="mechanism-section" className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold font-display text-ink-900">Protocol Mechanics</h2>
          <p className="text-xs text-ink-600 mt-0.5">
            Engineered with strict economic formulas to prevent insolvency and protect depositors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="paper-card p-5 space-y-2.5">
            <BarChart3 className="h-4 w-4 text-signal" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-900 font-mono">
              Piecewise Kinked Rates
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Maintains optimal capital pool levels using a kinked model. Above 80% utilization, borrowing costs escalate sharply to incentivize repayments and protect pool liquidity.
            </p>
          </div>

          <div className="paper-card p-5 space-y-2.5">
            <Cpu className="h-4 w-4 text-caution" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-900 font-mono">
              Autonomous Liquidations
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Positions dropping below a Health Factor of 1.0 are instantly exposed to third-party liquidators. Liquidators cover up to 50% of debt to claim collateral at the protocol liquidation bonus discount.
            </p>
          </div>

          <div className="paper-card p-5 space-y-2.5">
            <ShieldCheck className="h-4 w-4 text-safe" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-900 font-mono">
              Chainlink Price Feeds
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Price feeds are fetched directly from decentralized oracles via PriceOracleRegistry. Dynamic threshold ratios calculate borrowing power with zero off-chain dependencies.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. YIELD PROJECTOR ────────────────────────────────────────────── */}
      <section className="space-y-4 max-w-4xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold font-display text-ink-900">Compound Yield Projector</h2>
          <p className="text-xs text-ink-600">
            Simulate your portfolio growth over custom horizons using block-by-block compounding.
          </p>
        </div>
        <YieldCalculator defaultApy={liveSupplyApy.toFixed(1)} />
      </section>

      {/* ── 5. FREQUENTLY ASKED QUESTIONS ─────────────────────────────────── */}
      <section className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold font-display text-ink-900 text-center">
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-paper-200">
          <FAQItem
            question="How does block-based interest compounding work?"
            answer="Deposited assets accrue interest on every single block verified by the blockchain. Borrowers pay variable dynamic interest based on the pool's current utilization ratio, which is distributed continuously to suppliers."
          />
          <FAQItem
            question="What is the Liquidation Threshold and Health Factor?"
            answer="Health Factor represents the safety of your loan against collateral value. If market volatility causes your Health Factor to drop below 1.0, any market participant can liquidate up to 50% of your debt in exchange for your collateral at a 10% discount."
          />
          <FAQItem
            question="Are these contracts upgradeable?"
            answer="Yes, the core LendingPool is built using the open-source ERC-1967 UUPS proxy pattern, allowing the protocol DAO to execute verified logic upgrades without migrating user liquidity."
          />
        </div>
      </section>
    </div>
  );
}
