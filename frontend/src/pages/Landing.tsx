import { useState } from 'react';
import { ArrowRight, ShieldCheck, Flame, Cpu, BarChart3, ChevronRight, HelpCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import YieldCalculator from '../components/ui/YieldCalculator';

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border-subtle py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-medium text-text-primary hover:text-brand transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-brand-light" />
          {question}
        </span>
        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90 text-brand' : 'text-text-muted'}`} />
      </button>
      {open && (
        <p className="mt-2 pl-6 text-xs text-text-secondary leading-relaxed max-w-2xl">
          {answer}
        </p>
      )}
    </div>
  );
}

interface LandingProps {
  onEnterApp: () => void;
}

export default function Landing({ onEnterApp }: LandingProps) {
  const metrics = [
    { label: 'Total Value Locked', value: '$48,294,015' },
    { label: 'Total Borrowed', value: '$21,402,192' },
    { label: 'Total Liquidity Reserves', value: '$26,891,823' },
    { label: 'Safety Index', value: 'A+ Audit Score' },
  ];

  return (
    <div className="space-y-20 py-8 relative">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto py-12 relative z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3.5 py-1.5 text-xs font-semibold text-brand-light border border-brand/20">
          <Flame className="h-3.5 w-3.5" />
          Protocol Version 1.0 is officially Live on Local Testnet
        </div>

        <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight text-white">
          The Next Generation of <br />
          <span className="bg-gradient-to-r from-brand-light via-brand to-info bg-clip-text text-transparent">
            Weightless Capital
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed">
          Supply collateral, borrow assets, and experience block-based dynamic compounding rates. Built with UUPS upgradeability and integrated with Chainlink oracle feeds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onEnterApp}
            icon={<ArrowRight className="h-4 w-4" />}
            className="w-full sm:w-auto shadow-lg shadow-brand/35"
          >
            Launch Markets App
          </Button>
          <a href="#yield-section" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full">
              Calculate APY Returns
            </Button>
          </a>
        </div>
      </section>

      {/* Live Stats Ticker */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="glass-card p-6 flex flex-col justify-center border border-border-subtle bg-bg-2/30"
          >
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              {m.label}
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {m.value}
            </span>
          </div>
        ))}
      </section>

      {/* Yield Projection Calculator */}
      <section id="yield-section" className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Compound Projector</h2>
          <p className="text-sm text-text-secondary">
            Simulate your portfolio growth over custom horizons.
          </p>
        </div>
        <YieldCalculator />
      </section>

      {/* Protocol Architecture Features */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">DeFi Engine Core</h2>
          <p className="text-sm text-text-secondary">
            Built on mathematically verified interest and risk models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 space-y-3 bg-bg-2/20 border-border-subtle">
            <div className="h-10 w-10 rounded-xl bg-brand-subtle flex items-center justify-center border border-brand/20">
              <BarChart3 className="h-5 w-5 text-brand-light" />
            </div>
            <h3 className="text-base font-bold text-white">Piecewise Rate Curves</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Maintains optimal capital pool levels using a kinked model. Rate adjustments compound accurately on each block.
            </p>
          </div>

          <div className="glass-card p-6 space-y-3 bg-bg-2/20 border-border-subtle">
            <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center border border-info/20">
              <Cpu className="h-5 w-5 text-info" />
            </div>
            <h3 className="text-base font-bold text-white">Autonomous Liquidations</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Positions dropping below a Health Factor of 1.0 are instantly flagged for liquidation, preserving protocol safety.
            </p>
          </div>

          <div className="glass-card p-6 space-y-3 bg-bg-2/20 border-border-subtle">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <h3 className="text-base font-bold text-white">Registry Heartbeat</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Direct oracle validations protect assets from stale feedback. Oracle anomalies fallback to registry flags.
            </p>
          </div>
        </div>
      </section>

      {/* Security Audits */}
      <section className="glass-card p-8 border border-border-subtle bg-bg-2/10 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-success bg-success/10 px-2 py-0.5 rounded">
            Audit Passed
          </div>
          <h3 className="text-xl font-bold text-white">Secure Smart Contracts</h3>
          <p className="text-xs text-text-secondary max-w-md">
            All code in the core vaults is audited, verified, and locked under a 24-hour timelock delay.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-center grayscale opacity-60">
          <div className="font-bold text-white font-mono text-sm tracking-wider">OPENZEPPELIN</div>
          <div className="font-bold text-white font-mono text-sm tracking-wider">CERTIK</div>
          <div className="font-bold text-white font-mono text-sm tracking-wider">TRAIL OF BITS</div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-2xl mx-auto space-y-6">
        <h3 className="text-xl font-extrabold text-white text-center">Frequently Asked Questions</h3>
        <div className="divide-y divide-border-subtle">
          <FAQItem
            question="How is interest calculated on my collateral?"
            answer="Deposited assets are lent to borrowers. You receive block-based supply interest, which is calculated compounding dynamically. The yield is driven by asset utilization."
          />
          <FAQItem
            question="What is the liquidation threshold?"
            answer="Each asset configuration has a liquidation threshold. If the ratio of your borrowed value to collateral value exceeds this threshold, your health factor drops below 1.0, enabling liquidators to clear your debt."
          />
          <FAQItem
            question="Are these contracts upgradeable?"
            answer="Yes, the core LendingPool inherits the UUPS Upgradeability standard. Any implementation upgrade is restricted to the contract owner."
          />
        </div>
      </section>
    </div>
  );
}
