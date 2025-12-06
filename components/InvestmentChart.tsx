import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InvestmentChartProps {
  data: Array<{ month: string; value: number }>;
}

const InvestmentChart: React.FC<InvestmentChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumSignificantDigits: 3,
    }).format(value);
  };

  return (
    <div className="h-64 w-full bg-white rounded-lg p-2 shadow-sm border border-slate-100">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            tick={{fontSize: 10, fill: '#64748b'}} 
            tickLine={false}
            axisLine={false}
            interval={5}
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            tick={{fontSize: 10, fill: '#64748b'}} 
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), "Valor Estimado"]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InvestmentChart;