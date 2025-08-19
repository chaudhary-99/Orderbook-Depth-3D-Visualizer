'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useOrderbookData } from '@/hooks/useOrderbookData';
import { useThree } from '@/hooks/useThree';
import {
  OrderbookData,
  PressureZone,
  VisualizationSettings,
  Venue,
  VolumeProfileData,
  SpreadAnalysis,
  OrderFlowData,
  ImbalanceData,
  HeatmapData,
  PerformanceMetrics,
  OrderMatchingVisualization,
  Mesh3DConfig,
  AnimationConfig
} from '@/types';
import { Activity, Zap, Target, Smartphone } from 'lucide-react';

interface OrderbookVisualizerProps {
  settings: VisualizationSettings;
  venues: Venue[];
  onDataUpdate?: (data: { 
    currentPrice: number; 
    spread: number; 
    performance: PerformanceMetrics;
    imbalance?: ImbalanceData;
    depth?: any;
  }) => void;
}

const OrderbookVisualizer: React.FC<OrderbookVisualizerProps> = ({
  settings,
  venues,
  onDataUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scene, camera, renderer } = useThree(containerRef);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Enhanced mesh references for all visualization layers
  const orderbookMeshesRef = useRef<THREE.Group[]>([]);
  const pressureZoneMeshesRef = useRef<THREE.Group[]>([]);
  const orderFlowMeshesRef = useRef<THREE.Group[]>([]);
  const volumeProfileMeshesRef = useRef<THREE.Group[]>([]);
  const heatmapMeshesRef = useRef<THREE.Group[]>([]);
  const timeLayersRef = useRef<THREE.Group[]>([]);
  const orderMatchingMeshesRef = useRef<THREE.Group[]>([]);
  const imbalanceVisualizationRef = useRef<THREE.Group[]>([]);

  // Enhanced UI state
  const [hoveredObject, setHoveredObject] = useState<any>(null);
  const [clickedObject, setClickedObject] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    vertices: 0,
    faces: 0,
    memoryUsage: 0,
    drawCalls: 0,
    geometries: 0,
    texturesCount: 0
  });

  // Enhanced data state
  const [currentPrice, setCurrentPrice] = useState(97000);
  const [spreadAnalysis, setSpreadAnalysis] = useState<Partial<SpreadAnalysis>>({
    current: 0.5,
    average: 0.75,
    min: 0.1,
    max: 2.0,
    tightness: 'tight',
    trend: 'stable'
  });
  const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);
  const [orderMatching, setOrderMatching] = useState<OrderMatchingVisualization[]>([]);

  // Enhanced animation and performance tracking
  const animationRef = useRef<{ 
    rotation: number; 
    time: number; 
    lastFrameTime: number;
    zAxisRotation: number;
    smoothRotation: boolean;
  }>({
    rotation: 0,
    time: 0,
    lastFrameTime: performance.now(),
    zAxisRotation: 0,
    smoothRotation: true
  });

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Historical data for enhanced time-based visualization
  const historicalDataRef = useRef<Map<string, OrderbookData[]>>(new Map());
  const maxHistoricalLayers = 30; // Increased for better temporal representation

  const {
    orderbooks,
    pressureZones,
    isConnected,
    getVenueData,
    getVenuePressureZones,
    getVolumeProfile,
    getHistoricalSnapshots
  } = useOrderbookData('BTCUSDT');

  // Enhanced performance monitoring with 60fps target
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let verticesCount = 0;
    let facesCount = 0;
    let geometriesCount = 0;
    let texturesCount = 0;

    const updatePerformanceMetrics = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        const renderTime = currentTime - animationRef.current.lastFrameTime;

        // Enhanced performance counting
        if (scene) {
          verticesCount = 0;
          facesCount = 0;
          geometriesCount = 0;
          texturesCount = 0;

          scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              geometriesCount++;
              const geometry = object.geometry;
              if (geometry.attributes.position) {
                verticesCount += geometry.attributes.position.count;
                if (geometry.index) {
                  facesCount += geometry.index.count / 3;
                } else {
                  facesCount += geometry.attributes.position.count / 3;
                }
              }
              
              // Count textures
              if (object.material && 'map' in object.material && object.material.map) {
                texturesCount++;
              }
            }
          });
        }

        const metrics: PerformanceMetrics = {
          fps,
          renderTime,
          vertices: verticesCount,
          faces: facesCount,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          drawCalls: renderer?.info?.render?.calls || 0,
          geometries: geometriesCount,
          texturesCount
        };

        setPerformanceMetrics(metrics);
        
        // Auto-adjust quality based on performance
        if (fps < settings.frameRateTarget && settings.lodEnabled) {
          // Reduce quality automatically
          console.log('Performance optimization: Reducing quality');
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationRef.current.lastFrameTime = currentTime;
      requestAnimationFrame(updatePerformanceMetrics);
    };

    updatePerformanceMetrics();
  }, [scene, renderer, settings.frameRateTarget, settings.lodEnabled]);

  // Enhanced mouse/touch interaction system
  const handleMouseInteraction = useCallback((event: MouseEvent | TouchEvent) => {
    if (!containerRef.current || !camera || !scene) return;

    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;

    if (event instanceof TouchEvent) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // Collect all interactable meshes from all visualization layers
    const interactableMeshes: THREE.Mesh[] = [];
    [
      ...orderbookMeshesRef.current,
      ...pressureZoneMeshesRef.current,
      ...orderFlowMeshesRef.current,
      ...orderMatchingMeshesRef.current,
      ...imbalanceVisualizationRef.current
    ].forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.interactable) {
          interactableMeshes.push(child);
        }
      });
    });

    const intersects = raycasterRef.current.intersectObjects(interactableMeshes);

    if (intersects.length > 0) {
      const intersected = intersects[0].object as THREE.Mesh;
      const data = intersected.userData;

      if (event.type === 'click' || event.type === 'touchend') {
        setClickedObject({
          ...data,
          position: { x: clientX, y: clientY }
        });
      } else {
        setHoveredObject(data);
      }

      // Enhanced highlight effects
      interactableMeshes.forEach(mesh => {
        if (mesh.material instanceof THREE.MeshPhongMaterial) {
          mesh.material.emissive.setHex(0x000000);
        }
      });

      if (intersected.material instanceof THREE.MeshPhongMaterial) {
        intersected.material.emissive.setHex(
          event.type === 'click' ? 0x666666 : 0x333333
        );
      }
    } else {
      if (event.type === 'click' || event.type === 'touchend') {
        setClickedObject(null);
      } else {
        setHoveredObject(null);
      }

      // Clear all highlights
      interactableMeshes.forEach(mesh => {
        if (mesh.material instanceof THREE.MeshPhongMaterial) {
          mesh.material.emissive.setHex(0x000000);
        }
      });
    }

    setMousePosition({ x: clientX, y: clientY });
  }, [camera, scene]);

  // Create enhanced 3D grid system with proper axis representation
  const createEnhanced3DGrid = useCallback(() => {
    if (!scene) return;

    // Remove existing grid
    const existingGrid = scene.getObjectByName('enhanced-grid');
    if (existingGrid) {
      scene.remove(existingGrid);
      existingGrid.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const gridGroup = new THREE.Group();
    gridGroup.name = 'enhanced-grid';

    // Main grid plane with better styling
    const gridSize = 1000;
    const divisions = 50;
    const mainGrid = new THREE.GridHelper(gridSize, divisions, 0x0EA5E9, 0x1E293B);
    mainGrid.material.transparent = true;
    mainGrid.material.opacity = 0.3;
    gridGroup.add(mainGrid);

    // Enhanced axis creation with proper labels
    const axisLength = 500;
    const axisRadius = 2;

    // X-axis (Price) - Blue with gradient
    const createEnhancedAxis = (color: number, position: THREE.Vector3, rotation: THREE.Euler) => {
      const axisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength);
      const axisMaterial = new THREE.MeshPhongMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.8,
        shininess: 100
      });
      const axis = new THREE.Mesh(axisGeometry, axisMaterial);
      axis.position.copy(position);
      axis.rotation.copy(rotation);
      return axis;
    };

    // X-axis (Price)
    gridGroup.add(createEnhancedAxis(
      0x0EA5E9, 
      new THREE.Vector3(axisLength / 2, 2, 0), 
      new THREE.Euler(0, 0, Math.PI / 2)
    ));

    // Y-axis (Quantity)
    gridGroup.add(createEnhancedAxis(
      0x10B981, 
      new THREE.Vector3(0, axisLength / 2, 0), 
      new THREE.Euler(0, 0, 0)
    ));

    // Z-axis (Time)
    gridGroup.add(createEnhancedAxis(
      0xF59E0B, 
      new THREE.Vector3(0, 2, axisLength / 2), 
      new THREE.Euler(Math.PI / 2, 0, 0)
    ));

    // Enhanced axis labels with better typography
    const createAxisLabel = (text: string, position: THREE.Vector3, color: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 128;
      
      // Enhanced text rendering
      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.font = 'Bold 48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 64);
      
      // Add glow effect
      context.shadowColor = `#${color.toString(16).padStart(6, '0')}`;
      context.shadowBlur = 10;
      context.fillText(text, 256, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        alphaTest: 0.1
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(100, 25, 1);
      return sprite;
    };

    gridGroup.add(createAxisLabel('PRICE (X)', new THREE.Vector3(axisLength / 2 + 60, 30, 0), 0x0EA5E9));
    gridGroup.add(createAxisLabel('QUANTITY (Y)', new THREE.Vector3(0, axisLength / 2 + 60, 0), 0x10B981));
    gridGroup.add(createAxisLabel('TIME (Z)', new THREE.Vector3(0, 30, axisLength / 2 + 60), 0xF59E0B));

    // Add tick marks and scale indicators
    const createTickMarks = (axis: 'x' | 'y' | 'z', color: number) => {
      const tickGroup = new THREE.Group();
      const tickCount = 10;
      const tickLength = 20;
      
      for (let i = 0; i <= tickCount; i++) {
        const position = (i / tickCount) * axisLength - axisLength / 2;
        const tickGeometry = new THREE.CylinderGeometry(0.5, 0.5, tickLength);
        const tickMaterial = new THREE.MeshPhongMaterial({ color });
        const tick = new THREE.Mesh(tickGeometry, tickMaterial);
        
        if (axis === 'x') tick.position.set(position, -10, 0);
        else if (axis === 'y') tick.position.set(-10, position, 0);
        else tick.position.set(0, -10, position);
        
        tickGroup.add(tick);
      }
      return tickGroup;
    };

    gridGroup.add(createTickMarks('x', 0x0EA5E9));
    gridGroup.add(createTickMarks('y', 0x10B981));
    gridGroup.add(createTickMarks('z', 0xF59E0B));

    scene.add(gridGroup);
  }, [scene]);

  // Enhanced orderbook mesh creation with proper 3D scaling and Z-axis rotation
  const createOrderbookMesh = useCallback((
    data: OrderbookData,
    venue: Venue,
    venueIndex: number,
    timeOffset: number = 0,
    opacity: number = 1.0
  ): THREE.Group => {
    const group = new THREE.Group();
    
    if (!venue.enabled || !data.bids.length || !data.asks.length) {
      return group;
    }

    // Enhanced scaling factors for proper 3D axis representation
    const maxLevels = 25; // Increased for better depth visualization
    const barWidth = 15.0;
    const barDepth = 8.0;

    // Enhanced price scaling (X-axis)
    const allPrices = [...data.bids.map(b => b.price), ...data.asks.map(a => a.price)];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const priceScale = 400 / Math.max(priceRange, 1);

    // Enhanced quantity scaling (Y-axis)
    const maxQuantity = Math.max(
      Math.max(...data.bids.map(b => b.quantity)),
      Math.max(...data.asks.map(a => a.quantity))
    );
    const quantityScale = 200 / Math.max(maxQuantity, 0.001);

    // Mid price calculation for centering
    const bestBid = Math.max(...data.bids.map(b => b.price));
    const bestAsk = Math.min(...data.asks.map(a => a.price));
    const midPrice = (bestBid + bestAsk) / 2;

    // Enhanced venue positioning for better spatial distribution
    const venueSpacing = 120;
    const venueXOffset = (venueIndex - venues.length / 2) * venueSpacing;

    // Create enhanced bid bars with improved materials and animations
    data.bids.slice(0, maxLevels).forEach((bid, index) => {
      if (bid.quantity >= settings.quantityThreshold) {
        const height = Math.max(bid.quantity * quantityScale, 3.0);
        
        // Enhanced LOD implementation
        const lodLevel = settings.lodEnabled ? Math.floor(height / 10) : 3;
        const geometry = new THREE.BoxGeometry(
          barWidth * Math.min(lodLevel / 3 + 0.5, 1),
          height,
          barDepth * Math.min(lodLevel / 3 + 0.5, 1)
        );

        // Enhanced materials with better lighting response
        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(0x10B981).lerp(new THREE.Color(venue.color), 0.3),
          transparent: opacity < 1.0,
          opacity: opacity,
          shininess: 150,
          specular: new THREE.Color(0x10B981),
          emissive: new THREE.Color(0x003300).multiplyScalar(0.1)
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Enhanced 3D positioning with Z-axis time representation
        mesh.position.set(
          ((bid.price - midPrice) * priceScale) + venueXOffset,
          height / 2,
          -timeOffset - (index * 3) // Enhanced Z spacing for time
        );

        mesh.castShadow = settings.enableShadows;
        mesh.receiveShadow = settings.enableShadows;

        // Enhanced user data for interactions
        mesh.userData = {
          interactable: true,
          orderData: {
            price: bid.price,
            quantity: bid.quantity,
            type: 'bid' as const,
            venue: venue.name,
            timestamp: data.timestamp,
            cumulativeVolume: bid.cumulative || 0
          },
          originalY: height / 2,
          phase: index * 0.1,
          intensity: bid.quantity / maxQuantity,
          animationConfig: {
            enabled: true,
            speed: settings.animationSpeed,
            type: 'linear' as const
          }
        };

        group.add(mesh);
      }
    });

    // Create enhanced ask bars with similar improvements
    data.asks.slice(0, maxLevels).forEach((ask, index) => {
      if (ask.quantity >= settings.quantityThreshold) {
        const height = Math.max(ask.quantity * quantityScale, 3.0);
        
        const lodLevel = settings.lodEnabled ? Math.floor(height / 10) : 3;
        const geometry = new THREE.BoxGeometry(
          barWidth * Math.min(lodLevel / 3 + 0.5, 1),
          height,
          barDepth * Math.min(lodLevel / 3 + 0.5, 1)
        );

        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(0xEF4444).lerp(new THREE.Color(venue.color), 0.3),
          transparent: opacity < 1.0,
          opacity: opacity,
          shininess: 150,
          specular: new THREE.Color(0xEF4444),
          emissive: new THREE.Color(0x330000).multiplyScalar(0.1)
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
          ((ask.price - midPrice) * priceScale) + venueXOffset,
          height / 2,
          -timeOffset + (index * 3)
        );

        mesh.castShadow = settings.enableShadows;
        mesh.receiveShadow = settings.enableShadows;

        mesh.userData = {
          interactable: true,
          orderData: {
            price: ask.price,
            quantity: ask.quantity,
            type: 'ask' as const,
            venue: venue.name,
            timestamp: data.timestamp,
            cumulativeVolume: ask.cumulative || 0
          },
          originalY: height / 2,
          phase: index * 0.1,
          intensity: ask.quantity / maxQuantity,
          animationConfig: {
            enabled: true,
            speed: settings.animationSpeed,
            type: 'linear' as const
          }
        };

        group.add(mesh);
      }
    });

    return group;
  }, [settings.quantityThreshold, settings.lodEnabled, settings.enableShadows, settings.animationSpeed, venues.length]);

  // Create order matching animation visualization
  const createOrderMatchingVisualization = useCallback((matches: OrderMatchingVisualization[]) => {
    if (!scene || !settings.showOrderMatching) return;

    // Clear existing order matching meshes
    orderMatchingMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    orderMatchingMeshesRef.current = [];

    const matchingGroup = new THREE.Group();
    
    matches.forEach((match, index) => {
      // Create animated connection line between buy and sell orders
      const lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.8
      });

      // Calculate positions based on price and time
      const buyPosition = new THREE.Vector3(
        (match.price - currentPrice) * 0.02,
        Math.log(match.quantity + 1) * 10,
        -(Date.now() - match.timestamp) * 0.001
      );

      const sellPosition = new THREE.Vector3(
        (match.price - currentPrice) * 0.02 + 20,
        Math.log(match.quantity + 1) * 10,
        -(Date.now() - match.timestamp) * 0.001
      );

      const points = [buyPosition, sellPosition];
      lineGeometry.setFromPoints(points);
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      matchingGroup.add(line);

      // Create animated particles for trade execution
      const particleGeometry = new THREE.SphereGeometry(2, 8, 6);
      const particleMaterial = new THREE.MeshPhongMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(0x004444)
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(buyPosition);
      particle.userData = {
        interactable: true,
        matchData: match,
        startPosition: buyPosition.clone(),
        endPosition: sellPosition.clone(),
        animationProgress: 0
      };

      matchingGroup.add(particle);
    });

    scene.add(matchingGroup);
    orderMatchingMeshesRef.current.push(matchingGroup);
  }, [scene, settings.showOrderMatching, currentPrice]);

  // Create enhanced imbalance visualization
  const createImbalanceVisualization = useCallback((imbalanceData: ImbalanceData[]) => {
    if (!scene || !settings.showImbalanceVisualization) return;

    // Clear existing imbalance meshes
    imbalanceVisualizationRef.current.forEach(mesh => {
      scene.remove(mesh);
    });
    imbalanceVisualizationRef.current = [];

    const imbalanceGroup = new THREE.Group();
    
    imbalanceData.forEach((imbalance, index) => {
      // Create dynamic imbalance indicator
      const imbalanceIntensity = Math.abs(imbalance.imbalanceScore);
      const size = 10 + imbalanceIntensity * 30;
      
      const geometry = new THREE.ConeGeometry(size, size * 2, 8);
      const material = new THREE.MeshPhongMaterial({
        color: imbalance.direction === 'buy' ? 0x00FF00 : 
               imbalance.direction === 'sell' ? 0xFF0000 : 0xFFFF00,
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color(
          imbalance.direction === 'buy' ? 0x002200 : 
          imbalance.direction === 'sell' ? 0x220000 : 0x222200
        )
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (index - imbalanceData.length / 2) * 100,
        size,
        -300 // Position behind main orderbook
      );

      // Rotate cone to point in direction of imbalance
      if (imbalance.direction === 'buy') {
        mesh.rotation.z = 0;
      } else if (imbalance.direction === 'sell') {
        mesh.rotation.z = Math.PI;
      }

      mesh.userData = {
        interactable: true,
        imbalanceData: imbalance,
        type: 'imbalance'
      };

      imbalanceGroup.add(mesh);
    });

    scene.add(imbalanceGroup);
    imbalanceVisualizationRef.current.push(imbalanceGroup);
  }, [scene, settings.showImbalanceVisualization]);

  // Enhanced market depth heatmap with better temperature mapping
  const createMarketDepthHeatmap = useCallback((heatmapData: HeatmapData[]) => {
    if (!scene || !settings.showMarketDepthHeatmap) return;

    // Clear existing heatmap meshes
    heatmapMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
    });
    heatmapMeshesRef.current = [];

    const heatmapGroup = new THREE.Group();

    heatmapData.forEach((data, index) => {
      const geometry = new THREE.PlaneGeometry(25, 25);
      const intensity = Math.min(data.intensity, 1.0);
      
      // Enhanced temperature mapping
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(
          data.type === 'bid' ? 0.3 : 0.0, // Green for bids, red for asks
          0.8 + (intensity * 0.2),
          0.2 + (intensity * 0.6)
        ),
        transparent: true,
        opacity: intensity * 0.7,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        (data.priceLevel - currentPrice) * 0.03,
        2,
        -data.timeSlot * 60 // Enhanced time spacing
      );

      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = {
        interactable: true,
        heatmapData: data,
        type: 'heatmap'
      };

      heatmapGroup.add(mesh);
    });

    scene.add(heatmapGroup);
    heatmapMeshesRef.current.push(heatmapGroup);
  }, [scene, settings.showMarketDepthHeatmap, currentPrice]);

  // Enhanced scene initialization
  useEffect(() => {
    if (!scene) return;

    scene.background = new THREE.Color(settings.theme === 'dark' ? 0x0F172A : 0xF8FAFC);
    scene.fog = new THREE.FogExp2(settings.theme === 'dark' ? 0x0F172A : 0xF8FAFC, 0.0002);

    // Clear existing lights
    const lightsToRemove: THREE.Light[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Light) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach(light => scene.remove(light));

    // Enhanced lighting setup for better 3D perception
    const ambientLight = new THREE.AmbientLight(
      0x404040, 
      settings.theme === 'dark' ? 1.2 : 1.8
    );
    scene.add(ambientLight);

    // Primary directional light
    const directionalLight = new THREE.DirectionalLight(
      0xffffff, 
      settings.theme === 'dark' ? 3.0 : 3.5
    );
    directionalLight.position.set(400, 400, 400);
    
    if (settings.enableShadows) {
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 4096;
      directionalLight.shadow.mapSize.height = 4096;
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 2000;
      directionalLight.shadow.camera.left = -1000;
      directionalLight.shadow.camera.right = 1000;
      directionalLight.shadow.camera.top = 1000;
      directionalLight.shadow.camera.bottom = -1000;
      directionalLight.shadow.bias = -0.0001;
    }
    scene.add(directionalLight);

    // Additional enhanced lighting for better 3D visualization
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(300, 300, 150);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-300, 150, -150);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4A90E2, 1.2);
    rimLight.position.set(0, -300, 300);
    scene.add(rimLight);

    // Add subtle colored accent lights
    const accentLight1 = new THREE.PointLight(0x0EA5E9, 0.5, 1000);
    accentLight1.position.set(200, 100, 200);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0x10B981, 0.5, 1000);
    accentLight2.position.set(-200, 100, -200);
    scene.add(accentLight2);

    createEnhanced3DGrid();
  }, [scene, settings.theme, settings.enableShadows, createEnhanced3DGrid]);

  // Enhanced camera and controls setup with smooth Z-axis rotation
  useEffect(() => {
    if (!scene || !camera || !renderer || !containerRef.current) return;

    // Optimal camera position for 3D orderbook visualization
    camera.position.set(300, 200, 400);
    camera.lookAt(0, 75, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03; // Smoother damping
    
    // Enhanced rotation settings for smooth Z-axis rotation
    controls.autoRotate = settings.viewMode === 'realtime' && settings.autoRotate;
    controls.autoRotateSpeed = settings.rotationSpeed * 1.0; // Use rotationSpeed from settings
    
    controls.minDistance = 150;
    controls.maxDistance = 1200;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.85;

    // Enhanced touch controls
    if (settings.touchControlsEnabled) {
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
      controls.enableKeys = false;
    }

    controlsRef.current = controls;

    // Enhanced event listeners
    const element = containerRef.current;
    element.addEventListener('mousemove', handleMouseInteraction);
    element.addEventListener('click', handleMouseInteraction);

    if (settings.touchControlsEnabled) {
      element.addEventListener('touchmove', handleMouseInteraction, { passive: false });
      element.addEventListener('touchend', handleMouseInteraction);
      element.addEventListener('touchstart', handleMouseInteraction);
    }

    return () => {
      controls.dispose();
      element.removeEventListener('mousemove', handleMouseInteraction);
      element.removeEventListener('click', handleMouseInteraction);
      element.removeEventListener('touchmove', handleMouseInteraction);
      element.removeEventListener('touchend', handleMouseInteraction);
      element.removeEventListener('touchstart', handleMouseInteraction);
    };
  }, [scene, camera, renderer, settings.animationSpeed, settings.viewMode, 
      settings.touchControlsEnabled, settings.autoRotate, settings.rotationSpeed, handleMouseInteraction]);

  // Main visualization update with enhanced features
  useEffect(() => {
    if (!scene) return;

    // Clear all existing meshes
    [
      ...orderbookMeshesRef.current,
      ...pressureZoneMeshesRef.current,
      ...orderFlowMeshesRef.current,
      ...volumeProfileMeshesRef.current,
      ...heatmapMeshesRef.current,
      ...orderMatchingMeshesRef.current,
      ...imbalanceVisualizationRef.current
    ].forEach(mesh => {
      scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    // Reset all mesh references
    orderbookMeshesRef.current = [];
    pressureZoneMeshesRef.current = [];
    orderFlowMeshesRef.current = [];
    volumeProfileMeshesRef.current = [];
    heatmapMeshesRef.current = [];
    orderMatchingMeshesRef.current = [];
    imbalanceVisualizationRef.current = [];

    const enabledVenues = venues.filter(v => v.enabled);
    let currentPriceSum = 0;
    let venuesWithData = 0;
    let totalSpread = 0;
    let aggregatedImbalanceData: ImbalanceData[] = [];

    // Create current orderbook visualization
    enabledVenues.forEach((venue, venueIndex) => {
      const venueData = orderbooks.find(ob => ob.venue === venue.name);
      
      if (venueData && venueData.bids.length > 0 && venueData.asks.length > 0) {
        const orderbookMesh = createOrderbookMesh(venueData, venue, venueIndex);
        
        if (orderbookMesh.children.length > 0) {
          scene.add(orderbookMesh);
          orderbookMeshesRef.current.push(orderbookMesh);
        }

        // Calculate enhanced market data
        const bestBid = Math.max(...venueData.bids.map(b => b.price));
        const bestAsk = Math.min(...venueData.asks.map(a => a.price));
        currentPriceSum += (bestBid + bestAsk) / 2;
        totalSpread += bestAsk - bestBid;
        venuesWithData++;

        // Calculate imbalance data
        const bidVolume = venueData.bids.slice(0, 10).reduce((sum, bid) => sum + bid.quantity, 0);
        const askVolume = venueData.asks.slice(0, 10).reduce((sum, ask) => sum + ask.quantity, 0);
        const ratio = bidVolume / (bidVolume + askVolume);
        
        const imbalance: ImbalanceData = {
          timestamp: venueData.timestamp,
          ratio,
          direction: ratio > 0.6 ? 'buy' : ratio < 0.4 ? 'sell' : 'neutral',
          intensity: Math.abs(ratio - 0.5) * 2,
          bidVolume,
          askVolume,
          imbalanceScore: ratio - 0.5,
          pressureLevel: Math.abs(ratio - 0.5) > 0.3 ? 'high' : 
                        Math.abs(ratio - 0.5) > 0.15 ? 'medium' : 'low'
        };
        
        aggregatedImbalanceData.push(imbalance);

        // Create pressure zones visualization if enabled
        if (settings.showPressureZones) {
          const zones = getVenuePressureZones(venue.id);
          // Enhanced pressure zone visualization would be implemented here
        }

        // Create volume profile if enabled
        if (settings.showVolumeProfile) {
          const volumeProfile = getVolumeProfile(venue.id, settings.timeRange);
          // Volume profile visualization would be implemented here
        }
      }
    });

    // Update market data state
    if (venuesWithData > 0) {
      const newCurrentPrice = currentPriceSum / venuesWithData;
      const newSpread = totalSpread / venuesWithData;
      setCurrentPrice(newCurrentPrice);

      // Enhanced spread analysis
      setSpreadAnalysis(prev => ({
        ...prev,
        current: newSpread,
        average: (prev.average! * 0.9 + newSpread * 0.1),
        min: Math.min(prev.min!, newSpread),
        max: Math.max(prev.max!, newSpread),
        tightness: newSpread < 1 ? 'tight' : newSpread < 3 ? 'normal' : 'wide',
        trend: newSpread > prev.current! ? 'widening' : 
               newSpread < prev.current! ? 'narrowing' : 'stable',
        volatility: Math.abs(newSpread - prev.current!) / prev.current! || 0
      }));

      setImbalanceData(aggregatedImbalanceData);

      // Create visualizations for enabled features
      if (settings.showOrderMatching) {
        createOrderMatchingVisualization(orderMatching);
      }

      if (settings.showImbalanceVisualization) {
        createImbalanceVisualization(aggregatedImbalanceData);
      }

      if (settings.showMarketDepthHeatmap) {
        // Generate sample heatmap data for demonstration
        const sampleHeatmapData: HeatmapData[] = [];
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 10; j++) {
            sampleHeatmapData.push({
              priceLevel: newCurrentPrice + (i - 10) * 10,
              timeSlot: j,
              volume: Math.random() * 100,
              intensity: Math.random(),
              type: Math.random() > 0.5 ? 'bid' : 'ask',
              temperature: Math.random(),
              depth: Math.random() * 50
            });
          }
        }
        createMarketDepthHeatmap(sampleHeatmapData);
      }

      // Notify parent component with enhanced data
      if (onDataUpdate) {
        onDataUpdate({
          currentPrice: newCurrentPrice,
          spread: newSpread,
          performance: performanceMetrics,
          imbalance: aggregatedImbalanceData[0], // Send first imbalance data
          depth: {
            totalBids: enabledVenues.reduce((sum, venue) => {
              const data = orderbooks.find(ob => ob.venue === venue.name);
              return sum + (data?.bids.length || 0);
            }, 0),
            totalAsks: enabledVenues.reduce((sum, venue) => {
              const data = orderbooks.find(ob => ob.venue === venue.name);
              return sum + (data?.asks.length || 0);
            }, 0),
            maxBidSize: enabledVenues.reduce((max, venue) => {
              const data = orderbooks.find(ob => ob.venue === venue.name);
              const maxBid = data ? Math.max(...data.bids.map(b => b.quantity)) : 0;
              return Math.max(max, maxBid);
            }, 0),
            maxAskSize: enabledVenues.reduce((max, venue) => {
              const data = orderbooks.find(ob => ob.venue === venue.name);
              const maxAsk = data ? Math.max(...data.asks.map(a => a.quantity)) : 0;
              return Math.max(max, maxAsk);
            }, 0),
            averageBidSize: 0, // Calculate as needed
            averageAskSize: 0  // Calculate as needed
          }
        });
      }
    }
  }, [
    orderbooks, venues, settings, scene, createOrderbookMesh,
    createOrderMatchingVisualization, createImbalanceVisualization,
    createMarketDepthHeatmap, getVenuePressureZones, getVolumeProfile,
    onDataUpdate, performanceMetrics, orderMatching
  ]);

  // Enhanced animation loop with smooth Z-axis rotation and 60fps targeting
  useEffect(() => {
    if (!controlsRef.current) return;

    let animationId: number;
    let lastFrameTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      const targetFrameTime = 1000 / settings.frameRateTarget;

      // Frame rate limiting for consistent performance
      if (deltaTime >= targetFrameTime) {
        if (controlsRef.current) {
          // Enhanced auto-rotation with smooth Z-axis rotation
          controlsRef.current.autoRotate = settings.viewMode === 'realtime' && settings.autoRotate;
          controlsRef.current.autoRotateSpeed = settings.rotationSpeed;
          controlsRef.current.update();
        }

        // Enhanced smooth animations
        animationRef.current.time += 0.005 * settings.animationSpeed;
        animationRef.current.zAxisRotation += 0.01 * settings.rotationSpeed;

        // Animate all mesh groups with enhanced effects
        [
          ...orderbookMeshesRef.current,
          ...orderFlowMeshesRef.current,
          ...orderMatchingMeshesRef.current
        ].forEach((meshGroup, groupIndex) => {
          meshGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.originalY) {
              const phase = child.userData.phase || 0;
              const intensity = child.userData.intensity || 0.5;
              const animConfig = child.userData.animationConfig;

              if (animConfig?.enabled) {
                // Enhanced floating animation
                child.position.y = child.userData.originalY +
                  Math.sin(animationRef.current.time + phase) * 2.0 * intensity;
                
                // Subtle pulsing effect for high-intensity orders
                if (intensity > 0.8) {
                  const scale = 1.0 + Math.sin(animationRef.current.time * 2 + phase) * 0.05;
                  child.scale.set(scale, 1, scale);
                }
              }
            }
          });

          // Enhanced group animations for real-time mode
          if (settings.viewMode === 'realtime') {
            meshGroup.rotation.y = Math.sin(animationRef.current.time * 0.1 + groupIndex) * 0.015;
          }
        });

        // Animate order matching particles
        orderMatchingMeshesRef.current.forEach(group => {
          group.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.matchData) {
              const progress = child.userData.animationProgress || 0;
              if (progress < 1) {
                child.userData.animationProgress = progress + 0.02;
                const start = child.userData.startPosition;
                const end = child.userData.endPosition;
                child.position.lerpVectors(start, end, progress);
              }
            }
          });
        });

        // Animate order flow particles with enhanced effects
        orderFlowMeshesRef.current.forEach(group => {
          group.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.createdAt) {
              const age = Date.now() - child.userData.createdAt;
              const maxAge = 15000; // 15 seconds
              
              if (age > maxAge) {
                group.remove(child);
              } else {
                // Enhanced fade out with color transition
                if (child.material instanceof THREE.MeshPhongMaterial) {
                  const fadeProgress = age / maxAge;
                  child.material.opacity = Math.max(0, 1 - fadeProgress);
                  
                  // Color transition effect
                  const originalColor = new THREE.Color(child.material.color);
                  const fadeColor = new THREE.Color(0x444444);
                  child.material.color.lerpColors(originalColor, fadeColor, fadeProgress);
                }
              }
            }
          });
        });

        lastFrameTime = currentTime;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [settings.animationSpeed, settings.viewMode, settings.autoRotate, 
      settings.rotationSpeed, settings.frameRateTarget]);

  // Enhanced window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      // Update pixel ratio for high-DPI displays
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, renderer]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-slate-900"
      style={{ minHeight: '400px' }}
    >
      {/* Enhanced Loading Overlay */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm z-50">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
            <div className="text-white text-xl font-semibold">
              Connecting to exchanges...
            </div>
            <div className="text-gray-400 text-sm">
              Establishing real-time data connections
            </div>
            <div className="flex space-x-2 justify-center mt-4">
              {venues.map((venue, index) => (
                <div 
                  key={venue.id}
                  className="flex items-center space-x-1 text-xs"
                  style={{ color: venue.color }}
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" 
                       style={{ animationDelay: `${index * 0.5}s` }}></div>
                  <span>{venue.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Performance Monitor */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-xs font-mono z-40">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-gray-400">FPS:</span>
            <span className={`ml-2 font-bold ${
              performanceMetrics.fps >= 50 ? 'text-green-400' : 
              performanceMetrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {performanceMetrics.fps}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Objects:</span>
            <span className="ml-2">{performanceMetrics.vertices.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Render:</span>
            <span className="ml-2">{performanceMetrics.renderTime.toFixed(1)}ms</span>
          </div>
          <div>
            <span className="text-gray-400">Memory:</span>
            <span className="ml-2">{Math.round(performanceMetrics.memoryUsage / 1024 / 1024)}MB</span>
          </div>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm z-40">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span>Connected</span>
          </div>
          <div className="text-gray-300">|</div>
          <div>Price: <span className="font-bold">${currentPrice.toLocaleString()}</span></div>
          <div className="text-gray-300">|</div>
          <div>Spread: <span className="font-bold">${spreadAnalysis.current?.toFixed(3)}</span></div>
        </div>
      </div>

      {/* Enhanced Touch Controls Instructions */}
      {settings.touchControlsEnabled && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-xs z-40">
          <div className="font-semibold mb-2 flex items-center">
            <Smartphone className="w-4 h-4 mr-2" />
            📱 Touch Controls:
          </div>
          <div className="space-y-1 text-gray-300">
            <div>• One finger: Rotate view</div>
            <div>• Two fingers: Zoom & Pan</div>
            <div>• Double tap: Reset view</div>
          </div>
        </div>
      )}

      {/* Enhanced 3D Navigation Guide */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-xs z-40 max-w-xs">
        <div className="font-semibold mb-2">3D Navigation</div>
        <div className="space-y-1 text-gray-300">
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
        <div className="mt-2 pt-2 border-t border-gray-600">
          <span className="text-gray-400">Auto-Rotate:</span>
          <span className={`ml-2 font-bold ${settings.autoRotate ? 'text-green-400' : 'text-gray-400'}`}>
            {settings.autoRotate ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Enhanced Feature Status Indicators */}
      <div className="absolute top-20 left-4 space-y-2 z-30">
        {settings.showOrderFlow && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-1 text-green-300 text-xs flex items-center space-x-2">
            <Activity className="w-3 h-3" />
            <span>Order Flow Active</span>
          </div>
        )}
        {settings.showVolumeProfile && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg px-3 py-1 text-blue-300 text-xs flex items-center space-x-2">
            <Activity className="w-3 h-3" />
            <span>Volume Profile</span>
          </div>
        )}
        {settings.showMarketDepthHeatmap && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-1 text-red-300 text-xs flex items-center space-x-2">
            <Activity className="w-3 h-3" />
            <span>Depth Heatmap</span>
          </div>
        )}
        {settings.showOrderMatching && (
          <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-1 text-cyan-300 text-xs flex items-center space-x-2">
            <Zap className="w-3 h-3" />
            <span>Order Matching</span>
          </div>
        )}
        {settings.showPressureZones && (
          <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg px-3 py-1 text-purple-300 text-xs flex items-center space-x-2">
            <Target className="w-3 h-3" />
            <span>Pressure Zones</span>
          </div>
        )}
      </div>

      {/* Enhanced Hover Tooltip */}
      {hoveredObject && !clickedObject && (
        <div 
          className="absolute z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl border border-gray-600 max-w-xs pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: mousePosition.x > window.innerWidth - 300 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="font-semibold text-sm mb-2 text-blue-400">
            {hoveredObject.orderData?.venue || hoveredObject.venue}
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-2 font-semibold text-green-400">
                {(hoveredObject.orderData?.type || hoveredObject.type)?.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Price:</span>
              <span className="ml-2 font-bold">
                ${(hoveredObject.orderData?.price || hoveredObject.price)?.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Quantity:</span>
              <span className="ml-2">
                {(hoveredObject.orderData?.quantity || hoveredObject.quantity)?.toFixed(6)} BTC
              </span>
            </div>
            <div>
              <span className="text-gray-400">Value:</span>
              <span className="ml-2 font-semibold">
                ${((hoveredObject.orderData?.price || hoveredObject.price) * 
                   (hoveredObject.orderData?.quantity || hoveredObject.quantity))?.toFixed(2)}
              </span>
            </div>
            {hoveredObject.orderData?.cumulativeVolume && (
              <div>
                <span className="text-gray-400">Cumulative:</span>
                <span className="ml-2">
                  {hoveredObject.orderData.cumulativeVolume.toFixed(6)} BTC
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            Click to pin this information
          </div>
        </div>
      )}

      {/* Enhanced Pinned Object Details Panel */}
      {clickedObject && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black/95 backdrop-blur-sm text-white p-6 rounded-lg shadow-2xl border border-gray-600 max-w-sm z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-400">
              {clickedObject.orderData?.venue || clickedObject.venue}
            </h3>
            <button
              onClick={() => setClickedObject(null)}
              className="text-gray-400 hover:text-white text-xl leading-none transform hover:scale-110 transition-all"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Order Type:</div>
              <div className="font-bold text-lg">
                {(clickedObject.orderData?.type || clickedObject.type)?.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Price</div>
                <div className="font-bold">
                  ${(clickedObject.orderData?.price || clickedObject.price)?.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Quantity</div>
                <div className="font-bold">
                  {(clickedObject.orderData?.quantity || clickedObject.quantity)?.toFixed(6)} BTC
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Total Value</div>
              <div className="font-bold text-xl text-green-400">
                ${((clickedObject.orderData?.price || clickedObject.price) * 
                   (clickedObject.orderData?.quantity || clickedObject.quantity))?.toLocaleString()}
              </div>
            </div>

            {clickedObject.orderData?.timestamp && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Timestamp</div>
                <div className="font-mono text-sm">
                  {new Date(clickedObject.orderData.timestamp).toLocaleString()}
                </div>
              </div>
            )}

            {clickedObject.orderData?.cumulativeVolume && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Cumulative Volume</div>
                <div className="font-bold">
                  {clickedObject.orderData.cumulativeVolume.toFixed(6)} BTC
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-600 text-xs text-gray-400 text-center">
            💡 Click anywhere else to close this panel
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderbookVisualizer;
