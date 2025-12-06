import React, { useState, useEffect, useRef } from 'react';
import InteractiveMap from './components/InteractiveMap';
import InvestmentChart from './components/InvestmentChart';
import SubscriptionModal from './components/SubscriptionModal';
import { analyzeProperty, findNearbyProperties } from './services/geminiService';
import { MOCK_PROPERTIES } from './constants';
import { Property, InvestmentAnalysis } from './types';

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Filter & View States
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  // Analyze property when selected, but check subscription
  useEffect(() => {
    if (selectedProperty) {
      if (!isSubscribed) {
        setShowPaywall(true);
        // We do not fetch analysis if not subscribed
        setAnalysis(null); 
      } else {
        fetchAnalysis(selectedProperty);
      }
      // Note: We no longer force sidebar open here to allow map focus on mobile when clicking from list
    }
  }, [selectedProperty, isSubscribed]);

  const fetchAnalysis = async (property: Property) => {
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const result = await analyzeProperty(property);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleSubscribe = () => {
    // Simulate payment process
    setTimeout(() => {
      setIsSubscribed(true);
      setShowPaywall(false);
      // Automatically analyze selected property after subscription
      if (selectedProperty) {
        fetchAnalysis(selectedProperty);
      }
    }, 1000);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const handleExploreNearby = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setLoadingNearby(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // 1. Try to filter existing mock properties first
        const nearbyExisting = MOCK_PROPERTIES.filter(p => 
          calculateDistance(latitude, longitude, p.location.lat, p.location.lng) <= 10 // 10km radius
        );

        if (nearbyExisting.length > 0) {
          setProperties(nearbyExisting);
          // If we found some, assume we are in the demo area (Madrid) and just focus there
          setLoadingNearby(false);
        } else {
          // 2. If no mock properties nearby, use Gemini Maps Grounding to find real places
          try {
            const foundProperties = await findNearbyProperties(latitude, longitude);
            if (foundProperties.length > 0) {
              setProperties(foundProperties);
            } else {
              alert("No se encontraron propiedades en tu zona.");
            }
          } catch (e) {
            console.error(e);
            alert("Error al buscar propiedades cercanas.");
          } finally {
            setLoadingNearby(false);
          }
        }
        
        // Close sidebar on mobile to show map
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
      },
      (error) => {
        setLoadingNearby(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Para ver propiedades cercanas, por favor permite el acceso a tu ubicación.");
        } else {
          alert("No se pudo obtener la ubicación.");
        }
      }
    );
  };

  const generateMoreProperties = () => {
    const start = properties.length + 1;
    const baseLat = userLocation ? userLocation.lat : 40.4168;
    const baseLng = userLocation ? userLocation.lng : -3.7038;

    const newProps: Property[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `generated-${Date.now()}-${i}`,
      name: `Propiedad Listada ${start + i}`,
      location: {
        lat: baseLat + (Math.random() - 0.5) * 0.05,
        lng: baseLng + (Math.random() - 0.5) * 0.05,
        address: `Calle Nueva ${start + i}, Zona Centro`
      },
      price: Math.floor(150000 + Math.random() * 500000),
      type: Math.random() > 0.5 ? 'Apartamento' : 'Casa',
      status: 'Usado',
      size: 80 + Math.floor(Math.random() * 100),
      imageUrl: `https://picsum.photos/800/60${(start + i) % 9}`,
      description: 'Propiedad cargada dinámicamente para demostración.'
    }));
    return newProps;
  };

  const handleScroll = () => {
    if (!sidebarContentRef.current || loadingMore || selectedProperty) return;
    
    const { scrollTop, scrollHeight, clientHeight } = sidebarContentRef.current;
    
    // Check if user is near bottom
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setLoadingMore(true);
      // Simulate network request
      setTimeout(() => {
        const newProps = generateMoreProperties();
        setProperties(prev => [...prev, ...newProps]);
        setLoadingMore(false);
      }, 1000);
    }
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    // On mobile, close sidebar to show map. 
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }
  };

  // Filter Logic
  const filteredProperties = properties.filter(property => {
    const typeMatch = filterType === 'Todos' || property.type === filterType;
    const statusMatch = filterStatus === 'Todos' || property.status === filterStatus;
    const searchMatch = searchQuery === '' || 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        property.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden relative font-sans">
      {/* Sidebar */}
      <div 
        className={`absolute md:relative z-20 h-full bg-white shadow-xl transition-all duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0 w-full md:w-96' : '-translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}`}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              II
            </div>
            <h1 className="font-bold text-slate-800 text-lg">InmoInvest Pro</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
            <button 
                onClick={handleExploreNearby}
                disabled={loadingNearby}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
                {loadingNearby ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                )}
                <span>{loadingNearby ? 'Buscando zona...' : 'Explorar mi zona'}</span>
            </button>

            {/* Search Input */}
            <div className="relative">
                <input 
                    type="text"
                    placeholder="Buscar por nombre o dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <div className="flex gap-2">
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-blue-300 transition-colors"
                >
                    <option value="Todos">Tipo: Todos</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Comercial">Comercial</option>
                </select>
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-blue-300 transition-colors"
                >
                    <option value="Todos">Estado: Todos</option>
                    <option value="En Construcción">En Construcción</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Usado">Usado</option>
                </select>
            </div>

            <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  {filteredProperties.length} Resultados
                </span>
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                    <button
                        onClick={() => setViewMode('list')}
                        title="Vista Lista"
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        title="Vista Cuadrícula"
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    </button>
                </div>
            </div>
        </div>

        <div 
            ref={sidebarContentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
        >
          {!selectedProperty ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-4'} pb-4`}>
                {filteredProperties.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <p className="text-sm">No se encontraron resultados.</p>
                        <button onClick={() => { setFilterType('Todos'); setFilterStatus('Todos'); setSearchQuery(''); }} className="text-blue-600 text-xs font-bold mt-2 hover:underline">Limpiar filtros</button>
                    </div>
                )}

                {filteredProperties.map(property => (
                    viewMode === 'list' ? (
                        // LIST VIEW ITEM
                        <div 
                            key={property.id} 
                            onClick={() => handlePropertyClick(property)} 
                            className="cursor-pointer bg-white p-3 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:border-blue-200 flex gap-3 group"
                        >
                            <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                                <img src={property.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={property.name} />
                                <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${property.status === 'En Construcción' ? 'bg-amber-500' : 'bg-green-500'}`}>
                                    {property.status}
                                </div>
                            </div>
                            <div className="flex flex-col justify-between flex-1 py-0.5">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 group-hover:text-blue-600 transition-colors">{property.name}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2">{property.location.address}</p>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-900 block">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.price)}
                                    </span>
                                    <div className="flex gap-2 text-[10px] text-slate-400 mt-1 items-center">
                                    <span>{property.type}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>{property.size}m²</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // GRID VIEW ITEM
                        <div 
                            key={property.id} 
                            onClick={() => handlePropertyClick(property)} 
                            className="cursor-pointer bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:border-blue-200 flex flex-col overflow-hidden group h-full"
                        >
                            <div className="relative h-28 w-full overflow-hidden">
                                <img src={property.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={property.name} />
                                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white shadow-sm ${property.status === 'En Construcción' ? 'bg-amber-500' : 'bg-green-500'}`}>
                                    {property.status}
                                </div>
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="font-bold text-slate-800 text-xs leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors" title={property.name}>{property.name}</h3>
                                <p className="text-[10px] text-slate-500 line-clamp-1 mb-2">{property.location.address}</p>
                                
                                <div className="mt-auto pt-2 border-t border-slate-50 flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-900 text-sm">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.price)}
                                    </span>
                                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                                        <span>{property.type}</span>
                                        <span>{property.size}m²</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ))}
                
                {loadingMore && (
                    <div className="col-span-full flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                )}
                
                {filteredProperties.length > 0 && (
                    <div className="col-span-full text-center text-xs text-slate-400 py-4 border-t border-slate-100 border-dashed mt-2">
                        Desliza para ver más
                    </div>
                )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => {
                    setSelectedProperty(null);
                    // Ensure sidebar stays open when going back to list (Desktop behavior)
                    setIsSidebarOpen(true);
                }}
                className="flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Volver al listado
              </button>

              {/* Property Image & Basic Info */}
              <div className="rounded-xl overflow-hidden shadow-sm">
                <img src={selectedProperty.imageUrl} alt={selectedProperty.name} className="w-full h-48 object-cover" />
                <div className="p-4 bg-white border border-slate-100 border-t-0 rounded-b-xl">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="font-bold text-xl text-slate-900">{selectedProperty.name}</h2>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${selectedProperty.status === 'En Construcción' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {selectedProperty.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">{selectedProperty.location.address}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-slate-800">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedProperty.price)}
                    </span>
                    <div className="text-right text-xs text-slate-400">
                      <div>{selectedProperty.size} m²</div>
                      <div>{selectedProperty.type}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Section */}
              <div className="relative mt-6">
                 {!isSubscribed && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border border-slate-200 rounded-xl">
                        <p className="text-slate-800 font-semibold mb-2">Análisis reservado para Pro</p>
                        <button 
                            onClick={() => setShowPaywall(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                            Desbloquear
                        </button>
                    </div>
                 )}

                 {loadingAnalysis ? (
                   <div className="bg-white p-8 rounded-xl border border-slate-100 flex flex-col items-center justify-center h-64">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                     <p className="text-slate-500 animate-pulse">Generando proyección con Gemini AI...</p>
                   </div>
                 ) : analysis ? (
                   <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Valorización (2 años)</p>
                            <p className="text-2xl font-bold text-green-600">+{analysis.appreciationPercentage}%</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Riesgo</p>
                            <p className={`text-2xl font-bold ${analysis.riskLevel === 'Alto' ? 'text-red-500' : analysis.riskLevel === 'Medio' ? 'text-amber-500' : 'text-green-500'}`}>
                                {analysis.riskLevel}
                            </p>
                        </div>
                     </div>

                     <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Proyección de Valor</h3>
                        <InvestmentChart data={analysis.chartData} />
                     </div>

                     <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-2">Análisis de Mercado</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {analysis.marketSummary}
                        </p>
                     </div>
                   </div>
                 ) : null}
              </div>
            </div>
          )}
        </div>
        
        {/* User Status Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold">U</div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">Usuario Invitado</span>
                        <span className="text-xs text-slate-500">{isSubscribed ? 'Plan Pro' : 'Plan Gratuito'}</span>
                    </div>
                </div>
                {!isSubscribed && (
                    <button 
                        onClick={() => setShowPaywall(true)}
                        className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold hover:bg-amber-200 transition"
                    >
                        Mejorar
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative h-full">
        {/* Mobile Toggle */}
        {!isSidebarOpen && (
             <button 
             onClick={() => setIsSidebarOpen(true)}
             className="absolute top-4 left-4 z-10 bg-white p-2 rounded-lg shadow-md text-slate-600 hover:text-blue-600 md:hidden"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
           </button>
        )}
        
        <InteractiveMap 
            properties={filteredProperties} 
            selectedProperty={selectedProperty}
            onSelectProperty={(p) => {
                setSelectedProperty(p);
                // When selecting from map, we want to see details in sidebar
                setIsSidebarOpen(true);
            }} 
            userLocation={userLocation}
        />
        
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
      />
    </div>
  );
};

export default App;