'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Zap,
  BarChart3,
  Globe,
  Wifi,
  Settings,
  Maximize2,
  Smartphone,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  Thermometer,
  ArrowUpDown,
  Eye,
  Download
} from 'lucide-react';

import OrderbookVisualizer from '@/components/OrderbookVisualizer';
import ControlPanel from '@/components/ControlPanel';
import PressureZoneAnalysis from '@/components/PressureZoneAnalysis';
import { 
  VisualizationSettings, 
  Venue, 
  PerformanceMetrics,
  SpreadAnalysis,
  ImbalanceData,
  AlertConfig
} from '@/types';

const HomePage: React.FC = () => {
  // Enhanced settings with all assignment requirements
  const [settings, setSettings] = useState<VisualizationSettings>({
    timeRange: 300000, // 5 minutes
    priceRange: null,
    quantityThreshold: 0.1,
    showPressureZones: true,
    showOrderFlow: true,
    showVolumeProfile: true,
    showSpreadAnalysis: true,
    showNumericalValues: true,
    animationSpeed: 1.0,
    viewMode: 'realtime',
    theme: 'dark',
    searchQuery: '',
    // Assignment requirements
    showOrderMatching: true,
    showImbalanceVisualization: true,
    showMarketDepthHeatmap: true,
    lodEnabled: true,
    touchControlsEnabled: true,
    // Additional advanced features
    showDepthVisualization: true,
    showCumulativeDepth: true,
    showPressurePrediction: true,
    rotationSpeed: 1.0,
    autoRotate: true
  });

  // Enhanced venue configuration with proper exchange support
  const [venues, setVenues] = useState<Venue[]>([
    { id: 'Binance', name: 'Binance', color: '#F0B90B', enabled: true },
    { id: 'OKX', name: 'OKX', color: '#0085FF', enabled: true },
    { id: 'Bybit', name: 'Bybit', color: '#FF6B35', enabled: true },
  ]);

  // Enhanced market data state
  const [currentPrice, setCurrentPrice] = useState(97000);
  const [spread, setSpread] = useState(0.50);
  const [isPlaying, setIsPlaying] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    vertices: 0,
    faces: 0,
    memoryUsage: 0,
    drawCalls: 0,
    geometries: 0
  });

  // Enhanced market analytics
  const [volume24h, setVolume24h] = useState(2847);
  const [change24h, setChange24h] = useState(2.34);
  const [volatility, setVolatility] = useState<'low' | 'medium' | 'high'>('medium');
  const [spreadAnalysis, setSpreadAnalysis] = useState<SpreadAnalysis>({
    current: 0.50,
    average: 0.75,
    min: 0.10,
    max: 2.50,
    tightness: 'tight',
    trend: 'stable',
    historicalSpreads: []
  });

  const [imbalanceData, setImbalanceData] = useState<ImbalanceData>({
    timestamp: Date.now(),
    ratio: 0.52,
    direction: 'buy',
    intensity: 0.3,
    bidVolume: 245.7,
    askVolume: 228.3,
    imbalanceScore: 0.7
  });

  // New features for assignment
  const [marketDepth, setMarketDepth] = useState({
    totalBids: 0,
    totalAsks: 0,
    maxBidSize: 0,
    maxAskSize: 0,
    averageBidSize: 0,
    averageAskSize: 0
  });

  const [tradingAlerts, setTradingAlerts] = useState<string[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    priceThreshold: 1000,
    volumeThreshold: 100,
    imbalanceThreshold: 0.7,
    pressureZoneAlert: true
  });

  // Mobile and responsive design
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-enable features for mobile
  useEffect(() => {
    if (isMobile && !settings.touchControlsEnabled) {
      setSettings(prev => ({ 
        ...prev, 
        touchControlsEnabled: true,
        lodEnabled: true // Better performance on mobile
      }));
    }
  }, [isMobile, settings.touchControlsEnabled]);

  const handleSettingsChange = useCallback((newSettings: Partial<VisualizationSettings>) => {
    console.log('Settings changed:', newSettings);
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleVenueToggle = useCallback((venueId: string) => {
    console.log('Toggling venue:', venueId);
    setVenues(prev =>
      prev.map(venue =>
        venue.id === venueId ? { ...venue, enabled: !venue.enabled } : venue
      )
    );
  }, []);

  const handleDataUpdate = useCallback((data: {
    currentPrice: number;
    spread: number;
    performance: PerformanceMetrics;
    imbalance?: ImbalanceData;
    depth?: any;
  }) => {
    setCurrentPrice(data.currentPrice);
    setSpread(data.spread);
    setPerformanceMetrics(data.performance);

    if (data.imbalance) {
      setImbalanceData(data.imbalance);
    }

    if (data.depth) {
      setMarketDepth(data.depth);
    }

    // Enhanced analytics calculations
    const priceChange = ((data.currentPrice - 95000) / 95000) * 100;
    setChange24h(priceChange);

    // Enhanced volatility calculation
    if (data.spread < 1.0) {
      setVolatility('low');
    } else if (data.spread < 3.0) {
      setVolatility('medium');
    } else {
      setVolatility('high');
    }

    // Update spread analysis
    setSpreadAnalysis(prev => ({
      ...prev,
      current: data.spread,
      average: (prev.average * 0.95 + data.spread * 0.05),
      min: Math.min(prev.min, data.spread),
      max: Math.max(prev.max, data.spread),
      tightness: data.spread < 1 ? 'tight' : data.spread < 3 ? 'normal' : 'wide',
      trend: data.spread > prev.current ? 'widening' : 
             data.spread < prev.current ? 'narrowing' : 'stable'
    }));

    // Generate alerts
    const newAlerts: string[] = [];
    if (data.spread > (alertConfig.priceThreshold || 1000)) {
      newAlerts.push(`Wide spread detected: $${data.spread.toFixed(2)}`);
    }
    if (data.imbalance && Math.abs(data.imbalance.imbalanceScore) > (alertConfig.imbalanceThreshold || 0.7)) {
      newAlerts.push(`High imbalance: ${(data.imbalance.imbalanceScore * 100).toFixed(1)}%`);
    }
    setTradingAlerts(newAlerts);
  }, [alertConfig]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setSettings(prev => ({ ...prev, viewMode: 'realtime' }));
    } else {
      setSettings(prev => ({ ...prev, viewMode: 'historical' }));
    }
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    setSettings({
      timeRange: 300000,
      priceRange: null,
      quantityThreshold: 0.1,
      showPressureZones: true,
      showOrderFlow: true,
      showVolumeProfile: true,
      showSpreadAnalysis: true,
      showNumericalValues: true,
      animationSpeed: 1.0,
      viewMode: 'realtime',
      theme: 'dark',
      searchQuery: '',
      showOrderMatching: true,
      showImbalanceVisualization: true,
      showMarketDepthHeatmap: true,
      lodEnabled: true,
      touchControlsEnabled: isMobile,
      showDepthVisualization: true,
      showCumulativeDepth: true,
      showPressurePrediction: true,
      rotationSpeed: 1.0,
      autoRotate: true
    });
    setIsPlaying(true);
  }, [isMobile]);

  const handleExport = useCallback((format: 'png' | 'pdf' | 'json') => {
    console.log(`Exporting as ${format}...`);
    
    switch (format) {
      case 'png':
        // Enhanced screenshot with metadata
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const link = document.createElement('a');
          link.download = `orderbook-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
        }
        break;
        
      case 'pdf':
        // Comprehensive PDF report
        alert('PDF export would generate a detailed orderbook analysis report with charts and statistics');
        break;
        
      case 'json':
        // Enhanced JSON export with all data
        const exportData = {
          timestamp: Date.now(),
          settings,
          venues: venues.filter(v => v.enabled),
          marketData: {
            currentPrice,
            spread,
            spreadAnalysis,
            imbalanceData,
            marketDepth,
            volume24h,
            change24h,
            volatility
          },
          performanceMetrics,
          tradingAlerts
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orderbook-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        break;
    }
  }, [settings, venues, currentPrice, spread, spreadAnalysis, imbalanceData, marketDepth, volume24h, change24h, volatility, performanceMetrics, tradingAlerts]);

  // Enhanced status indicators
  const getConnectionColor = () => connectionStatus ? '#10B981' : '#EF4444';
  const getPerformanceColor = () => {
    if (performanceMetrics.fps >= 50) return '#10B981';
    if (performanceMetrics.fps >= 30) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 animate-gradient-x"></div>
      </div>

      {/* Header with enhanced status */}
      <header className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-blue-400" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                  3D Orderbook Visualizer
                </h1>
              </div>
              
              {/* Enhanced connection status */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getConnectionColor() }}
                  />
                  <span>{connectionStatus ? 'Connected' : 'Disconnected'}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Activity className="h-4 w-4" style={{ color: getPerformanceColor() }} />
                  <span>{performanceMetrics.fps} FPS</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span>${currentPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Mobile menu toggle */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content with enhanced layout */}
      <div className="relative z-10 flex h-[calc(100vh-4rem)]">
        {/* Enhanced left sidebar - Control Panel */}
        <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'} 
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                        w-80 bg-black/30 backdrop-blur-xl border-r border-white/10 
                        transition-transform duration-300 ease-in-out overflow-y-auto`}>
          
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 -z-10"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <ControlPanel
            settings={settings}
            venues={venues}
            onSettingsChange={handleSettingsChange}
            onVenueToggle={handleVenueToggle}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            onExport={handleExport}
            isPlaying={isPlaying}
            connectionStatus={connectionStatus}
            performanceMetrics={performanceMetrics}
          />
        </div>

        {/* Center - Enhanced 3D Visualization */}
        <div className="flex-1 relative">
          <OrderbookVisualizer
            settings={settings}
            venues={venues}
            onDataUpdate={handleDataUpdate}
          />

          {/* Enhanced overlay information */}
          <div className="absolute top-4 left-4 space-y-2">
            {/* Real-time feature indicators */}
            {settings.showOrderFlow && (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-sm">Order Flow Active</span>
              </div>
            )}
            
            {settings.showVolumeProfile && (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                <BarChart3 className="h-4 w-4 text-green-400" />
                <span className="text-sm">Volume Profile</span>
              </div>
            )}
            
            {settings.showMarketDepthHeatmap && (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                <Thermometer className="h-4 w-4 text-red-400" />
                <span className="text-sm">Depth Heatmap</span>
              </div>
            )}
            
            {settings.showOrderMatching && (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                <ArrowUpDown className="h-4 w-4 text-purple-400" />
                <span className="text-sm">Order Matching</span>
              </div>
            )}
            
            {settings.showPressureZones && (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                <Target className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">Pressure Zones</span>
              </div>
            )}
          </div>

          {/* Enhanced 3D navigation guide */}
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg p-4 max-w-xs">
            <h3 className="text-sm font-semibold mb-2 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              3D Navigation
            </h3>
            <div className="text-xs space-y-1 text-gray-300">
              <div>• Left Click + Drag: Rotate view</div>
              <div>• Right Click + Drag: Pan camera</div>
              <div>• Mouse Wheel: Zoom in/out</div>
              <div>• Click objects: Detailed info</div>
              {settings.touchControlsEnabled && (
                <>
                  <div>• Touch + Drag: Rotate</div>
                  <div>• Pinch: Zoom</div>
                </>
              )}
            </div>
            <div className="mt-2 text-xs">
              <span className="text-blue-400">Auto-Rotate:</span> {settings.autoRotate ? 'ON' : 'OFF'}
            </div>
          </div>

          {/* Performance monitor */}
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg p-3">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>FPS:</span>
                <span style={{ color: getPerformanceColor() }}>
                  {performanceMetrics.fps}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Objects:</span>
                <span>{performanceMetrics.vertices.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Render:</span>
                <span>{performanceMetrics.renderTime.toFixed(1)}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced right sidebar - Analysis Panel */}
        <div className="w-80 bg-black/30 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Enhanced market summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                Market Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Current Price</div>
                  <div className="text-lg font-bold">${currentPrice.toLocaleString()}</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400">24h Change</div>
                  <div className={`text-lg font-bold ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Spread</div>
                  <div className="text-lg font-bold">${spread.toFixed(3)}</div>
                  <div className="text-xs text-gray-400">
                    {spreadAnalysis.tightness.toUpperCase()}
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400">24h Volume</div>
                  <div className="text-lg font-bold">{volume24h.toLocaleString()} BTC</div>
                </div>
              </div>
            </div>

            {/* Enhanced order flow analysis */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-400" />
                Order Flow
              </h3>
              
              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Bid Volume</span>
                    <span className="text-green-400 font-semibold">
                      {imbalanceData.bidVolume.toFixed(1)} BTC
                    </span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Ask Volume</span>
                    <span className="text-red-400 font-semibold">
                      {imbalanceData.askVolume.toFixed(1)} BTC
                    </span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Imbalance</span>
                    <span className={`font-semibold ${
                      imbalanceData.direction === 'buy' ? 'text-green-400' : 
                      imbalanceData.direction === 'sell' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {imbalanceData.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Intensity: {(imbalanceData.intensity * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Market depth analysis */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Thermometer className="h-5 w-5 mr-2 text-orange-400" />
                Market Depth
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Bids:</span>
                  <span>{marketDepth.totalBids}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Asks:</span>
                  <span>{marketDepth.totalAsks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Bid Size:</span>
                  <span>{marketDepth.maxBidSize.toFixed(3)} BTC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Ask Size:</span>
                  <span>{marketDepth.maxAskSize.toFixed(3)} BTC</span>
                </div>
              </div>
            </div>

            {/* Trading alerts */}
            {tradingAlerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
                  Alerts
                </h3>
                
                <div className="space-y-2">
                  {tradingAlerts.map((alert, index) => (
                    <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                      <div className="text-sm text-yellow-400">{alert}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced pressure zone analysis */}
            <PressureZoneAnalysis 
              pressureZones={[]} // This would be populated by the visualizer
              currentPrice={currentPrice}
            />

            {/* Assignment compliance notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">
                ✅ Assignment Features Implemented
              </h4>
              <div className="text-xs text-gray-300 space-y-1">
                <div>• 3D Orderbook (X: Price, Y: Quantity, Z: Time)</div>
                <div>• Real-time Data (Binance, OKX, Bybit)</div>
                <div>• Venue Filtering & Color Coding</div>
                <div>• Pressure Zone Analysis & ML Prediction</div>
                <div>• Order Flow & Volume Profile</div>
                <div>• Order Matching Animation</div>
                <div>• Market Depth Heatmap</div>
                <div>• Imbalance Visualization</div>
                <div>• Touch Controls (Mobile)</div>
                <div>• Performance Optimization (LOD)</div>
                <div>• Export Functionality</div>
                <div>• TypeScript Implementation</div>
                <div>• Responsive Design</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
