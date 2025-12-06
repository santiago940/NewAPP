import React, { useEffect, useRef, useState } from 'react';
import { Property } from '../types';

interface InteractiveMapProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  selectedProperty: Property | null;
  userLocation?: { lat: number; lng: number } | null;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ properties, onSelectProperty, selectedProperty, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);

  // Local state for map configuration
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize map
    const L = window.L;
    const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 13); // Madrid default

    // Tile layer initialized in separate effect
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Layer Switching
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    if (tileLayerRef.current) {
        tileLayerRef.current.remove();
    }

    const tileUrl = mapType === 'satellite'
        ? 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const options = mapType === 'satellite'
        ? { 
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], 
            maxZoom: 20,
            attribution: '&copy; Google Maps'
          }
        : { 
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
          };

    tileLayerRef.current = L.tileLayer(tileUrl, options).addTo(map);

  }, [mapType]);

  // Handle Heatmap Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
    }

    if (showHeatmap && L.heatLayer) {
        // Create heatmap points: [lat, lng, intensity]
        const points = properties.map(p => [
            p.location.lat, 
            p.location.lng, 
            0.8 // Standard intensity
        ]);
        
        heatLayerRef.current = L.heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 15,
            minOpacity: 0.4,
            gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        }).addTo(map);
    }

  }, [showHeatmap, properties]);

  // Update property markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Clear existing property markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // If heatmap is on, we hide markers to reduce clutter (optional choice based on UI toggle)
    if (showHeatmap) return;

    // Add new markers
    properties.forEach(property => {
      const isSelected = selectedProperty?.id === property.id;
      
      // Custom icon
      const iconHtml = `
        <div class="${isSelected ? 'bg-blue-600 scale-110' : 'bg-slate-700'} text-white rounded-full p-2 border-2 border-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center w-8 h-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const marker = L.marker([property.location.lat, property.location.lng], { icon })
        .addTo(map)
        .on('click', () => onSelectProperty(property));

      markersRef.current.push(marker);
    });
  }, [properties, selectedProperty, onSelectProperty, showHeatmap]);

  // Handle Selection: Fly to, Draw Boundaries, and Show Popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    // 1. Clean up existing boundary layer
    if (boundaryLayerRef.current) {
        boundaryLayerRef.current.remove();
        boundaryLayerRef.current = null;
    }

    if (selectedProperty) {
        // 2. Draw boundary polygon if data exists
        if (selectedProperty.boundaries && selectedProperty.boundaries.length > 0) {
            const polygon = L.polygon(selectedProperty.boundaries, {
                color: '#2563eb', // blue-600
                weight: 3,
                opacity: 0.9,
                fillColor: '#3b82f6', // blue-500
                fillOpacity: 0.2,
                dashArray: '5, 5' // Dashed line for a "plot" look
            }).addTo(map);

            boundaryLayerRef.current = polygon;
            
            // Smart fit: Zoom to fit the polygon boundaries with some padding
            map.fitBounds(polygon.getBounds(), {
                padding: [50, 50],
                maxZoom: 18,
                duration: 1.5,
                animate: true
            });
        } else {
             // Fallback if no boundaries: Fly to point location
            map.flyTo(
                [selectedProperty.location.lat, selectedProperty.location.lng], 
                17, 
                { duration: 1.5 }
            );
        }

        // 3. Show Detailed Popup
        const priceFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(selectedProperty.price);
        
        // We create a DOM element to attach the click event listener properly
        const container = document.createElement('div');
        container.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
        container.style.minWidth = "260px";

        container.innerHTML = `
            <div style="position: relative; height: 160px; border-radius: 8px 8px 0 0; overflow: hidden; margin-bottom: 12px;">
                 <img src="${selectedProperty.imageUrl}" alt="${selectedProperty.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                 <div style="position: absolute; top: 8px; right: 8px; background: ${selectedProperty.status === 'En Construcción' ? '#f59e0b' : '#22c55e'}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${selectedProperty.status}
                 </div>
            </div>
            <div style="padding: 0 4px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1e293b;">${selectedProperty.name}</h3>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; display: flex; align-items: center;">
                   <svg style="width: 12px; height: 12px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                   ${selectedProperty.location.address}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                         <p style="font-size: 10px; color: #94a3b8; margin: 0; text-transform: uppercase; font-weight: bold;">Precio</p>
                        <span style="font-size: 18px; font-weight: 800; color: #2563eb;">${priceFormatted}</span>
                    </div>
                     <div style="text-align: right;">
                         <p style="font-size: 10px; color: #94a3b8; margin: 0; text-transform: uppercase; font-weight: bold;">Área</p>
                        <span style="font-size: 14px; font-weight: 600; color: #475569;">${selectedProperty.size} m²</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <span style="background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${selectedProperty.type}</span>
                </div>

                <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                    ${selectedProperty.description.substring(0, 100)}${selectedProperty.description.length > 100 ? '...' : ''}
                </p>

                <button id="popup-view-details-btn" style="display: block; width: 100%; background-color: #2563eb; color: white; text-align: center; padding: 10px; margin-top: 12px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 13px; transition: background-color 0.2s;">
                    Ver Detalles
                </button>
            </div>
        `;

        // Attach event listener to the button
        const btn = container.querySelector('#popup-view-details-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                // Prevent map click propagation
                L.DomEvent.stopPropagation(e);
                onSelectProperty(selectedProperty);
            });
            // Add hover effect via JS since inline styles don't support pseudo-classes well
            btn.addEventListener('mouseenter', () => { (btn as HTMLElement).style.backgroundColor = '#1d4ed8'; });
            btn.addEventListener('mouseleave', () => { (btn as HTMLElement).style.backgroundColor = '#2563eb'; });
        }

        L.popup({ 
            offset: [0, -30],
            closeButton: false, 
            className: 'property-popup',
            maxWidth: 320,
            autoPan: true,
            autoPanPadding: [50, 50]
        })
        .setLatLng([selectedProperty.location.lat, selectedProperty.location.lng])
        .setContent(container)
        .openOn(map);

    } else {
        map.closePopup();
    }
  }, [selectedProperty]);

  // Handle user location updates
  useEffect(() => {
    if (userLocation && mapInstanceRef.current && window.L) {
        const map = mapInstanceRef.current;
        const L = window.L;

        // Remove existing user marker
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
        }

        // Add user marker
        const userIconHtml = `
            <div class="relative flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
            </div>
        `;

        const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: userIconHtml,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup("Estás aquí");

        // Center map on user
        map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Map Overlay Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 w-48">
                <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Mapa</p>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setMapType('standard')}
                            className={`flex-1 py-1 px-2 text-xs rounded-md font-medium transition-all ${mapType === 'standard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Mapa
                        </button>
                        <button 
                            onClick={() => setMapType('satellite')}
                            className={`flex-1 py-1 px-2 text-xs rounded-md font-medium transition-all ${mapType === 'satellite' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Satélite
                        </button>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capas</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowHeatmap(false)}
                            className={`flex-1 py-1.5 px-2 text-xs rounded-lg font-medium border transition-all ${!showHeatmap ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            Marcadores
                        </button>
                        <button 
                            onClick={() => setShowHeatmap(true)}
                            className={`flex-1 py-1.5 px-2 text-xs rounded-lg font-medium border transition-all ${showHeatmap ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            Calor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InteractiveMap;