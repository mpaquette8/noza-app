import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ActivityStats() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/profile/stats')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className='w-full h-64'>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data}>
          <XAxis dataKey='date' stroke='#8884d8' />
          <YAxis />
          <Tooltip />
          <Line type='monotone' dataKey='value' stroke='#8884d8' strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
