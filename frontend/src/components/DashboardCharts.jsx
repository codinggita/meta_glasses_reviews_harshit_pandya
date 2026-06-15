import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { apiCall } from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Helper to translate numeric months to string shortnames
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DashboardCharts() {
  const [trendData, setTrendData] = useState(null);
  const [distData, setDistData] = useState(null);
  const [verifiedData, setVerifiedData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      try {
        // 1. Monthly Trends
        const trendRes = await apiCall('GET', '/stats/monthly-average');
        if (trendRes.status === 200 && trendRes.body?.success) {
          const raw = trendRes.body.data || [];
          // Sort chronologically (oldest to newest)
          const sorted = [...raw].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

          setTrendData({
            labels: sorted.map(item => `${MONTH_NAMES[item.month - 1] || item.month} ${item.year}`),
            datasets: [
              {
                label: 'Avg Rating',
                data: sorted.map(item => parseFloat(item.averageRating)),
                borderColor: '#67e8f9',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#06b6d4',
                pointHoverRadius: 7
              }
            ]
          });
        }

        // 2. Rating Distribution
        const distRes = await apiCall('GET', '/ratings');
        if (distRes.status === 200 && distRes.body?.success) {
          const raw = distRes.body.data || [];
          
          // Map scores 1-5
          const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          raw.forEach(item => {
            const rounded = Math.round(item.rating);
            if (rounded >= 1 && rounded <= 5) {
              distribution[rounded] += item.count;
            }
          });

          setDistData({
            labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
            datasets: [
              {
                label: 'Reviews Count',
                data: [
                  distribution[5],
                  distribution[4],
                  distribution[3],
                  distribution[2],
                  distribution[1]
                ],
                backgroundColor: [
                  'rgba(16, 185, 129, 0.85)', // 5 - Green
                  'rgba(6, 182, 212, 0.85)',  // 4 - Cyan
                  'rgba(245, 158, 11, 0.85)',  // 3 - Amber
                  'rgba(139, 92, 246, 0.85)',  // 2 - Purple
                  'rgba(244, 63, 94, 0.85)'    // 1 - Rose
                ],
                borderWidth: 0,
                borderRadius: 6
              }
            ]
          });
        }

        // 3. Verified vs Unverified Doughnut
        const verRes = await apiCall('GET', '/stats/verified-purchases');
        if (verRes.status === 200 && verRes.body?.success) {
          const total = verRes.body.totalReviews || 0;
          const verified = verRes.body.verifiedPurchases || 0;
          const unverified = Math.max(0, total - verified);

          setVerifiedData({
            labels: ['Verified', 'Unverified'],
            datasets: [
              {
                data: [verified, unverified],
                backgroundColor: [
                  '#10b981', // Verified
                  'rgba(255, 255, 255, 0.08)' // Unverified
                ],
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1
              }
            ]
          });
        }
      } catch (err) {
        console.error("Failed loading chart data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0c0e21',
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#a1a1aa', font: { family: 'Outfit', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#a1a1aa', font: { family: 'Outfit', size: 11 } }
      }
    }
  };

  const horizontalBarOptions = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#a1a1aa', precision: 0, font: { family: 'Outfit', size: 11 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#a1a1aa', font: { family: 'Outfit', size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#a1a1aa',
          font: { family: 'Outfit', size: 12 },
          boxWidth: 12,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#0c0e21',
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10
      }
    }
  };

  if (loading) {
    return (
      <div className="charts-grid-secondary" style={{ minHeight: '320px' }}>
        <div className="card-skeleton" style={{ height: '320px' }}></div>
        <div className="card-skeleton" style={{ height: '320px' }}></div>
      </div>
    );
  }

  return (
    <div className="charts-grid-secondary">
      {/* 1. Monthly Trends Chart */}
      <div className="glass-panel chart-card">
        <h3 className="panel-title">Monthly Average Rating</h3>
        <div className="chart-canvas-container">
          {trendData ? (
            <Line data={trendData} options={chartOptions} />
          ) : (
            <div className="text-center font-muted" style={{ padding: '40px' }}>No monthly trend data available.</div>
          )}
        </div>
      </div>

      {/* 2. Rating Distribution Chart */}
      <div className="glass-panel chart-card">
        <h3 className="panel-title">Rating Distribution</h3>
        <div className="chart-canvas-container">
          {distData ? (
            <Bar data={distData} options={horizontalBarOptions} />
          ) : (
            <div className="text-center font-muted" style={{ padding: '40px' }}>No rating distribution data available.</div>
          )}
        </div>
      </div>

      {/* 3. Verified Purchase Doughnut Chart */}
      <div className="glass-panel chart-card">
        <h3 className="panel-title">Verified Purchase Ratio</h3>
        <div className="chart-canvas-container" style={{ height: '200px' }}>
          {verifiedData ? (
            <Doughnut data={verifiedData} options={doughnutOptions} />
          ) : (
            <div className="text-center font-muted" style={{ padding: '40px' }}>No verified stats available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
