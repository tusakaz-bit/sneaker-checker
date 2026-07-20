'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PriceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>価格推移データがありません</div>;
  }

  return (
    <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis 
            dataKey="recorded_at" 
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            stroke="#999"
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => `¥${value.toLocaleString()}`}
            stroke="#999"
            width={80}
          />
          <Tooltip 
            formatter={(value: number) => [`¥${value.toLocaleString()}`, '最安値']}
            labelFormatter={(label) => {
              const date = new Date(label as string);
              return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="lowest_price" 
            stroke="#ff4500" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#ff4500', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
