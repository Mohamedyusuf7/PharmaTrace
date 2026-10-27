import React, { useState, useEffect } from 'react';
import { Activity, Gauge, Thermometer, Wind, Zap } from 'lucide-react';

export function TelemetrySimulator({ stageName = "Tableting & Compression", isRunning = true }) {
  const [telemetry, setTelemetry] = useState({
    pressure: 18.4,
    rpm: 45.2,
    temp: 21.3,
    humidity: 44.8
  });

  const [history, setHistory] = useState([18.2, 18.3, 18.5, 18.4, 18.6, 18.3, 18.4, 18.5, 18.4]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const nextPressure = parseFloat((prev.pressure + (Math.random() * 0.4 - 0.2)).toFixed(1));
        const nextRpm = parseFloat((prev.rpm + (Math.random() * 0.6 - 0.3)).toFixed(1));
        const nextTemp = parseFloat((prev.temp + (Math.random() * 0.2 - 0.1)).toFixed(1));
        const nextHumidity = parseFloat((prev.humidity + (Math.random() * 0.4 - 0.2)).toFixed(1));

        setHistory((h) => [...h.slice(-14), nextPressure]);

        return {
          pressure: Math.max(16.0, Math.min(21.0, nextPressure)),
          rpm: Math.max(40.0, Math.min(50.0, nextRpm)),
          temp: Math.max(19.0, Math.min(23.5, nextTemp)),
          humidity: Math.max(40.0, Math.min(49.0, nextHumidity))
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--cyan-400)" />
          <h4 style={{ fontSize: '0.95rem', color: '#fff' }}>Live Cleanroom Machine Telemetry</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
          <span className="pulse-dot emerald"></span>
          <span style={{ color: 'var(--emerald-400)', fontWeight: 700 }}>SENSOR FEED LIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {/* Metric 1 */}
        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
            <Gauge size={13} color="var(--emerald-400)" />
            <span>MAIN FORCE</span>
          </div>
          <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald-400)' }}>
            {telemetry.pressure} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>kN</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Spec: 16.0 - 22.0 kN</div>
        </div>

        {/* Metric 2 */}
        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
            <Zap size={13} color="var(--cyan-400)" />
            <span>TURRET SPEED</span>
          </div>
          <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan-400)' }}>
            {telemetry.rpm} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>RPM</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Spec: 40.0 - 50.0 RPM</div>
        </div>

        {/* Metric 3 */}
        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
            <Thermometer size={13} color="var(--amber-400)" />
            <span>BED TEMP</span>
          </div>
          <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--amber-400)' }}>
            {telemetry.temp} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>°C</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Spec: 18.0 - 24.0 °C</div>
        </div>

        {/* Metric 4 */}
        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
            <Wind size={13} color="var(--purple-400)" />
            <span>ROOM RH</span>
          </div>
          <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--purple-400)' }}>
            {telemetry.humidity} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>%</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Spec: 35.0 - 55.0 %</div>
        </div>
      </div>

      {/* Real-time SVG Waveform */}
      <div style={{ background: '#090e17', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          <span>Compression Force Waveform Trend (Sampling: 1 Hz)</span>
          <span className="mono" style={{ color: 'var(--emerald-400)' }}>Current: {telemetry.pressure} kN</span>
        </div>
        <svg viewBox="0 0 300 40" style={{ width: '100%', height: '40px', overflow: 'visible' }}>
          <polyline
            fill="none"
            stroke="var(--emerald-400)"
            strokeWidth="2.5"
            points={history.map((val, idx) => `${(idx / (history.length - 1)) * 300},${40 - ((val - 16) / 6) * 40}`).join(' ')}
          />
          {/* Target Reference Line */}
          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.2)" strokeDasharray="4" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
