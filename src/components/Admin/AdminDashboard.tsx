import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, Database, 
  Server, ShieldAlert, XCircle, RotateCw, Play, BarChart3, AlertOctagon
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    opportunitiesAdded: 0,
    fallbackRate: 0,
    apiLatency: 0
  });

  const [scrapers, setScrapers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLive, setIsLive] = useState(false);

  const API_BASE_URL = "/api/v1";

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [metricsRes, scrapersRes, logsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/metrics`).then(r => r.json()),
          fetch(`${API_BASE_URL}/admin/scrapers`).then(r => r.json()),
          fetch(`${API_BASE_URL}/admin/incidents`).then(r => r.json())
        ]);
        setStats(metricsRes);
        setScrapers(scrapersRes);
        setLogs(logsRes);
      } catch (err) {
        console.error("Failed to load initial admin data", err);
      }
    };
    fetchInitialData();
  }, [API_BASE_URL]);

  // Connect to SSE for real-time telemetry
  useEffect(() => {
    const sse = new EventSource(`${API_BASE_URL}/admin/stream/telemetry`);
    
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'INCIDENT') {
          setLogs(prev => [payload.data, ...prev].slice(0, 50));
        } else if (payload.event === 'METRICS_UPDATE') {
          setStats(prev => ({ ...prev, ...payload.data }));
        } else if (payload.event === 'SCRAPER_UPDATE') {
           setScrapers(prev => prev.map(s => s.name === payload.data.name ? { ...s, ...payload.data } : s));
        }
      } catch (err) {
        console.error("Error parsing SSE message", err);
      }
    };

    sse.onopen = () => setIsLive(true);
    sse.onerror = () => setIsLive(false);

    return () => {
      sse.close();
      setIsLive(false);
    };
  }, [API_BASE_URL]);

  const formatTime = (mins: number) => {
    if (mins === 0) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ${mins%60}m ago`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
            System Operations Center
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time live health, scrapers, and telemetry.</p>
        </div>
        <div className="flex gap-3">
          {isLive ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Monitoring Active
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Disconnected
            </div>
          )}
        </div>
      </div>

      {/* Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center justify-between">
            Active Users <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{(stats.activeUsers || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center justify-between">
            Opps Ingested (24h) <Server className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-green-600">+{(stats.opportunitiesAdded || 0)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center justify-between">
            Fallback Rate <AlertOctagon className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{(stats.fallbackRate || 0).toFixed(1)}%</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center justify-between">
            API Latency <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{(stats.apiLatency || 0)}ms</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scraper Fleet */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Scraper Fleet Status</h3>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded w-fit">4 Active Sources</span>
          </div>
          <div className="divide-y divide-gray-50">
            {scrapers.map(s => (
              <div key={s.name} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {s.status === 'healthy' ? <CheckCircle className="w-5 h-5 text-green-500" /> : 
                   s.status === 'degraded' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : 
                   <XCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500">Last Scrape: {formatTime(s.lastRun)} • {s.items} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full bg-${s.proxyHealth}-500`}></span>
                    <span className="text-xs text-gray-500">Proxy</span>
                  </div>
                    <button 
                    onClick={async () => {
                       try {
                         await fetch(`${API_BASE_URL}/trigger-scraper`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ source_name: s.name })
                         });
                         // Assume backend will send an SSE event soon
                       } catch(e) {
                         console.error("Failed to trigger scraper", e);
                       }
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Force Run">
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-900">Live Incident Stream</h3>
            <span className="text-[10px] uppercase font-bold text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">Live</span>
          </div>
          <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
            {logs.map(log => (
              <div key={log.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="mt-0.5 shrink-0">
                  {log.type === 'CRITICAL' ? <ShieldAlert className="w-5 h-5 text-red-500" /> :
                   log.type === 'WARNING' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                   <Activity className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      log.type === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      log.type === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-xs text-gray-500">{log.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-700">{log.component}</h4>
                  <p className="text-sm text-gray-900">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
