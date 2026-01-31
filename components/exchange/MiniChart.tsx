'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, AreaSeries, Time } from 'lightweight-charts';

interface MiniChartProps {
  data: { time: number; value: number }[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export default function MiniChart({ 
  data, 
  width = 100, 
  height = 40, 
  positive = true 
}: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      handleScale: false,
      handleScroll: false,
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: positive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      bottomColor: positive ? 'rgba(34, 197, 94, 0)' : 'rgba(239, 68, 68, 0)',
      lineColor: positive ? '#22c55e' : '#ef4444',
      lineWidth: 1,
      crosshairMarkerVisible: false,
    });

    const formattedData = data.map(d => ({
      time: d.time as Time,
      value: d.value,
    }));

    series.setData(formattedData);
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [data, width, height, positive]);

  return <div ref={chartContainerRef} />;
}
