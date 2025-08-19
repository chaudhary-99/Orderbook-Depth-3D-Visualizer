import {
  OrderbookData,
  OrderbookLevel,
  OrderbookSnapshot,
  CumulativeDepth,
  DepthLevel,
  VolumeProfileData,
  SpreadAnalysis,
  HistoricalDataPoint,
  ZAxisTimeData,
  MLPrediction
} from '@/types';

export class OrderbookProcessor {
  private snapshots: Map<string, OrderbookSnapshot[]> = new Map();
  private maxSnapshots = 1000;
  private spreadHistory: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private zAxisTimeData: ZAxisTimeData;
  private mlModel: any = null; // Would integrate with TensorFlow.js in production

  constructor() {
    this.zAxisTimeData = {
      currentTime: Date.now(),
      timeWindow: 300000, // 5 minutes
      timeSlices: 50,
      zSpacing: 10,
      dataPoints: []
    };
    this.initializeMLModel();
  }

  private initializeMLModel() {
    // Initialize basic ML prediction model
    // In production, this would load a pre-trained TensorFlow.js model
    console.log('Initializing ML prediction model...');
  }

  addSnapshot(data: OrderbookData, pressureZones: any[] = []) {
    const key = `${data.venue}-${data.symbol}`;
    if (!this.snapshots.has(key)) {
      this.snapshots.set(key, []);
    }

    const snapshots = this.snapshots.get(key)!;
    
    // Calculate Z-axis position based on time
    const zPosition = this.calculateZPosition(data.timestamp);
    
    const snapshot: OrderbookSnapshot = {
      timestamp: data.timestamp,
      data: {
        ...data,
        bids: this.calculateCumulative(data.bids, 'desc'),
        asks: this.calculateCumulative(data.asks, 'asc')
      },
      pressureZones,
      zAxisPosition: zPosition
    };

    snapshots.push(snapshot);

    // Keep only recent snapshots
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift();
    }

    // Update spread history
    this.updateSpreadHistory(data);
    
    // Update historical data for Z-axis representation
    this.updateHistoricalData(key, data, pressureZones);
    
    // Update Z-axis time data
    this.updateZAxisTimeData(snapshot);
  }

  private calculateZPosition(timestamp: number): number {
    const timeDiff = this.zAxisTimeData.currentTime - timestamp;
    const normalizedTime = timeDiff / this.zAxisTimeData.timeWindow;
    return normalizedTime * this.zAxisTimeData.zSpacing * this.zAxisTimeData.timeSlices;
  }

  private updateZAxisTimeData(snapshot: OrderbookSnapshot) {
    const historicalPoint: HistoricalDataPoint = {
      timestamp: snapshot.timestamp,
      orderbook: snapshot.data,
      pressureZones: snapshot.pressureZones,
      orderFlow: [], // Would be populated with real order flow data
      zPosition: snapshot.zAxisPosition
    };

    this.zAxisTimeData.dataPoints.push(historicalPoint);
    
    // Keep only data within time window
    const cutoffTime = Date.now() - this.zAxisTimeData.timeWindow;
    this.zAxisTimeData.dataPoints = this.zAxisTimeData.dataPoints.filter(
      point => point.timestamp >= cutoffTime
    );
    
    // Update current time
    this.zAxisTimeData.currentTime = Date.now();
  }

  private updateHistoricalData(key: string, data: OrderbookData, pressureZones: any[]) {
    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }

    const history = this.historicalData.get(key)!;
    const zPosition = this.calculateZPosition(data.timestamp);
    
    const historicalPoint: HistoricalDataPoint = {
      timestamp: data.timestamp,
      orderbook: data,
      pressureZones,
      orderFlow: [],
      zPosition
    };

    history.push(historicalPoint);

    // Keep only recent historical data
    if (history.length > this.maxSnapshots) {
      history.shift();
    }
  }

  private calculateCumulative(levels: OrderbookLevel[], order: 'asc' | 'desc'): OrderbookLevel[] {
    const sorted = [...levels].sort((a, b) =>
      order === 'asc' ? a.price - b.price : b.price - a.price
    );

    let cumulative = 0;
    return sorted.map(level => {
      cumulative += level.quantity;
      return { ...level, cumulative };
    });
  }

  private updateSpreadHistory(data: OrderbookData) {
    if (data.bids.length === 0 || data.asks.length === 0) return;

    const key = `${data.venue}-${data.symbol}`;
    const spread = this.calculateSpread(data);

    if (!this.spreadHistory.has(key)) {
      this.spreadHistory.set(key, []);
    }

    const history = this.spreadHistory.get(key)!;
    history.push({ timestamp: data.timestamp, value: spread });

    // Keep only last 1000 spread records
    if (history.length > 1000) {
      history.shift();
    }
  }

  getSnapshots(venue: string, symbol: string, timeRange?: number): OrderbookSnapshot[] {
    const key = `${venue}-${symbol}`;
    const snapshots = this.snapshots.get(key) || [];
    
    if (!timeRange) return snapshots;

    const cutoffTime = Date.now() - timeRange;
    return snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  getHistoricalData(venue: string, symbol: string, timeRange?: number): HistoricalDataPoint[] {
    const key = `${venue}-${symbol}`;
    const data = this.historicalData.get(key) || [];
    
    if (!timeRange) return data;

    const cutoffTime = Date.now() - timeRange;
    return data.filter(point => point.timestamp >= cutoffTime);
  }

  getZAxisTimeData(): ZAxisTimeData {
    return { ...this.zAxisTimeData };
  }

  getLatestSnapshot(venue: string, symbol: string): OrderbookSnapshot | null {
    const key = `${venue}-${symbol}`;
    const snapshots = this.snapshots.get(key) || [];
    return snapshots[snapshots.length - 1] || null;
  }

  getMergedOrderbook(symbol: string, venues: string[]): OrderbookData | null {
    const latestSnapshots = venues
      .map(venue => this.getLatestSnapshot(venue, symbol))
      .filter(snapshot => snapshot !== null) as OrderbookSnapshot[];

    if (latestSnapshots.length === 0) return null;

    const mergedBids = this.mergeLevels(
      latestSnapshots.flatMap(s => s.data.bids),
      'desc'
    );

    const mergedAsks = this.mergeLevels(
      latestSnapshots.flatMap(s => s.data.asks),
      'asc'
    );

    return {
      symbol,
      venue: 'Merged',
      timestamp: Math.max(...latestSnapshots.map(s => s.timestamp)),
      bids: mergedBids.slice(0, 20),
      asks: mergedAsks.slice(0, 20)
    };
  }

  private mergeLevels(levels: OrderbookLevel[], order: 'asc' | 'desc'): OrderbookLevel[] {
    const priceMap = new Map<number, number>();

    levels.forEach(level => {
      const existing = priceMap.get(level.price) || 0;
      priceMap.set(level.price, existing + level.quantity);
    });

    const merged = Array.from(priceMap.entries()).map(([price, quantity]) => ({
      price,
      quantity
    }));

    return merged.sort((a, b) =>
      order === 'asc' ? a.price - b.price : b.price - a.price
    );
  }

  calculateSpread(data: OrderbookData): number {
    if (data.bids.length === 0 || data.asks.length === 0) return 0;

    const bestBid = Math.max(...data.bids.map(b => b.price));
    const bestAsk = Math.min(...data.asks.map(a => a.price));
    return bestAsk - bestBid;
  }

  // Enhanced spread analysis with venue-specific data
  calculateAdvancedSpreadAnalysis(venue: string, symbol: string): SpreadAnalysis {
    const key = `${venue}-${symbol}`;
    const history = this.spreadHistory.get(key) || [];

    if (history.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        tightness: 'normal',
        trend: 'stable',
        historicalSpreads: [],
        volatility: 0,
        venues: {}
      };
    }

    const spreads = history.map(h => h.value);
    const current = spreads[spreads.length - 1];
    const average = spreads.reduce((sum, s) => sum + s, 0) / spreads.length;
    const min = Math.min(...spreads);
    const max = Math.max(...spreads);

    // Calculate volatility
    const variance = spreads.reduce((sum, spread) => sum + Math.pow(spread - average, 2), 0) / spreads.length;
    const volatility = Math.sqrt(variance);

    // Calculate trend
    const recentSpreads = spreads.slice(-10);
    const trend = recentSpreads.length >= 2 ? this.calculateTrend(recentSpreads) : 0;

    let trendDirection: 'narrowing' | 'stable' | 'widening';
    if (trend > 0.01) {
      trendDirection = 'widening';
    } else if (trend < -0.01) {
      trendDirection = 'narrowing';
    } else {
      trendDirection = 'stable';
    }

    // Determine tightness
    let tightness: 'tight' | 'normal' | 'wide';
    if (current < average * 0.7) {
      tightness = 'tight';
    } else if (current > average * 1.3) {
      tightness = 'wide';
    } else {
      tightness = 'normal';
    }

    return {
      current,
      average,
      min,
      max,
      tightness,
      trend: trendDirection,
      historicalSpreads: history.slice(-100),
      volatility,
      venues: { [venue]: current }
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  // Enhanced volume profile with time-weighted calculations
  calculateVolumeProfile(snapshots: OrderbookSnapshot[], priceStep: number = 10): VolumeProfileData[] {
    const volumeMap = new Map<number, {
      bidVolume: number;
      askVolume: number;
      timeWeightedVolume: number;
      transactions: number;
      venues: Set<string>;
    }>();

    const currentTime = Date.now();

    snapshots.forEach(snapshot => {
      const timeWeight = Math.exp(-(currentTime - snapshot.timestamp) / 300000); // 5-minute decay

      [...snapshot.data.bids, ...snapshot.data.asks].forEach(level => {
        const roundedPrice = Math.round(level.price / priceStep) * priceStep;
        const existing = volumeMap.get(roundedPrice) || {
          bidVolume: 0,
          askVolume: 0,
          timeWeightedVolume: 0,
          transactions: 0,
          venues: new Set()
        };

        if (snapshot.data.bids.includes(level)) {
          existing.bidVolume += level.quantity;
        } else {
          existing.askVolume += level.quantity;
        }

        existing.timeWeightedVolume += level.quantity * timeWeight;
        existing.transactions += 1;
        existing.venues.add(snapshot.data.venue);

        volumeMap.set(roundedPrice, existing);
      });
    });

    const totalVolume = Array.from(volumeMap.values())
      .reduce((sum, vol) => sum + vol.bidVolume + vol.askVolume, 0);

    return Array.from(volumeMap.entries())
      .map(([price, volumes]) => ({
        price,
        bidVolume: volumes.bidVolume,
        askVolume: volumes.askVolume,
        totalVolume: volumes.bidVolume + volumes.askVolume,
        percentage: ((volumes.bidVolume + volumes.askVolume) / totalVolume) * 100,
        transactions: volumes.transactions,
        timeWeightedVolume: volumes.timeWeightedVolume,
        venue: Array.from(volumes.venues).join(', ')
      }))
      .sort((a, b) => a.price - b.price);
  }

  // Enhanced cumulative depth calculation with Z-axis positioning
  calculateCumulativeDepth(data: OrderbookData): CumulativeDepth {
    const processLevels = (levels: OrderbookLevel[], zPosition: number): DepthLevel[] => {
      let cumulative = 0;
      return levels.map(level => {
        cumulative += level.quantity;
        return {
          price: level.price,
          quantity: level.quantity,
          cumulative,
          orders: level.orders || 1,
          averageSize: level.quantity / (level.orders || 1),
          timeWeight: Math.exp(-(Date.now() - (level.timestamp || data.timestamp)) / 300000),
          venue: data.venue,
          zPosition
        };
      });
    };

    const zPosition = this.calculateZPosition(data.timestamp);
    const sortedBids = [...data.bids].sort((a, b) => b.price - a.price);
    const sortedAsks = [...data.asks].sort((a, b) => a.price - b.price);

    const bids = processLevels(sortedBids, zPosition);
    const asks = processLevels(sortedAsks, zPosition);

    const totalBidVolume = bids.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskVolume = asks.reduce((sum, level) => sum + level.quantity, 0);

    const maxDepth = Math.max(
      bids.length > 0 ? bids[bids.length - 1].cumulative : 0,
      asks.length > 0 ? asks[asks.length - 1].cumulative : 0
    );

    const depthImbalance = totalBidVolume / (totalBidVolume + totalAskVolume) - 0.5;

    return {
      bids,
      asks,
      totalBidVolume,
      totalAskVolume,
      maxDepth,
      depthImbalance,
      timestamp: data.timestamp,
      venue: data.venue
    };
  }

  // Generate enhanced depth visualization data with Z-axis
  generateDepthChartData(data: OrderbookData, maxLevels: number = 50): {
    bids: { x: number; y: number; z: number }[];
    asks: { x: number; y: number; z: number }[];
  } {
    const depth = this.calculateCumulativeDepth(data);
    const zPosition = this.calculateZPosition(data.timestamp);

    const bids = depth.bids
      .slice(0, maxLevels)
      .map(level => ({ x: level.price, y: level.cumulative, z: zPosition }));

    const asks = depth.asks
      .slice(0, maxLevels)
      .map(level => ({ x: level.price, y: level.cumulative, z: zPosition }));

    return { bids, asks };
  }

  // Enhanced market impact calculation
  calculateMarketImpact(data: OrderbookData, tradeSize: number, side: 'buy' | 'sell'): {
    averagePrice: number;
    priceImpact: number;
    slippage: number;
    worstPrice: number;
    executionTime: number;
  } {
    const levels = side === 'buy' ?
      [...data.asks].sort((a, b) => a.price - b.price) :
      [...data.bids].sort((a, b) => b.price - a.price);

    if (levels.length === 0) {
      return {
        averagePrice: 0,
        priceImpact: 0,
        slippage: 0,
        worstPrice: 0,
        executionTime: 0
      };
    }

    const bestPrice = levels[0].price;
    let remainingSize = tradeSize;
    let totalCost = 0;
    let worstPrice = bestPrice;
    let levelsUsed = 0;

    for (const level of levels) {
      if (remainingSize <= 0) break;

      const sizeAtLevel = Math.min(remainingSize, level.quantity);
      totalCost += sizeAtLevel * level.price;
      remainingSize -= sizeAtLevel;
      worstPrice = level.price;
      levelsUsed++;
    }

    const averagePrice = totalCost / (tradeSize - remainingSize);
    const priceImpact = Math.abs((averagePrice - bestPrice) / bestPrice) * 100;
    const slippage = Math.abs((worstPrice - bestPrice) / bestPrice) * 100;
    
    // Estimate execution time based on levels used
    const executionTime = levelsUsed * 0.1; // 0.1 seconds per level

    return {
      averagePrice,
      priceImpact,
      slippage,
      worstPrice,
      executionTime
    };
  }

  // ML-based prediction functionality
  generateMLPrediction(venue: string, symbol: string, timeHorizon: number = 300000): MLPrediction {
    const historicalData = this.getHistoricalData(venue, symbol, timeHorizon * 2);
    
    if (historicalData.length < 10) {
      return {
        timestamp: Date.now(),
        priceTarget: 0,
        confidence: 0,
        timeHorizon,
        factors: ['Insufficient data'],
        neuralNetworkOutput: [0.5],
        predictionType: 'price_movement'
      };
    }

    // Simple ML simulation (in production, would use actual TensorFlow.js model)
    const features = this.extractMLFeatures(historicalData);
    const prediction = this.simulateNeuralNetworkPrediction(features);

    return {
      timestamp: Date.now(),
      priceTarget: prediction.priceTarget,
      confidence: prediction.confidence,
      timeHorizon,
      factors: prediction.factors,
      neuralNetworkOutput: prediction.output,
      predictionType: 'price_movement',
      venue
    };
  }

  private extractMLFeatures(data: HistoricalDataPoint[]): number[] {
    // Extract features for ML model
    const prices = data.map(d => {
      const bestBid = Math.max(...d.orderbook.bids.map(b => b.price));
      const bestAsk = Math.min(...d.orderbook.asks.map(a => a.price));
      return (bestBid + bestAsk) / 2;
    });

    const volumes = data.map(d => 
      d.orderbook.bids.reduce((sum, b) => sum + b.quantity, 0) +
      d.orderbook.asks.reduce((sum, a) => sum + a.quantity, 0)
    );

    const spreads = data.map(d => this.calculateSpread(d.orderbook));

    // Calculate features
    const priceMA = prices.slice(-5).reduce((sum, p) => sum + p, 0) / 5;
    const volumeMA = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5;
    const spreadMA = spreads.slice(-5).reduce((sum, s) => sum + s, 0) / 5;
    
    const priceVolatility = Math.sqrt(
      prices.slice(-10).reduce((sum, p) => sum + Math.pow(p - priceMA, 2), 0) / 10
    );

    return [
      priceMA / 100000, // Normalized price
      volumeMA / 1000,  // Normalized volume
      spreadMA / 10,    // Normalized spread
      priceVolatility / 1000, // Normalized volatility
      prices[prices.length - 1] / priceMA, // Price momentum
    ];
  }

  private simulateNeuralNetworkPrediction(features: number[]): {
    priceTarget: number;
    confidence: number;
    factors: string[];
    output: number[];
  } {
    // Simulate neural network prediction
    // In production, this would use actual trained model
    
    const weightedSum = features.reduce((sum, feature, index) => {
      const weight = [0.3, 0.2, 0.25, 0.15, 0.1][index] || 0.1;
      return sum + feature * weight;
    }, 0);

    const prediction = Math.tanh(weightedSum); // Activation function
    const confidence = Math.abs(prediction) * 0.8 + 0.1; // 0.1 to 0.9 range

    const currentPrice = features[0] * 100000; // De-normalize
    const priceTarget = currentPrice * (1 + prediction * 0.02); // ±2% max movement

    const factors = [];
    if (features[4] > 1.01) factors.push('Strong upward momentum');
    if (features[4] < 0.99) factors.push('Downward momentum');
    if (features[1] > 0.8) factors.push('High volume activity');
    if (features[2] > 0.5) factors.push('Wide spread conditions');
    if (features[3] > 0.3) factors.push('High volatility detected');

    return {
      priceTarget,
      confidence,
      factors: factors.length > 0 ? factors : ['Normal market conditions'],
      output: [prediction, confidence, ...features]
    };
  }

  // Performance optimization methods
  optimizeDataForRendering(data: OrderbookSnapshot[], lodLevel: number = 1): OrderbookSnapshot[] {
    if (lodLevel === 1) return data;

    // Reduce data points based on LOD level
    const step = Math.max(1, Math.floor(lodLevel));
    return data.filter((_, index) => index % step === 0);
  }

  clearOldData(maxAge: number = 3600000) { // 1 hour default
    const cutoffTime = Date.now() - maxAge;
    
    // Clear old snapshots
    this.snapshots.forEach((snapshots, key) => {
      this.snapshots.set(key, snapshots.filter(s => s.timestamp >= cutoffTime));
    });

    // Clear old historical data
    this.historicalData.forEach((data, key) => {
      this.historicalData.set(key, data.filter(d => d.timestamp >= cutoffTime));
    });

    // Clear old spread history
    this.spreadHistory.forEach((history, key) => {
      this.spreadHistory.set(key, history.filter(h => h.timestamp >= cutoffTime));
    });
  }
}
