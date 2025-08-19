import { OrderbookData, PressureZone, OrderbookLevel, PressurePrediction } from '@/types';

export class PressureZoneDetector {
  private volumeThreshold = 0.1; // 10% of total volume
  private clusterDistance = 0.005; // 0.5% price distance for clustering
  private historicalZones: PressureZone[] = [];
  private maxHistoryLength = 1000;

  detectPressureZones(data: OrderbookData): PressureZone[] {
    const bidZones = this.detectZonesInLevels(data.bids, 'bid', data.timestamp);
    const askZones = this.detectZonesInLevels(data.asks, 'ask', data.timestamp);
    
    const allZones = [...bidZones, ...askZones];
    this.updateHistoricalZones(allZones);
    
    return allZones;
  }

  private detectZonesInLevels(levels: OrderbookLevel[], type: 'bid' | 'ask', timestamp: number): PressureZone[] {
    if (levels.length === 0) return [];

    const totalVolume = levels.reduce((sum, level) => sum + level.quantity, 0);
    const minVolumeForZone = totalVolume * this.volumeThreshold;

    // Enhanced clustering with multiple algorithms
    const clusters = this.enhancedClusterLevels(levels);
    const pressureZones: PressureZone[] = [];

    clusters.forEach(cluster => {
      const clusterVolume = cluster.reduce((sum, level) => sum + level.quantity, 0);
      
      if (clusterVolume >= minVolumeForZone) {
        const prices = cluster.map(l => l.price).sort((a, b) => a - b);
        const intensity = this.calculateAdvancedIntensity(clusterVolume, totalVolume, cluster.length, cluster);
        
        const zone: PressureZone = {
          priceStart: prices[0],
          priceEnd: prices[prices.length - 1],
          volume: clusterVolume,
          intensity,
          type,
          timestamp,
          prediction: this.predictZoneMovement(cluster, type, timestamp)
        };

        pressureZones.push(zone);
      }
    });

    return pressureZones.sort((a, b) => b.intensity - a.intensity);
  }

  private enhancedClusterLevels(levels: OrderbookLevel[]): OrderbookLevel[][] {
    if (levels.length === 0) return [];

    const sorted = [...levels].sort((a, b) => a.price - b.price);
    const clusters: OrderbookLevel[][] = [];
    let currentCluster: OrderbookLevel[] = [sorted[0]];

    // Enhanced clustering with volume-weighted distance
    for (let i = 1; i < sorted.length; i++) {
      const currentLevel = sorted[i];
      const lastInCluster = currentCluster[currentCluster.length - 1];
      
      const priceDistance = Math.abs(currentLevel.price - lastInCluster.price) / lastInCluster.price;
      const volumeWeight = Math.min(currentLevel.quantity, lastInCluster.quantity) / 
                          Math.max(currentLevel.quantity, lastInCluster.quantity);
      
      const weightedDistance = priceDistance * (1 + (1 - volumeWeight));
      
      if (weightedDistance <= this.clusterDistance) {
        currentCluster.push(currentLevel);
      } else {
        clusters.push(currentCluster);
        currentCluster = [currentLevel];
      }
    }

    clusters.push(currentCluster);
    return clusters;
  }

  private calculateAdvancedIntensity(
    clusterVolume: number, 
    totalVolume: number, 
    levelCount: number,
    cluster: OrderbookLevel[]
  ): number {
    const volumeRatio = clusterVolume / totalVolume;
    const densityFactor = levelCount > 1 ? Math.log(levelCount) : 1;
    
    // Add volume concentration factor
    const avgQuantity = clusterVolume / levelCount;
    const maxQuantity = Math.max(...cluster.map(l => l.quantity));
    const concentrationFactor = maxQuantity / avgQuantity;
    
    return volumeRatio * densityFactor * concentrationFactor * 100;
  }

  private predictZoneMovement(
    cluster: OrderbookLevel[], 
    type: 'bid' | 'ask', 
    timestamp: number
  ): { movement: 'strengthening' | 'weakening' | 'stable'; confidence: number } {
    const avgPrice = cluster.reduce((sum, level) => sum + level.price, 0) / cluster.length;
    
    // Find similar historical zones
    const similarZones = this.historicalZones.filter(zone => 
      zone.type === type &&
      Math.abs(zone.priceStart - avgPrice) / avgPrice < 0.02 &&
      timestamp - zone.timestamp < 300000 // 5 minutes
    );

    if (similarZones.length < 3) {
      return { movement: 'stable', confidence: 0.3 };
    }

    // Analyze trend
    const recentZones = similarZones.slice(-5);
    const intensityTrend = recentZones.reduce((trend, zone, index) => {
      if (index === 0) return 0;
      return trend + (zone.intensity - recentZones[index - 1].intensity);
    }, 0) / (recentZones.length - 1);

    const confidence = Math.min(similarZones.length / 10, 0.95);
    
    if (intensityTrend > 5) {
      return { movement: 'strengthening', confidence };
    } else if (intensityTrend < -5) {
      return { movement: 'weakening', confidence };
    } else {
      return { movement: 'stable', confidence };
    }
  }

  private updateHistoricalZones(zones: PressureZone[]): void {
    this.historicalZones.push(...zones);
    
    if (this.historicalZones.length > this.maxHistoryLength) {
      this.historicalZones = this.historicalZones.slice(-this.maxHistoryLength);
    }
  }

  detectImbalances(data: OrderbookData): { 
    ratio: number; 
    direction: 'bid' | 'ask' | 'balanced';
    intensity: number;
    prediction: 'bullish' | 'bearish' | 'neutral';
  } {
    const bidVolume = data.bids.slice(0, 10).reduce((sum, level) => sum + level.quantity, 0);
    const askVolume = data.asks.slice(0, 10).reduce((sum, level) => sum + level.quantity, 0);
    
    if (bidVolume === 0 && askVolume === 0) {
      return { ratio: 1, direction: 'balanced', intensity: 0, prediction: 'neutral' };
    }

    const ratio = bidVolume / (bidVolume + askVolume);
    const imbalanceIntensity = Math.abs(ratio - 0.5) * 2;
    
    let direction: 'bid' | 'ask' | 'balanced';
    let prediction: 'bullish' | 'bearish' | 'neutral';
    
    if (ratio > 0.65) {
      direction = 'bid';
      prediction = 'bullish';
    } else if (ratio < 0.35) {
      direction = 'ask';
      prediction = 'bearish';
    } else {
      direction = 'balanced';
      prediction = 'neutral';
    }

    return { ratio, direction, intensity: imbalanceIntensity, prediction };
  }

  // ML-based prediction with improved algorithm
  predictPressureMovement(historicalZones: PressureZone[], currentZones: PressureZone[]): PressurePrediction[] {
    const predictions: PressurePrediction[] = [];

    currentZones.forEach(currentZone => {
      const similarZones = historicalZones.filter(hz =>
        Math.abs(hz.priceStart - currentZone.priceStart) / currentZone.priceStart < 0.01 &&
        hz.type === currentZone.type
      );

      if (similarZones.length >= 5) {
        const features = this.extractFeatures(similarZones, currentZone);
        const prediction = this.makePrediction(features);
        
        predictions.push({
          zone: currentZone,
          predictedMovement: prediction.direction,
          confidence: prediction.confidence,
          timeframe: 300000, // 5 minutes
          factors: prediction.factors
        });
      }
    });

    return predictions;
  }

  private extractFeatures(historicalZones: PressureZone[], currentZone: PressureZone) {
    const sortedZones = historicalZones.sort((a, b) => a.timestamp - b.timestamp);
    
    return {
      volumeTrend: this.calculateTrend(sortedZones.map(z => z.volume)),
      intensityTrend: this.calculateTrend(sortedZones.map(z => z.intensity)),
      priceMovement: this.calculateTrend(sortedZones.map(z => (z.priceStart + z.priceEnd) / 2)),
      currentIntensity: currentZone.intensity,
      relativeVolume: currentZone.volume / Math.max(...sortedZones.map(z => z.volume)),
      timeConsistency: this.calculateTimeConsistency(sortedZones)
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateTimeConsistency(zones: PressureZone[]): number {
    if (zones.length < 2) return 0;
    
    const intervals = zones.slice(1).map((zone, index) => 
      zone.timestamp - zones[index].timestamp
    );
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return 1 / (1 + Math.sqrt(variance) / avgInterval);
  }

  private makePrediction(features: any): { 
    direction: 'up' | 'down' | 'stable'; 
    confidence: number; 
    factors: string[] 
  } {
    const factors: string[] = [];
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Volume trend analysis
    if (features.volumeTrend > 0.1) {
      bullishScore += 0.3;
      factors.push('Increasing volume trend');
    } else if (features.volumeTrend < -0.1) {
      bearishScore += 0.2;
      factors.push('Decreasing volume trend');
    }
    
    // Intensity analysis
    if (features.intensityTrend > 0.05) {
      bullishScore += 0.25;
      factors.push('Strengthening intensity');
    } else if (features.intensityTrend < -0.05) {
      bearishScore += 0.25;
      factors.push('Weakening intensity');
    }
    
    // Price movement
    if (features.priceMovement > 0) {
      bullishScore += 0.2;
      factors.push('Upward price momentum');
    } else if (features.priceMovement < 0) {
      bearishScore += 0.2;
      factors.push('Downward price momentum');
    }
    
    // Current intensity vs historical
    if (features.currentIntensity > 75) {
      bullishScore += 0.15;
      factors.push('High current intensity');
    } else if (features.currentIntensity < 25) {
      bearishScore += 0.15;
      factors.push('Low current intensity');
    }
    
    // Time consistency
    if (features.timeConsistency > 0.7) {
      bullishScore += 0.1;
      factors.push('Consistent time pattern');
    }
    
    const netScore = bullishScore - bearishScore;
    const confidence = Math.min((Math.abs(netScore) + features.timeConsistency) / 2, 0.95);
    
    if (netScore > 0.2) {
      return { direction: 'up', confidence, factors };
    } else if (netScore < -0.2) {
      return { direction: 'down', confidence, factors };
    } else {
      return { direction: 'stable', confidence: confidence * 0.7, factors };
    }
  }

  // Heatmap generation for market depth
  generateMarketDepthHeatmap(
    orderbooks: OrderbookData[], 
    timeWindow: number = 300000
  ): HeatmapData[] {
    const heatmapData: HeatmapData[] = [];
    const now = Date.now();
    const timeSlots = 20;
    const priceSlots = 50;
    
    if (orderbooks.length === 0) return heatmapData;
    
    // Calculate price range
    const allPrices = orderbooks.flatMap(ob => 
      [...ob.bids.map(b => b.price), ...ob.asks.map(a => a.price)]
    );
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceStep = (maxPrice - minPrice) / priceSlots;
    const timeStep = timeWindow / timeSlots;
    
    for (let t = 0; t < timeSlots; t++) {
      const timeSlotStart = now - timeWindow + (t * timeStep);
      const timeSlotEnd = timeSlotStart + timeStep;
      
      const relevantOrderbooks = orderbooks.filter(ob => 
        ob.timestamp >= timeSlotStart && ob.timestamp < timeSlotEnd
      );
      
      for (let p = 0; p < priceSlots; p++) {
        const priceLevel = minPrice + (p * priceStep);
        const priceRange = [priceLevel, priceLevel + priceStep];
        
        let bidVolume = 0;
        let askVolume = 0;
        
        relevantOrderbooks.forEach(ob => {
          ob.bids.forEach(bid => {
            if (bid.price >= priceRange[0] && bid.price < priceRange[1]) {
              bidVolume += bid.quantity;
            }
          });
          
          ob.asks.forEach(ask => {
            if (ask.price >= priceRange && ask.price < priceRange[1]) {
              askVolume += ask.quantity;
            }
          });
        });
        
        if (bidVolume > 0) {
          heatmapData.push({
            priceLevel,
            timeSlot: t,
            volume: bidVolume,
            intensity: Math.min(bidVolume / 10, 1), // Normalize
            type: 'bid',
            temperature: this.calculateTemperature(bidVolume, timeSlots)
          });
        }
        
        if (askVolume > 0) {
          heatmapData.push({
            priceLevel,
            timeSlot: t,
            volume: askVolume,
            intensity: Math.min(askVolume / 10, 1), // Normalize
            type: 'ask',
            temperature: this.calculateTemperature(askVolume, timeSlots)
          });
        }
      }
    }
    
    return heatmapData;
  }

  private calculateTemperature(volume: number, maxTimeSlots: number): number {
    // Temperature represents the "heat" of trading activity
    const baseTemp = Math.log(volume + 1) * 10;
    const normalizedTemp = Math.min(baseTemp / 100, 1);
    return normalizedTemp;
  }
}
