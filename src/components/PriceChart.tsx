'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  data: any[];
}

export default function PriceChart({ data }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--foreground-muted, #888)', fontSize: '0.9rem', background: 'var(--surface, #fafafa)', borderRadius: '10px', border: '1px solid var(--border, #eee)' }}>
        価格データがまだ蓄積されていません。
        <br />
        毎日の自動データ更新により順次グラフが生成されます。
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis
            dataKey="recorded_at"
            tickFormatter={(value) => {
              const d = new Date(value);
              return (d.getMonth() + 1) + '/' + d.getDate();
            }}
            stroke="#888"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(value) => '¥' + Number(value).toLocaleString()}
            stroke="#888"
            fontSize={12}
            width={75}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '0.85rem',
              padding: '8px 12px'
            }}
            formatter={(value: any) => ['¥' + Number(value ?? 0).toLocaleString(), '最安値']}
            labelFormatter={(label: any) => {
              const d = new Date(String(label));
              return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
            }}
          />
          <Line
            type="monotone"
            dataKey="lowest_price"
            stroke="var(--accent, #ff4500)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--accent, #ff4500)', strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
