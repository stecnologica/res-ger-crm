import { LucideIcon } from 'lucide-react';

export type Screen = 'Dashboard' | 'Clients' | 'Products' | 'NewSale' | 'SalesHistory' | 'CreateClient' | 'CreateProduct' | 'EditProduct' | 'Settings' | 'UserManagement';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  screen: Screen;
}

export interface Company {
  id: string;
  nombre: string;
  owner_id: string;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'employee';
  created_at: string;
  company?: Company;
}

export interface Client {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  created_at: string;
  user_id: string;
  company_id: string;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria?: string;
  imagen_url?: string;
  created_at: string;
  user_id: string;
  company_id: string;
}

export interface Sale {
  id: string;
  cliente_id: string;
  total: number;
  created_at: string;
  user_id: string;
  company_id: string;
  clientes?: {
    nombre: string;
    email: string;
  };
}

export interface SaleItem {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  productos?: {
    nombre: string;
  };
}
