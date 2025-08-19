import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderbookData, OrderbookSnapshot, PressureZone, Venue } from '@/types';
import { WebSocketManager } from '@/utils/websocketManager';
import { OrderbookProcessor } from '@/utils/orderbookProcessor';
import { PressureZoneDetector } from '@/utils/pressureZoneDetector';

export const useOrderbookData = (symbol: string = 'BTCUSDT') => {
  const [orderbooks, setOrderbooks] = useState<Map<string, OrderbookData>>(new Map());
  const [pressureZones, setPressureZones] = useState<Map<string, PressureZone[]>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const processorRef = useRef<OrderbookProcessor | null>(null);
  const detectorRef = useRef<PressureZoneDetector | null>(null);

  useEffect(() => {
    console.log('🚀 Initializing orderbook data hook...');
    
    wsManagerRef.current = new WebSocketManager();
    processorRef.current = new OrderbookProcessor();
    detectorRef.current = new PressureZoneDetector();

    const unsubscribe = wsManagerRef.current.subscribe((data) => {
      try {
        if ('bids' in data && 'asks' in data) {
          const orderbookData = data as OrderbookData;
          
          console.log(`📊 Received orderbook data for ${orderbookData.venue}:`, {
            bidsCount: orderbookData.bids.length,
            asksCount: orderbookData.asks.length,
            bestBid: orderbookData.bids[0]?.price,
            bestAsk: orderbookData.asks[0]?.price,
            venue: orderbookData.venue
          });

          // FIXED: Ensure we have valid data with proper validation
          if (orderbookData.bids.length > 0 && orderbookData.asks.length > 0) {
            
            // FIXED: Validate data integrity
            const validBids = orderbookData.bids.filter(bid => 
              bid.price > 0 && bid.quantity > 0 && 
              typeof bid.price === 'number' && typeof bid.quantity === 'number'
            );
            
            const validAsks = orderbookData.asks.filter(ask => 
              ask.price > 0 && ask.quantity > 0 && 
              typeof ask.price === 'number' && typeof ask.quantity === 'number'
            );

            if (validBids.length === 0 || validAsks.length === 0) {
              console.warn(`❌ Invalid data for ${orderbookData.venue}: no valid bids or asks`);
              return;
            }

            // Sort data properly
            const sortedBids = validBids.sort((a, b) => b.price - a.price); // Highest first
            const sortedAsks = validAsks.sort((a, b) => a.price - b.price); // Lowest first

            const cleanedData = {
              ...orderbookData,
              bids: sortedBids,
              asks: sortedAsks
            };

            // Update orderbook state
            setOrderbooks(prev => {
              const newMap = new Map(prev);
              newMap.set(orderbookData.venue, cleanedData);
              console.log(`📈 Updated orderbooks map, venues: [${Array.from(newMap.keys()).join(', ')}]`);
              return newMap;
            });

            // Process pressure zones
            const zones = detectorRef.current!.detectPressureZones(cleanedData);
            setPressureZones(prev => {
              const newMap = new Map(prev);
              newMap.set(orderbookData.venue, zones);
              return newMap;
            });

            // Add to processor for historical analysis
            processorRef.current!.addSnapshot(cleanedData, zones);
            
            setIsConnected(true);
            setError(null);
            
          } else {
            console.warn(`❌ Empty orderbook data for ${orderbookData.venue}`);
          }
        }
      } catch (error) {
        console.error('❌ Error processing orderbook data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    });

    return () => {
      console.log('🔌 Cleaning up orderbook data hook...');
      unsubscribe();
      wsManagerRef.current?.disconnect();
    };
  }, [symbol]);

  const getVenueData = useCallback((venue: string): OrderbookData | null => {
    const data = orderbooks.get(venue);
    console.log(`🔍 Getting venue data for ${venue}:`, 
      data ? `Found with ${data.bids.length} bids, ${data.asks.length} asks` : 'Not found'
    );
    return data || null;
  }, [orderbooks]);

  const getVenuePressureZones = useCallback((venue: string): PressureZone[] => {
    const zones = pressureZones.get(venue) || [];
    console.log(`🎯 Getting pressure zones for ${venue}:`, zones.length);
    return zones;
  }, [pressureZones]);

  const getMergedOrderbook = useCallback((venues: string[]): OrderbookData | null => {
    return processorRef.current?.getMergedOrderbook(symbol, venues) || null;
  }, [symbol]);

  const getHistoricalSnapshots = useCallback((venue: string, timeRange: number): OrderbookSnapshot[] => {
    return processorRef.current?.getSnapshots(venue, symbol, timeRange) || [];
  }, [symbol]);

  const getVolumeProfile = useCallback((venue: string, timeRange: number) => {
    const snapshots = getHistoricalSnapshots(venue, timeRange);
    return processorRef.current?.calculateVolumeProfile(snapshots) || [];
  }, [getHistoricalSnapshots]);

  // Convert Map to Array for component consumption
  const orderbooksArray = Array.from(orderbooks.values());
  const pressureZonesArray = Array.from(pressureZones.values()).flat();

  console.log('📊 Current orderbook state summary:', {
    orderbooksCount: orderbooksArray.length,
    pressureZonesCount: pressureZonesArray.length,
    isConnected,
    venues: Array.from(orderbooks.keys()),
    totalBids: orderbooksArray.reduce((sum, ob) => sum + ob.bids.length, 0),
    totalAsks: orderbooksArray.reduce((sum, ob) => sum + ob.asks.length, 0)
  });

  return {
    orderbooks: orderbooksArray,
    pressureZones: pressureZonesArray,
    isConnected,
    error,
    getVenueData,
    getVenuePressureZones,
    getMergedOrderbook,
    getHistoricalSnapshots,
    getVolumeProfile
  };
};
