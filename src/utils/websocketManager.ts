import { OrderbookData, OrderFlowData } from '@/types';

export class WebSocketManager {
  private connections: Map<string, any> = new Map();
  private subscribers: Set<(data: OrderbookData | OrderFlowData) => void> = new Set();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxReconnectAttempts = 8; // Increased for better reliability
  private reconnectAttempts: Map<string, number> = new Map();
  private isDestroyed = false;
  private connectionStates: Map<string, string> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastUpdateTimes: Map<string, number> = new Map();
  private dataQuality: Map<string, any> = new Map();

  // Enhanced exchange API endpoints with fallbacks
  private apiEndpoints = {
    binance: {
      primary: 'https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=20',
      fallback: 'https://api1.binance.com/api/v3/depth?symbol=BTCUSDT&limit=20'
    },
    okx: {
      primary: 'https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=20',
      fallback: 'https://aws.okx.com/api/v5/market/books?instId=BTC-USDT&sz=20'
    },
    bybit: {
      primary: 'https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=20',
      fallback: 'https://api.bytick.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=20'
    }
  };

  // Enhanced polling intervals for better real-time performance
  private pollingSettings = {
    binance: 800,  // 0.8 seconds
    okx: 1200,     // 1.2 seconds  
    bybit: 1500    // 1.5 seconds
  };

  constructor() {
    this.initializeStates();
    this.setupConnections();
    this.initializeDataQualityMonitoring();
  }

  private initializeStates() {
    ['binance', 'okx', 'bybit'].forEach(venue => {
      this.connectionStates.set(venue, 'disconnected');
      this.reconnectAttempts.set(venue, 0);
      this.lastUpdateTimes.set(venue, 0);
      this.dataQuality.set(venue, {
        latency: 0,
        accuracy: 100,
        completeness: 100,
        freshness: 100,
        reliability: 100,
        consecutiveErrors: 0,
        lastError: null
      });
    });
  }

  private initializeDataQualityMonitoring() {
    // Monitor data quality every 30 seconds
    setInterval(() => {
      this.updateDataQualityMetrics();
    }, 30000);
  }

  private updateDataQualityMetrics() {
    const now = Date.now();
    
    this.dataQuality.forEach((quality, venue) => {
      const lastUpdate = this.lastUpdateTimes.get(venue) || 0;
      const timeSinceUpdate = now - lastUpdate;
      
      // Update freshness score
      if (timeSinceUpdate < 2000) {
        quality.freshness = 100;
      } else if (timeSinceUpdate < 5000) {
        quality.freshness = 80;
      } else if (timeSinceUpdate < 10000) {
        quality.freshness = 50;
      } else {
        quality.freshness = 0;
      }
      
      // Update reliability based on connection state
      const state = this.connectionStates.get(venue);
      if (state === 'connected') {
        quality.reliability = Math.min(100, quality.reliability + 1);
      } else {
        quality.reliability = Math.max(0, quality.reliability - 5);
      }
    });
  }

  private setupConnections() {
    if (this.isDestroyed) return;
    
    // Enhanced staggered connections to prevent rate limiting
    setTimeout(() => this.connectBinance(), 0);
    setTimeout(() => this.connectOKX(), 1500);
    setTimeout(() => this.connectBybit(), 3000);
  }

  private async connectBinance() {
    if (this.isDestroyed || this.connectionStates.get('binance') === 'connecting') return;

    try {
      this.connectionStates.set('binance', 'connecting');
      console.log('🔌 Connecting to Binance API...');
      
      const startTime = Date.now();
      const response = await this.fetchWithFallback('binance');
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const testData = await response.json();
      
      if (this.validateBinanceData(testData)) {
        console.log('✅ Binance API connection successful');
        this.connectionStates.set('binance', 'connected');
        this.reconnectAttempts.set('binance', 0);
        
        // Update data quality
        const quality = this.dataQuality.get('binance')!;
        quality.latency = latency;
        quality.consecutiveErrors = 0;
        quality.lastError = null;
        
        this.startBinancePolling();
      } else {
        throw new Error('Invalid response format from Binance API');
      }

    } catch (error) {
      console.error('❌ Binance API connection failed:', error);
      this.connectionStates.set('binance', 'failed');
      
      // Update data quality
      const quality = this.dataQuality.get('binance')!;
      quality.consecutiveErrors++;
      quality.lastError = error;
      
      this.scheduleReconnect('binance');
    }
  }

  private async connectOKX() {
    if (this.isDestroyed || this.connectionStates.get('okx') === 'connecting') return;

    try {
      this.connectionStates.set('okx', 'connecting');
      console.log('🔌 Connecting to OKX API...');
      
      const startTime = Date.now();
      const response = await this.fetchWithFallback('okx');
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const testData = await response.json();
      
      if (this.validateOKXData(testData)) {
        console.log('✅ OKX API connection successful');
        this.connectionStates.set('okx', 'connected');
        this.reconnectAttempts.set('okx', 0);
        
        // Update data quality
        const quality = this.dataQuality.get('okx')!;
        quality.latency = latency;
        quality.consecutiveErrors = 0;
        quality.lastError = null;
        
        this.startOKXPolling();
      } else {
        throw new Error('Invalid response format from OKX API');
      }

    } catch (error) {
      console.error('❌ OKX API connection failed:', error);
      this.connectionStates.set('okx', 'failed');
      
      // Update data quality
      const quality = this.dataQuality.get('okx')!;
      quality.consecutiveErrors++;
      quality.lastError = error;
      
      this.scheduleReconnect('okx');
    }
  }

  private async connectBybit() {
    if (this.isDestroyed || this.connectionStates.get('bybit') === 'connecting') return;

    try {
      this.connectionStates.set('bybit', 'connecting');
      console.log('🔌 Connecting to Bybit API...');
      
      const startTime = Date.now();
      const response = await this.fetchWithFallback('bybit');
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const testData = await response.json();
      
      if (this.validateBybitData(testData)) {
        console.log('✅ Bybit API connection successful');
        this.connectionStates.set('bybit', 'connected');
        this.reconnectAttempts.set('bybit', 0);
        
        // Update data quality
        const quality = this.dataQuality.get('bybit')!;
        quality.latency = latency;
        quality.consecutiveErrors = 0;
        quality.lastError = null;
        
        this.startBybitPolling();
      } else {
        throw new Error('Invalid response format from Bybit API');
      }

    } catch (error) {
      console.error('❌ Bybit API connection failed:', error);
      this.connectionStates.set('bybit', 'failed');
      
      // Update data quality
      const quality = this.dataQuality.get('bybit')!;
      quality.consecutiveErrors++;
      quality.lastError = error;
      
      this.scheduleReconnect('bybit');
    }
  }

  private async fetchWithFallback(venue: keyof typeof this.apiEndpoints): Promise<Response> {
    const endpoints = this.apiEndpoints[venue];
    
    try {
      return await fetch(endpoints.primary);
    } catch (error) {
      console.warn(`Primary endpoint failed for ${venue}, trying fallback...`);
      return await fetch(endpoints.fallback);
    }
  }

  private validateBinanceData(data: any): boolean {
    return !!(data && data.bids && data.asks && 
             Array.isArray(data.bids) && Array.isArray(data.asks) &&
             data.bids.length > 0 && data.asks.length > 0);
  }

  private validateOKXData(data: any): boolean {
    return !!(data && data.data && Array.isArray(data.data) && 
             data.data[0] && data.data.bids && data.data.asks &&
             Array.isArray(data.data.bids) && Array.isArray(data.data.asks));
  }

  private validateBybitData(data: any): boolean {
    return !!(data && data.result && data.result.b && data.result.a &&
             Array.isArray(data.result.b) && Array.isArray(data.result.a));
  }

  private startBinancePolling() {
    if (this.isDestroyed) return;
    
    const interval = setInterval(async () => {
      if (this.isDestroyed) return;
      
      try {
        const startTime = Date.now();
        const response = await this.fetchWithFallback('binance');
        const latency = Date.now() - startTime;
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (this.validateBinanceData(data)) {
          const orderbookData = this.parseBinanceOrderbook(data);
          this.notifySubscribers(orderbookData);
          this.lastUpdateTimes.set('binance', Date.now());
          
          // Update data quality
          const quality = this.dataQuality.get('binance')!;
          quality.latency = latency;
          quality.consecutiveErrors = 0;
          quality.completeness = this.calculateCompleteness(data.bids, data.asks);
          quality.accuracy = this.calculateAccuracy(orderbookData);
        } else {
          throw new Error('Invalid data format');
        }
        
      } catch (error) {
        console.error('❌ Binance polling error:', error);
        const quality = this.dataQuality.get('binance')!;
        quality.consecutiveErrors++;
        
        if (quality.consecutiveErrors >= 3) {
          this.connectionStates.set('binance', 'failed');
          clearInterval(interval);
          this.scheduleReconnect('binance');
        }
      }
    }, this.pollingSettings.binance);

    this.pollingIntervals.set('binance', interval);
    this.connections.set('binance', interval);
  }

  private startOKXPolling() {
    if (this.isDestroyed) return;
    
    const interval = setInterval(async () => {
      if (this.isDestroyed) return;
      
      try {
        const startTime = Date.now();
        const response = await this.fetchWithFallback('okx');
        const latency = Date.now() - startTime;
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (this.validateOKXData(data)) {
          const orderbookData = this.parseOKXOrderbook(data.data[0]);
          this.notifySubscribers(orderbookData);
          this.lastUpdateTimes.set('okx', Date.now());
          
          // Update data quality
          const quality = this.dataQuality.get('okx')!;
          quality.latency = latency;
          quality.consecutiveErrors = 0;
          quality.completeness = this.calculateCompleteness(data.data[0].bids, data.data.asks);
          quality.accuracy = this.calculateAccuracy(orderbookData);
        } else {
          throw new Error('Invalid data format');
        }
        
      } catch (error) {
        console.error('❌ OKX polling error:', error);
        const quality = this.dataQuality.get('okx')!;
        quality.consecutiveErrors++;
        
        if (quality.consecutiveErrors >= 3) {
          this.connectionStates.set('okx', 'failed');
          clearInterval(interval);
          this.scheduleReconnect('okx');
        }
      }
    }, this.pollingSettings.okx);

    this.pollingIntervals.set('okx', interval);
    this.connections.set('okx', interval);
  }

  private startBybitPolling() {
    if (this.isDestroyed) return;
    
    const interval = setInterval(async () => {
      if (this.isDestroyed) return;
      
      try {
        const startTime = Date.now();
        const response = await this.fetchWithFallback('bybit');
        const latency = Date.now() - startTime;
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (this.validateBybitData(data)) {
          const orderbookData = this.parseBybitOrderbook(data.result);
          this.notifySubscribers(orderbookData);
          this.lastUpdateTimes.set('bybit', Date.now());
          
          // Update data quality
          const quality = this.dataQuality.get('bybit')!;
          quality.latency = latency;
          quality.consecutiveErrors = 0;
          quality.completeness = this.calculateCompleteness(data.result.b, data.result.a);
          quality.accuracy = this.calculateAccuracy(orderbookData);
        } else {
          throw new Error('Invalid data format');
        }
        
      } catch (error) {
        console.error('❌ Bybit polling error:', error);
        const quality = this.dataQuality.get('bybit')!;
        quality.consecutiveErrors++;
        
        if (quality.consecutiveErrors >= 3) {
          this.connectionStates.set('bybit', 'failed');
          clearInterval(interval);
          this.scheduleReconnect('bybit');
        }
      }
    }, this.pollingSettings.bybit);

    this.pollingIntervals.set('bybit', interval);
    this.connections.set('bybit', interval);
  }

  private calculateCompleteness(bids: any[], asks: any[]): number {
    const expectedLevels = 20;
    const actualLevels = bids.length + asks.length;
    return Math.min(100, (actualLevels / (expectedLevels * 2)) * 100);
  }

  private calculateAccuracy(orderbook: OrderbookData): number {
    // Basic accuracy calculation based on spread reasonableness
    if (orderbook.bids.length === 0 || orderbook.asks.length === 0) return 0;
    
    const bestBid = Math.max(...orderbook.bids.map(b => b.price));
    const bestAsk = Math.min(...orderbook.asks.map(a => a.price));
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercentage = (spread / midPrice) * 100;
    
    // Consider spreads between 0.001% and 1% as accurate
    if (spreadPercentage >= 0.001 && spreadPercentage <= 1.0) {
      return 100;
    } else if (spreadPercentage <= 2.0) {
      return 80;
    } else {
      return 50;
    }
  }

  private scheduleReconnect(venue: string) {
    if (this.isDestroyed) return;
    
    const attempts = this.reconnectAttempts.get(venue) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.log(`🚫 Max reconnection attempts reached for ${venue}`);
      this.connectionStates.set(venue, 'failed');
      return;
    }

    // Clear existing timeout
    if (this.reconnectTimeouts.has(venue)) {
      clearTimeout(this.reconnectTimeouts.get(venue)!);
    }

    // Enhanced backoff strategy
    const baseDelay = 5000; // 5 seconds base delay
    const jitter = Math.random() * 3000; // Add up to 3 seconds jitter
    const exponentialBackoff = Math.pow(1.5, attempts);
    const delay = Math.min(baseDelay * exponentialBackoff + jitter, 60000);

    console.log(`⏰ Scheduling ${venue} reconnect in ${Math.round(delay/1000)}s (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    const timeout = setTimeout(() => {
      if (this.isDestroyed) return;
      
      console.log(`🔄 Attempting to reconnect to ${venue}... (attempt ${attempts + 1})`);
      this.reconnectAttempts.set(venue, attempts + 1);
      
      switch (venue) {
        case 'binance':
          this.connectBinance();
          break;
        case 'okx':
          this.connectOKX();
          break;
        case 'bybit':
          this.connectBybit();
          break;
      }
      
      this.reconnectTimeouts.delete(venue);
    }, delay);
    
    this.reconnectTimeouts.set(venue, timeout);
  }

  private parseBinanceOrderbook(data: any): OrderbookData {
    try {
      if (!this.validateBinanceData(data)) {
        throw new Error('Invalid Binance data structure');
      }

      const bids = data.bids
        .map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          timestamp: Date.now()
        }))
        .filter((item: any) => 
          !isNaN(item.price) && !isNaN(item.quantity) && 
          item.price > 0 && item.quantity > 0
        )
        .sort((a: any, b: any) => b.price - a.price);

      const asks = data.asks
        .map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          timestamp: Date.now()
        }))
        .filter((item: any) => 
          !isNaN(item.price) && !isNaN(item.quantity) && 
          item.price > 0 && item.quantity > 0
        )
        .sort((a: any, b: any) => a.price - b.price);

      if (bids.length === 0 || asks.length === 0) {
        throw new Error('No valid bid/ask data after filtering');
      }

      return {
        symbol: 'BTCUSDT',
        venue: 'Binance',
        timestamp: Date.now(),
        bids,
        asks,
        lastUpdateId: data.lastUpdateId,
        sequenceNumber: data.lastUpdateId
      };
      
    } catch (error) {
      console.error('Error parsing Binance data:', error);
      throw error;
    }
  }

  private parseOKXOrderbook(data: any): OrderbookData {
    try {
      return {
        symbol: 'BTC-USDT',
        venue: 'OKX',
        timestamp: parseInt(data.ts) || Date.now(),
        bids: (data.bids || [])
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            timestamp: parseInt(data.ts) || Date.now()
          }))
          .filter((item: any) => 
            !isNaN(item.price) && !isNaN(item.quantity) && 
            item.price > 0 && item.quantity > 0
          )
          .sort((a: any, b: any) => b.price - a.price),
        asks: (data.asks || [])
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            timestamp: parseInt(data.ts) || Date.now()
          }))
          .filter((item: any) => 
            !isNaN(item.price) && !isNaN(item.quantity) && 
            item.price > 0 && item.quantity > 0
          )
          .sort((a: any, b: any) => a.price - b.price),
        sequenceNumber: parseInt(data.seqId) || 0
      };
    } catch (error) {
      console.error('Error parsing OKX data:', error);
      throw error;
    }
  }

  private parseBybitOrderbook(data: any): OrderbookData {
    try {
      return {
        symbol: 'BTCUSDT',
        venue: 'Bybit',
        timestamp: data.ts || Date.now(),
        bids: (data.b || [])
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            timestamp: data.ts || Date.now()
          }))
          .filter((item: any) => 
            !isNaN(item.price) && !isNaN(item.quantity) && 
            item.price > 0 && item.quantity > 0
          )
          .sort((a: any, b: any) => b.price - a.price),
        asks: (data.a || [])
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            timestamp: data.ts || Date.now()
          }))
          .filter((item: any) => 
            !isNaN(item.price) && !isNaN(item.quantity) && 
            item.price > 0 && item.quantity > 0
          )
          .sort((a: any, b: any) => a.price - b.price),
        sequenceNumber: data.u || 0
      };
    } catch (error) {
      console.error('Error parsing Bybit data:', error);
      throw error;
    }
  }

  subscribe(callback: (data: OrderbookData | OrderFlowData) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: OrderbookData | OrderFlowData) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  disconnect() {
    this.isDestroyed = true;
    console.log('🔌 Disconnecting from all APIs...');
    
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval, venue) => {
      clearInterval(interval);
      this.connectionStates.set(venue, 'disconnected');
    });

    // Clear all timeouts
    this.reconnectTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });

    // Clear all references
    this.connections.clear();
    this.pollingIntervals.clear();
    this.reconnectTimeouts.clear();
    this.reconnectAttempts.clear();
    this.subscribers.clear();
  }

  getConnectionStatus(): { [venue: string]: boolean } {
    return {
      binance: this.connectionStates.get('binance') === 'connected',
      okx: this.connectionStates.get('okx') === 'connected',
      bybit: this.connectionStates.get('bybit') === 'connected',
    };
  }

  getDetailedStatus(): { [venue: string]: string } {
    return {
      binance: this.connectionStates.get('binance') || 'unknown',
      okx: this.connectionStates.get('okx') || 'unknown',
      bybit: this.connectionStates.get('bybit') || 'unknown',
    };
  }

  getDataFreshness(): { [venue: string]: number } {
    const now = Date.now();
    return {
      binance: now - (this.lastUpdateTimes.get('binance') || now),
      okx: now - (this.lastUpdateTimes.get('okx') || now),
      bybit: now - (this.lastUpdateTimes.get('bybit') || now),
    };
  }

  getDataQuality(): { [venue: string]: any } {
    const result: { [venue: string]: any } = {};
    this.dataQuality.forEach((quality, venue) => {
      result[venue] = { ...quality };
    });
    return result;
  }

  // Enhanced method to simulate order flow data
  generateOrderFlowData(orderbook: OrderbookData): OrderFlowData[] {
    const flows: OrderFlowData[] = [];
    const now = Date.now();
    
    // Simulate some order placements and cancellations
    for (let i = 0; i < Math.random() * 10; i++) {
      const isBid = Math.random() > 0.5;
      const levels = isBid ? orderbook.bids : orderbook.asks;
      
      if (levels.length > 0) {
        const randomLevel = levels[Math.floor(Math.random() * Math.min(5, levels.length))];
        
        flows.push({
          timestamp: now - Math.random() * 5000,
          price: randomLevel.price + (Math.random() - 0.5) * 0.01,
          quantity: Math.random() * 10,
          side: isBid ? 'buy' : 'sell',
          venue: orderbook.venue,
          type: Math.random() > 0.7 ? 'cancel' : Math.random() > 0.8 ? 'fill' : 'new',
          orderId: Math.random().toString(36).substring(7)
        });
      }
    }
    
    return flows;
  }
}
