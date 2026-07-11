import { useState, useMemo } from 'react';
import Card from './Card';
import Input from './Input';
import Button from './Button';

export default function YieldCalculator() {
  const [deposit, setDeposit] = useState('1000');
  const [apy, setApy] = useState('8.5');
  const [years, setYears] = useState('5');

  const projections = useMemo(() => {
    const p = parseFloat(deposit) || 0;
    const r = (parseFloat(apy) || 0) / 100;
    const t = parseInt(years) || 1;

    const list: { year: number; amount: number; interest: number }[] = [];
    let current = p;
    for (let i = 1; i <= t; i++) {
      const next = current * (1 + r);
      list.push({
        year: i,
        amount: next,
        interest: next - p,
      });
      current = next;
    }
    return { list, finalAmount: current, interestEarned: current - p };
  }, [deposit, apy, years]);

  // SVG dimensions
  const height = 120;
  const width = 300;
  const padding = 15;
  const activeW = width - padding * 2;
  const activeH = height - padding * 2;

  const points = useMemo(() => {
    const list = projections.list;
    if (list.length === 0) return '';
    const maxVal = projections.finalAmount || 1;
    const minVal = parseFloat(deposit) || 0;
    const range = maxVal - minVal || 1;

    const coords = list.map((item, idx) => {
      const x = padding + (idx / (list.length - 1)) * activeW;
      const pct = (item.amount - minVal) / range;
      const y = padding + activeH - pct * activeH;
      return { x, y };
    });

    const startX = padding;
    const startY = padding + activeH;
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    return `${linePath} L ${coords[coords.length - 1].x} ${startY} L ${startX} ${startY} Z`;
  }, [projections, deposit, activeW, activeH]);

  return (
    <Card className="glass-card flex flex-col md:flex-row gap-6 p-6">
      {/* Inputs */}
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Yield Projection</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Estimate your future compound interest returns.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            label="Initial Deposit ($)"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            type="number"
            placeholder="e.g. 1000"
          />
          <Input
            label="Compounding APY (%)"
            value={apy}
            onChange={(e) => setApy(e.target.value)}
            type="number"
            step="0.1"
            placeholder="e.g. 8.5"
          />
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((y) => (
              <Button
                key={y}
                variant={years === String(y) ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setYears(String(y))}
                className="flex-1 min-h-[36px]"
              >
                {y} Yr{y > 1 ? 's' : ''}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG projection graph & metrics */}
      <div className="flex-1 flex flex-col justify-between bg-bg-3/40 rounded-xl p-4 border border-border-subtle">
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">
            Projected Portfolio Value
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              ${projections.finalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <span className="text-xs text-success font-semibold flex items-center gap-1 mt-0.5">
            +${projections.interestEarned.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            interest ({( (projections.interestEarned / (parseFloat(deposit) || 1)) * 100 ).toFixed(1)}%)
          </span>
        </div>

        {/* Small SVG curve preview */}
        <div className="mt-4 h-24 relative overflow-visible">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="calcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {points && (
              <path d={points} fill="url(#calcGrad)" />
            )}

            {projections.list.length > 0 && (
              <path
                d={projections.list
                  .map((item, idx) => {
                    const x = padding + (idx / (projections.list.length - 1)) * activeW;
                    const pct =
                      (item.amount - (parseFloat(deposit) || 0)) /
                      ((projections.finalAmount - (parseFloat(deposit) || 0)) || 1);
                    const y = padding + activeH - pct * activeH;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>
    </Card>
  );
}
