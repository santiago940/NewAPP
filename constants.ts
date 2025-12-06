import { Property } from './types';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    name: 'Torre Horizon',
    location: {
      lat: 40.4168,
      lng: -3.7038,
      address: 'Av. de la Castellana 200, Madrid',
    },
    price: 450000,
    type: 'Apartamento',
    status: 'En Construcción',
    size: 120,
    imageUrl: 'https://picsum.photos/800/600',
    description: 'Exclusivo proyecto residencial con vistas panorámicas y acabados de lujo.',
    boundaries: [
      [40.4170, -3.7040],
      [40.4170, -3.7036],
      [40.4166, -3.7036],
      [40.4166, -3.7040]
    ]
  },
  {
    id: '2',
    name: 'Residencial Los Olivos',
    location: {
      lat: 40.4200,
      lng: -3.7100,
      address: 'Calle Mayor 15, Madrid',
    },
    price: 320000,
    type: 'Casa',
    status: 'Usado',
    size: 150,
    imageUrl: 'https://picsum.photos/800/601',
    description: 'Casa histórica reformada en el centro de la ciudad.',
    boundaries: [
      [40.4203, -3.7103],
      [40.4203, -3.7097],
      [40.4199, -3.7095],
      [40.4197, -3.7100],
      [40.4198, -3.7105]
    ]
  },
  {
    id: '3',
    name: 'Centro Empresarial Tech',
    location: {
      lat: 40.4100,
      lng: -3.6900,
      address: 'Paseo del Prado 10, Madrid',
    },
    price: 1200000,
    type: 'Comercial',
    status: 'Nuevo',
    size: 300,
    imageUrl: 'https://picsum.photos/800/602',
    description: 'Oficinas modernas listas para ocupar en zona financiera.',
    boundaries: [
      [40.4105, -3.6905],
      [40.4105, -3.6895],
      [40.4095, -3.6895],
      [40.4095, -3.6905]
    ]
  }
];

export const SUBSCRIPTION_PRICE = 9.99;