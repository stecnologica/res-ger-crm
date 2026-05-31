import { Client, Product, Sale } from './types';

export const CLIENTS: Client[] = [
  { id: 'AM', name: 'Alejandro Morales', company: 'TechNova Solutions', email: 'amorales@technova.com', phone: '+34 612 345 678', address: 'Calle Mayor 15, Madrid', registrationDate: '12 Oct 2023', status: 'Activo', type: 'Enterprise' },
  { id: 'LG', name: 'Lucía García', company: 'Green Energy Co.', email: 'l.garcia@greeneco.es', phone: '+34 918 223 114', address: 'Av. Diagonal 440, Barcelona', registrationDate: '05 Nov 2023', status: 'Activo', type: 'Mid-Market' },
  { id: 'RP', name: 'Ricardo Pineda', company: 'Skyline Real Estate', email: 'rpineda@skyline.org', phone: '+34 655 443 221', address: 'Paseo de la Castellana 95, Madrid', registrationDate: '15 Ene 2024', status: 'Activo', type: 'Enterprise' },
  { id: 'SD', name: 'Sara Delgado', company: 'Nova Start', email: 'sara@novastart.io', phone: '+34 600 111 222', address: 'Calle Betis 12, Sevilla', registrationDate: '02 Feb 2024', status: 'Inactivo', type: 'Startup' },
];

export const PRODUCTS: Product[] = [
  { id: '1', name: 'Cronos Ultra Elite', sku: 'WA-772-BLK', category: 'Electrónica', price: 299.00, stock: 84, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200' },
  { id: '2', name: 'Sonic Pro X200', sku: 'AU-105-PRO', category: 'Electrónica', price: 185.50, stock: 4, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200' },
  { id: '3', name: 'Lúmina Flex Desk', sku: 'OF-901-LUM', category: 'Oficina', price: 45.00, stock: 152, image: 'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?auto=format&fit=crop&q=80&w=200' },
  { id: '4', name: 'RESGER Suite SaaS', sku: 'SW-SUB-50', category: 'Software', price: 1200.00, stock: '∞', image: '' },
  { id: '5', name: 'Válvula Titan 450', sku: 'ME-CH-442', category: 'Industrial', price: 72.25, stock: 2, image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&q=80&w=200' },
];

export const SALES_HISTORY: Sale[] = [
  { id: '#INV-8902', client: 'Acme Corp', clientEmail: 'sarah@acme.com', date: 'Oct 24, 2023', time: '14:22 PM', total: 4500.00, status: 'Pagado' },
  { id: '#INV-8901', client: 'Global Tech', clientEmail: 'billing@global.com', date: 'Oct 23, 2023', time: '09:15 AM', total: 12400.00, status: 'Pendiente' },
  { id: '#INV-8900', client: 'Polaris Ltd', clientEmail: 'mike@polaris.com', date: 'Oct 22, 2023', time: '16:45 PM', total: 850.00, status: 'Cancelado' },
  { id: '#INV-8899', client: 'Next Step', clientEmail: 'info@nextstep.io', date: 'Oct 21, 2023', time: '11:00 AM', total: 2100.00, status: 'Pagado' },
];
