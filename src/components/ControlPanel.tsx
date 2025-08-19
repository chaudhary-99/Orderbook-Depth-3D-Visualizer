'use client';

import React, { useState, useEffect } from 'react';
import { VisualizationSettings, Venue, TimeRangeOption } from '@/types';
import {
  Settings,
  BarChart3,
  TrendingUp,
  Zap,
  Eye,
  EyeOff,
  Maximize2,
  Search,
  Clock,
  Filter,
  Activity,
  Target,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Download,
  Lightbulb,
  Layers,
  Thermometer,
  ArrowUpDown
} from 'lucide-react';

interface ControlPanelProps {
  settings: VisualizationSettings;
  venues: Venue[];
  onSettingsChange: (settings: Partial<VisualizationSettings>) => void;
  onVenueToggle: (venueId: string) => void;
  onPlayPause: () => void;
  onReset: () => void;
  onExport?: (format: 'png' | 'pdf' | 'json') => void;
  isPlaying: boolean;
  connectionStatus: boolean;
  performanceMetrics?: {
    fps: number;
    vertices: number;
    renderTime: number;
  };
}

const TIME_RANGES: TimeRangeOption[] = [
  { value: 60000, label: '1m', description: '1 minute' },
  { value: 300000, label: '5m', description: '5 minutes' },
  { value: 900000, label: '15m', description: '15 minutes' },
  { value: 3600000, label: '1h', description: '1 hour' },
  { value: 14400000, label: '4h', description: '4 hours' },
  { value: 86400000, label: '1d', description: '1 day' }
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  venues,
  onSettingsChange,
  onVenueToggle,
  onPlayPause,
  onReset,
  onExport,
  isPlaying,
  connectionStatus,
  performanceMetrics
}) => {
  const [expandedSections, setExpandedSections] = useState({
    venues: true,
    timeRange: true,
    visualization: true,
    advanced: false,
    filters: true,
    search: true,
    performance: false,
    export: false
  });

  const [searchQuery, setSearchQuery] = useState(settings.searchQuery || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Enhanced search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results: any[] = [];
      
      // Search venues
      venues.forEach(venue => {
        if (venue.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            type: 'venue',
            name: venue.name,
            id: venue.id,
            action: () => onVenueToggle(venue.id),
            icon: BarChart3
          });
        }
      });

      // Search price levels
      const searchPrice = parseFloat(searchQuery.replace(/[$,]/g, ''));
      if (!isNaN(searchPrice)) {
        results.push({
          type: 'price',
          name: `$${searchPrice.toLocaleString()}`,
          id: `price-${searchPrice}`,
          action: () => {
            onSettingsChange({
              priceRange: [searchPrice - 1000, searchPrice + 1000]
            });
          },
          icon: TrendingUp
        });
      }

      // Search features
      const features = [
        { name: 'Order Flow', key: 'showOrderFlow', icon: Activity },
        { name: 'Volume Profile', key: 'showVolumeProfile', icon: BarChart3 },
        { name: 'Pressure Zones', key: 'showPressureZones', icon: Target },
        { name: 'Spread Analysis', key: 'showSpreadAnalysis', icon: TrendingUp },
        { name: 'Heatmap', key: 'showMarketDepthHeatmap', icon: Thermometer }
      ];

      features.forEach(feature => {
        if (feature.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            type: 'feature',
            name: feature.name,
            id: feature.key,
            action: () => {
              onSettingsChange({ [feature.key]: true });
            },
            icon: feature.icon
          });
        }
      });

      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, venues, onVenueToggle, onSettingsChange]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSettingsChange({ searchQuery: value });
  };

  const controlGroups = [
    // Search & Navigation
    {
      title: 'Smart Search & Navigation',
      icon: Search,
      key: 'search' as const,
      content: (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search venues, prices, features..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="bg-slate-700 rounded-lg border border-slate-600 max-h-48 overflow-y-auto">
              {searchResults.map((result, index) => {
                const IconComponent = result.icon;
                return (
                  <button
                    key={index}
                    onClick={result.action}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-600 transition-colors text-left"
                  >
                    <IconComponent className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">{result.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{result.type}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="text-xs text-gray-400 bg-slate-800 p-2 rounded">
            💡 Search for venues (Binance, OKX), prices ($97000), or features (Order Flow)
          </div>
        </div>
      )
    },

    // Time Range & Playback Controls
    {
      title: 'Time Range & Playback',
      icon: Clock,
      key: 'timeRange' as const,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => onSettingsChange({ timeRange: range.value })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  settings.timeRange === range.value
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-gray-400 text-center">
            Current: {TIME_RANGES.find(r => r.value === settings.timeRange)?.description || 'Custom'}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onPlayPause}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isPlaying 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={onReset}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">View Mode</label>
            <select
              value={settings.viewMode}
              onChange={(e) => onSettingsChange({ viewMode: e.target.value as 'realtime' | 'historical' })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="realtime">Real-time</option>
              <option value="historical">Historical Analysis</option>
            </select>
          </div>
        </div>
      )
    },

    // Trading Venues
    {
      title: 'Trading Venues',
      icon: BarChart3,
      key: 'venues' as const,
      content: (
        <div className="space-y-3">
          {venues.map((venue) => (
            <div key={venue.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: venue.color }}
                ></div>
                <span className="text-white font-medium">{venue.name}</span>
              </div>
              <button
                onClick={() => onVenueToggle(venue.id)}
                className={`p-1 rounded transition-colors ${
                  venue.enabled ? 'text-green-400' : 'text-gray-500'
                }`}
              >
                {venue.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          ))}
          
          <div className="text-center pt-2 border-t border-slate-600">
            <div className="text-xs text-gray-400">
              Status: {connectionStatus ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            <div className="text-xs text-gray-400">
              Active: {venues.filter(v => v.enabled).length}/{venues.length}
            </div>
          </div>
        </div>
      )
    },

    // Core Visualization Features
    {
      title: 'Core Visualization Features',
      icon: TrendingUp,
      key: 'visualization' as const,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { key: 'showOrderFlow', label: 'Order Flow Visualization', icon: Activity, description: 'Real-time order placement and cancellation' },
              { key: 'showVolumeProfile', label: 'Volume Profile Overlay', icon: BarChart3, description: 'Cumulative volume distribution' },
              { key: 'showSpreadAnalysis', label: 'Spread Analysis', icon: TrendingUp, description: 'Bid-ask spread indicators' },
              { key: 'showPressureZones', label: 'Pressure Zone Detection', icon: Target, description: 'High-pressure order areas' },
              { key: 'showNumericalValues', label: 'Numerical Values', icon: Eye, description: 'Show exact numbers on hover' }
            ].map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.key} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-white font-medium text-sm">{feature.label}</div>
                      <div className="text-xs text-gray-400">{feature.description}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[feature.key as keyof VisualizationSettings] as boolean}
                    onChange={(e) => onSettingsChange({ [feature.key]: e.target.checked })}
                    className="rounded"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )
    },

    // Advanced Features
    {
      title: 'Advanced Features',
      icon: Lightbulb,
      key: 'advanced' as const,
      content: (
        <div className="space-y-4">
          {[
            { key: 'showOrderMatching', label: 'Order Matching Animation', icon: ArrowUpDown, description: 'Animated trade execution visualization' },
            { key: 'showImbalanceVisualization', label: 'Order Imbalance Display', icon: Layers, description: 'Bid/ask ratio visualization' },
            { key: 'showMarketDepthHeatmap', label: 'Market Depth Heatmap', icon: Thermometer, description: 'Volume intensity heatmap' },
            { key: 'lodEnabled', label: 'Level of Detail (LOD)', icon: Maximize2, description: 'Performance optimization' },
            { key: 'touchControlsEnabled', label: 'Mobile Touch Controls', icon: Smartphone, description: 'Touch gestures for mobile' }
          ].map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div key={feature.key} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconComponent className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-white font-medium text-sm">{feature.label}</div>
                    <div className="text-xs text-gray-400">{feature.description}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings[feature.key as keyof VisualizationSettings] as boolean}
                  onChange={(e) => onSettingsChange({ [feature.key]: e.target.checked })}
                  className="rounded"
                />
              </div>
            );
          })}
        </div>
      )
    },

    // Filters & Fine-tuning
    {
      title: 'Filters & Fine-tuning',
      icon: Filter,
      key: 'filters' as const,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Quantity Threshold: {settings.quantityThreshold.toFixed(3)} BTC
            </label>
            <input
              type="range"
              min="0.001"
              max="10"
              step="0.001"
              value={settings.quantityThreshold}
              onChange={(e) => onSettingsChange({ quantityThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.001</span>
              <span>10 BTC</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Animation Speed: {settings.animationSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={settings.animationSpeed}
              onChange={(e) => onSettingsChange({ animationSpeed: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Stop</span>
              <span>3x Fast</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={settings.priceRange?.[0] || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    onSettingsChange({ 
                      priceRange: [value, settings.priceRange?.[1] || value + 1000] 
                    });
                  } else {
                    onSettingsChange({ priceRange: null });
                  }
                }}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={settings.priceRange?.[1] || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    onSettingsChange({ 
                      priceRange: [settings.priceRange?.[0] || value - 1000, value] 
                    });
                  } else {
                    onSettingsChange({ priceRange: null });
                  }
                }}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            {settings.priceRange && (
              <button
                onClick={() => onSettingsChange({ priceRange: null })}
                className="text-xs text-gray-400 hover:text-white mt-1"
              >
                Clear price filter
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => onSettingsChange({ theme: e.target.value as 'dark' | 'light' })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>
        </div>
      )
    },

    // Performance Monitor
    {
      title: 'Performance Monitor',
      icon: Activity,
      key: 'performance' as const,
      content: (
        <div className="space-y-3">
          {performanceMetrics && (
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                <span className="text-sm text-gray-300">FPS</span>
                <span className={`font-mono text-sm ${
                  performanceMetrics.fps >= 50 ? 'text-green-400' : 
                  performanceMetrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {performanceMetrics.fps}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                <span className="text-sm text-gray-300">Vertices</span>
                <span className="font-mono text-sm text-blue-400">
                  {performanceMetrics.vertices.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                <span className="text-sm text-gray-300">Render Time</span>
                <span className={`font-mono text-sm ${
                  performanceMetrics.renderTime <= 16 ? 'text-green-400' : 
                  performanceMetrics.renderTime <= 33 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {performanceMetrics.renderTime.toFixed(1)}ms
                </span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-400 bg-slate-800 p-2 rounded">
            💡 Enable LOD (Level of Detail) in Advanced Features for better performance with large datasets
          </div>
        </div>
      )
    },

    // Export & Sharing
    {
      title: 'Export & Sharing',
      icon: Download,
      key: 'export' as const,
      content: (
        <div className="space-y-3">
          <div className="text-sm text-gray-300 mb-2">Export Options</div>
          
          <div className="grid grid-cols-1 gap-2">
            {onExport && ['png', 'pdf', 'json'].map((format) => (
              <button
                key={format}
                onClick={() => onExport(format as 'png' | 'pdf' | 'json')}
                className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export as {format.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-gray-400 bg-slate-800 p-2 rounded">
            📸 PNG: Screenshot of current view<br/>
            📄 PDF: Comprehensive report<br/>
            📊 JSON: Raw orderbook data
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="bg-slate-900 border-r border-slate-700 h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-lg">Control Panel</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {controlGroups.map((group) => {
          const IconComponent = group.icon;
          return (
            <div key={group.key} className="border border-slate-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(group.key)}
                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium text-sm">{group.title}</span>
                </div>
                {expandedSections[group.key] ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections[group.key] && (
                <div className="p-3 bg-slate-850">
                  {group.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Tips */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="text-xs text-gray-400 space-y-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-400" />
            <div>
              <div className="font-medium text-yellow-400">Pro Tips:</div>
              <div>• Use search to quickly find features</div>
              <div>• Enable LOD for better performance</div>
              <div>• Historical mode shows temporal patterns</div>
              <div>• Touch controls work on mobile devices</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
