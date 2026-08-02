'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps { data: any[] }

export default function PriceChart({ data }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
        価格データがまだ蓄積されていません。
        <br />
        Cronジョブが実行されると自動的に追加されます。
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#eee' />
          <XAxis
            dataKey='recorded_at'
            tickFormatter={(value) => { const d = new Date(value); return (d.getMonth()+1) + '/' + d.getDate(); }}
            stroke='#999'
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(value) => 'JP' + Number(value).toLocaleString()}
            stroke='#999'
            width={80}
          />
          <Tooltip
            formatter={(value: any) => ['JP' + Number(value ?? 0).toLocaleString(), 'Lowest Price']}
            labelFormatter={(label: any) => { const d = new Date(String(label)); return d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate(); }}
          />
          <Line type='monotone' dataKey='lowest_price' stroke='#ff4500' strokeWidth={3} dot={{ r: 4, fill: '#ff4500', strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}