import { useState, useMemo } from 'react';
import Card from './Card';
import Input from './Input';
import Button from './Button';

interface YieldCalculatorProps {
  defaultDeposit?: string;
  defaultApy?: string;
  defaultYears?: string;
}

export default function YieldCalculator({
  defaultDeposit = '1000',
  defaultApy = '5.0',
  defaultYears = '5',
}: YieldCalculatorProps = {}) {
  const [deposit, setDeposit] = useState(defaultDeposit);
  const [apy, setApy] = useState(defaultApy);
  const [years, setYears] = useState(defaultYears);

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

  return (
    <Card className="flex flex-col md:flex-row gap-6 p-6">
      {/* Inputs */}
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">Yield Projection</h3>
          <p className="text-xs text-ink-600 mt-0.5">
            Estimate your future compound interest returns over time.
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
          <div className="flex gap-2 pt-1">
            {[1, 3, 5, 10].map((y) => (
              <Button
                key={y}
                variant={years === String(y) ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setYears(String(y))}
                className="flex-1"
              >
                {y} Yr{y > 1 ? 's' : ''}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG projection graph & metrics */}
      <div className="flex-1 flex flex-col justify-between bg-paper-50 rounded-md p-4 border border-paper-200">
        <div className="space-y-1">
          <span className="text-[10px] text-ink-600 uppercase font-mono tracking-wider font-semibold">
            Projected Portfolio Value
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 font-mono">
              ${projections.finalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <span className="text-xs text-safe font-mono font-medium flex items-center gap-1 mt-0.5">
            +${projections.interestEarned.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            interest ({( (projections.interestEarned / (parseFloat(deposit) || 1)) * 100 ).toFixed(1)}%)
          </span>
        </div>

        {/* Ink-line SVG curve preview */}
        <div className="mt-4 h-20 relative overflow-visible">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Gridlines */}
            <line x1={padding} y1={padding + activeH} x2={width - padding} y2={padding + activeH} stroke="#E4DFD1" strokeWidth="1" />

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
                stroke="#1F3B5C"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>
    </Card>
  );
}
