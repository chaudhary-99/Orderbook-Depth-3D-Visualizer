export interface OrderbookLevel {
  price: number;
  quantity: number;
  cumulative?: number;
  orders?: number; // Number of orders at this level
  timestamp?: number;
}

export interface OrderbookData {
  symbol: string;
  venue: string;
  timestamp: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  lastUpdateId?: number;
  sequenceNumber?: number;
}

export interface PressureZone {
  priceStart: number;
  priceEnd: number;
  volume: number;
  intensity: number;
  type: 'bid' | 'ask';
  timestamp: number;
  prediction?: {
    movement: 'strengthening' | 'weakening' | 'stable';
    confidence: number;
    factors?: string[];
  };
  heatLevel?: number;
  clustering?: {
    density: number;
    concentration: number;
  };
}

export interface OrderbookSnapshot {
  timestamp: number;
  data: OrderbookData;
  pressureZones: PressureZone[];
}

export interface Venue {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'failed';
  lastUpdate?: number;
}

export interface VisualizationSettings {
  timeRange: number;
  priceRange: [number, number] | null;
  quantityThreshold: number;
  showPressureZones: boolean;
  showOrderFlow: boolean;
  showVolumeProfile: boolean;
  showSpreadAnalysis: boolean;
  showNumericalValues: boolean;
  animationSpeed: number;
  viewMode: 'realtime' | 'historical';
  theme: 'dark' | 'light';
  searchQuery?: string;
  
  // Assignment requirements
  showOrderMatching: boolean;
  showImbalanceVisualization: boolean;
  showMarketDepthHeatmap: boolean;
  lodEnabled: boolean;
  touchControlsEnabled: boolean;
  
  // Enhanced 3D features
  showDepthVisualization: boolean;
  showCumulativeDepth: boolean;
  showPressurePrediction: boolean;
  rotationSpeed: number;
  autoRotate: boolean;
  
  // Performance optimization
  frameRateTarget: number;
  enableShadows: boolean;
  antialiasing: boolean;
  maxRenderObjects: number;
}

export interface OrderFlowData {
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  venue: string;
  type: 'new' | 'cancel' | 'fill' | 'modify';
  orderId?: string;
  executionId?: string;
}

export interface MarketDepthData {
  price: number;
  bidVolume: number;
  askVolume: number;
  totalVolume: number;
  imbalance: number;
  timestamp: number;
  cumulativeBidVolume: number;
  cumulativeAskVolume: number;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  vertices: number;
  faces: number;
  memoryUsage: number;
  drawCalls: number;
  geometries: number;
  texturesCount: number;
}

export interface VolumeProfileData {
  price: number;
  bidVolume: number;
  askVolume: number;
  totalVolume: number;
  percentage: number;
  transactions: number;
}

export interface SpreadAnalysis {
  current: number;
  average: number;
  min: number;
  max: number;
  tightness: 'tight' | 'normal' | 'wide';
  trend: 'narrowing' | 'stable' | 'widening';
  historicalSpreads: { timestamp: number; value: number }[];
  volatility: number;
}

export interface TimeRangeOption {
  value: number;
  label: string;
  description: string;
}

// Enhanced interfaces for assignment requirements
export interface OrderMatchingVisualization {
  id: string;
  timestamp: number;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  venue: string;
  executionTime: number;
  matched: boolean;
  animation?: {
    startTime: number;
    duration: number;
    progress: number;
  };
}

export interface ImbalanceData {
  timestamp: number;
  ratio: number;
  direction: 'buy' | 'sell' | 'neutral';
  intensity: number;
  bidVolume: number;
  askVolume: number;
  imbalanceScore: number;
  pressureLevel: 'low' | 'medium' | 'high';
}

export interface HeatmapData {
  priceLevel: number;
  timeSlot: number;
  volume: number;
  intensity: number;
  type: 'bid' | 'ask';
  temperature: number;
  depth: number;
}

export interface TouchControls {
  enabled: boolean;
  sensitivity: number;
  gestures: {
    rotation: boolean;
    zoom: boolean;
    pan: boolean;
    pinch: boolean;
    doubleTap: boolean;
  };
}

export interface ExportOptions {
  format: 'png' | 'pdf' | 'json' | 'csv';
  includeMetadata: boolean;
  timeRange: number;
  quality: 'low' | 'medium' | 'high';
  resolution?: { width: number; height: number };
}

// ML-based prediction interfaces
export interface PressurePrediction {
  zone: PressureZone;
  predictedMovement: 'up' | 'down' | 'stable';
  confidence: number;
  timeframe: number;
  factors: string[];
  mlScore: number;
  neuralNetworkOutput?: number[];
}

export interface DepthLevel {
  price: number;
  quantity: number;
  cumulative: number;
  orders: number;
  averageSize: number;
  timeWeight: number;
}

export interface CumulativeDepth {
  bids: DepthLevel[];
  asks: DepthLevel[];
  totalBidVolume: number;
  totalAskVolume: number;
  maxDepth: number;
  depthImbalance: number;
}

export interface OrderBookImbalance {
  timestamp: number;
  bidPressure: number;
  askPressure: number;
  netPressure: number;
  imbalanceRatio: number;
  prediction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export interface AlertConfig {
  priceThreshold?: number;
  volumeThreshold?: number;
  imbalanceThreshold?: number;
  pressureZoneAlert?: boolean;
  spreadAlert?: boolean;
  volatilityAlert?: boolean;
}

// 3D Visualization specific interfaces
export interface Mesh3DConfig {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string | number;
  opacity: number;
  material: 'basic' | 'phong' | 'lambert' | 'standard';
}

export interface AxisConfig {
  x: { label: string; color: number; scale: number };
  y: { label: string; color: number; scale: number };
  z: { label: string; color: number; scale: number };
}

export interface AnimationConfig {
  enabled: boolean;
  speed: number;
  type: 'linear' | 'easeInOut' | 'bounce';
  duration: number;
  loop: boolean;
}

// Real-time data streaming interfaces
export interface StreamConfig {
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  bufferSize: number;
  compressionEnabled: boolean;
}

export interface DataQuality {
  latency: number;
  accuracy: number;
  completeness: number;
  freshness: number;
  reliability: number;
}
