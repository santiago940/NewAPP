export interface Property {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  price: number;
  type: 'Apartamento' | 'Casa' | 'Comercial';
  status: 'En Construcción' | 'Nuevo' | 'Usado';
  size: number; // m2
  imageUrl: string;
  description: string;
  boundaries?: [number, number][]; // Array of [lat, lng] coordinates for the polygon
}

export interface InvestmentAnalysis {
  projectedValue2Years: number;
  appreciationPercentage: number;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  marketSummary: string;
  chartData: Array<{ month: string; value: number }>;
}

export interface UserSubscription {
  isActive: boolean;
  plan: 'free' | 'pro';
}

// Leaflet types extension for global window object
declare global {
  interface Window {
    L: any;
  }
}