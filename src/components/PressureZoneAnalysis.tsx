'use client';

import React from 'react';
import { PressureZone } from '@/types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PressureZoneAnalysisProps {
  pressureZones: PressureZone[];
  currentPrice: number;
}

const PressureZoneAnalysis: React.FC<PressureZoneAnalysisProps> = ({
  pressureZones,
  currentPrice
}) => {
  const bidZones = pressureZones.filter(zone => zone.type === 'bid');
  const askZones = pressureZones.filter(zone => zone.type === 'ask');

  const getZoneDistance = (zone: PressureZone): number => {
    const zoneMidPrice = (zone.priceStart + zone.priceEnd) / 2;
    return Math.abs(currentPrice - zoneMidPrice) / currentPrice * 100;
  };

  const nearbyBidZones = bidZones
    .filter(zone => zone.priceEnd <= currentPrice)
    .sort((a, b) => getZoneDistance(a) - getZoneDistance(b))
    .slice(0, 3);

  const nearbyAskZones = askZones
    .filter(zone => zone.priceStart >= currentPrice)
    .sort((a, b) => getZoneDistance(a) - getZoneDistance(b))
    .slice(0, 3);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg w-80">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-blue-400" size={18} />
          <h3 className="text-sm font-semibold text-white">Pressure Zone Analysis</h3>
        </div>

        {/* Current Price */}
        <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="text-blue-400 text-xs font-medium mb-1">CURRENT PRICE</div>
          <div className="text-xl font-bold text-white">{formatPrice(currentPrice)}</div>
        </div>

        {/* Support Zones (Bid) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-400" size={14} />
            <span className="text-xs font-medium text-green-400">SUPPORT ZONES</span>
          </div>
          
          {nearbyBidZones.length > 0 ? (
            <div className="space-y-2">
              {nearbyBidZones.map((zone, index) => (
                <div 
                  key={`${zone.timestamp}-${index}`}
                  className="bg-green-500/10 rounded-lg p-2 border border-green-500/20"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-green-400 font-medium">
                      {formatPrice(zone.priceStart)} - {formatPrice(zone.priceEnd)}
                    </span>
                    <span className="text-xs text-gray-400">
                      -{formatPercentage(getZoneDistance(zone))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">
                      Volume: {zone.volume.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 bg-green-400 rounded-full"
                        style={{ opacity: zone.intensity / 100 }}
                      />
                      <span className="text-xs text-gray-400">
                        {zone.intensity.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No nearby support zones</div>
          )}
        </div>

        {/* Resistance Zones (Ask) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-400" size={14} />
            <span className="text-xs font-medium text-red-400">RESISTANCE ZONES</span>
          </div>
          
          {nearbyAskZones.length > 0 ? (
            <div className="space-y-2">
              {nearbyAskZones.map((zone, index) => (
                <div 
                  key={`${zone.timestamp}-${index}`}
                  className="bg-red-500/10 rounded-lg p-2 border border-red-500/20"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-red-400 font-medium">
                      {formatPrice(zone.priceStart)} - {formatPrice(zone.priceEnd)}
                    </span>
                    <span className="text-xs text-gray-400">
                      +{formatPercentage(getZoneDistance(zone))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">
                      Volume: {zone.volume.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 bg-red-400 rounded-full"
                        style={{ opacity: zone.intensity / 100 }}
                      />
                      <span className="text-xs text-gray-400">
                        {zone.intensity.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No nearby resistance zones</div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Total Zones</div>
              <div className="text-lg font-bold">{pressureZones.length}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Imbalance</div>
              <div className={`text-lg font-bold ${
                bidZones.length > askZones.length ? 'text-green-400' : 
                askZones.length > bidZones.length ? 'text-red-400' : 'text-gray-300'
              }`}>
                {bidZones.length > askZones.length ? 'BUY' : 
                 askZones.length > bidZones.length ? 'SELL' : 'NEUTRAL'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PressureZoneAnalysis;
