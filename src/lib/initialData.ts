import { Product } from '../types';

export const INDUSTRIES = [
  { id: 'cafeteria', name: 'Cafetería', icon: 'local_cafe' },
  { id: 'ferreteria', name: 'Ferretería', icon: 'construction' },
  { id: 'restaurante', name: 'Restaurante', icon: 'restaurant' },
  { id: 'minimercado', name: 'Minimercado / Tienda', icon: 'storefront' },
  { id: 'papeleria', name: 'Papelería', icon: 'description' }
];

export const INITIAL_PRODUCTS_BY_INDUSTRY: Record<string, any[]> = {
  cafeteria: [
    { name: 'Café Espresso Doble', description: 'Intenso café espresso de grano arábica seleccionado', price: 2.50, cost: 0.60, stock: 120, minStock: 20, category: 'Bebidas Calientes' },
    { name: 'Capuccino Grande', description: 'Espresso con leche vaporizada y espuma cremosa', price: 3.50, cost: 0.90, stock: 85, minStock: 15, category: 'Bebidas Calientes' },
    { name: 'Croissant de Almendras', description: 'Hojaldre francés crujiente relleno de crema de almendras', price: 3.00, cost: 1.10, stock: 8, minStock: 10, category: 'Repostería' },
    { name: 'Muffin de Arándanos', description: 'Esponjoso panqué de vainilla con arándanos frescos', price: 2.80, cost: 0.80, stock: 15, minStock: 5, category: 'Repostería' },
    { name: 'Té Matcha Latte', description: 'Té verde matcha premium con leche de avena', price: 4.20, cost: 1.20, stock: 45, minStock: 10, category: 'Bebidas Calientes' },
    { name: 'Sandwich Caprese', description: 'Focaccia con mozzarella, tomate fresco, albahaca y pesto', price: 6.50, cost: 2.30, stock: 3, minStock: 8, category: 'Salados' },
    { name: 'Café Frío (Cold Brew)', description: 'Café extraído en frío por 18 horas con hielo', price: 3.80, cost: 0.70, stock: 60, minStock: 12, category: 'Bebidas Frías' }
  ],
  ferreteria: [
    { name: 'Martillo Pro de 16oz', description: 'Martillo de uña con mango de fibra de vidrio', price: 14.90, cost: 6.50, stock: 24, minStock: 5, category: 'Herramientas Manuales' },
    { name: 'Taladro Inalámbrico 20V', description: 'Taladro percutor con 2 baterías de litio y maletín', price: 89.90, cost: 42.00, stock: 4, minStock: 5, category: 'Herramientas Eléctricas' },
    { name: 'Juego de Destornilladores (6 pzas)', description: 'Destornilladores planos y phillips con mango ergonómico', price: 12.50, cost: 5.00, stock: 18, minStock: 4, category: 'Herramientas Manuales' },
    { name: 'Cinta Métrica 5 metros', description: 'Flexómetro de alta resistencia con seguro', price: 5.50, cost: 1.80, stock: 40, minStock: 10, category: 'Medición' },
    { name: 'Caja de Tornillos para Madera 2"', description: 'Caja con 100 tornillos autorroscantes fosfatados', price: 6.20, cost: 2.10, stock: 50, minStock: 15, category: 'Fijación' },
    { name: 'Pintura Acrílica Blanca 1 Galón', description: 'Pintura de alta cobertura para interiores y exteriores', price: 28.00, cost: 13.50, stock: 2, minStock: 6, category: 'Pinturas' },
    { name: 'Lijadora Orbital 240W', description: 'Lijadora de acabado con recolección de polvo', price: 45.00, cost: 21.00, stock: 8, minStock: 3, category: 'Herramientas Eléctricas' }
  ],
  restaurante: [
    { name: 'Hamburguesa RESGER Double', description: 'Doble carne de res premium, queso cheddar, tocino y aderezo especial', price: 12.90, cost: 4.80, stock: 95, minStock: 20, category: 'Platillos Fuertes' },
    { name: 'Papas Fritas Trufadas', description: 'Papas fritas crujientes con aceite de trufa y parmesano', price: 5.50, cost: 1.50, stock: 110, minStock: 15, category: 'Acompañamientos' },
    { name: 'Pizza Margherita Artesanal', description: 'Salsa de tomate natural, mozzarella de búfala y albahaca fresca', price: 14.00, cost: 4.20, stock: 5, minStock: 10, category: 'Platillos Fuertes' },
    { name: 'Ensalada César con Pollo', description: 'Lechuga romana, aderezo césar, croutones, parmesano y pechuga a la parrilla', price: 9.80, cost: 3.10, stock: 35, minStock: 8, category: 'Entradas' },
    { name: 'Cerveza Artesanal IPA', description: 'Cerveza local con notas cítricas e intenso lúpulo', price: 4.50, cost: 1.80, stock: 48, minStock: 12, category: 'Bebidas' },
    { name: 'Pastel Volcán de Chocolate', description: 'Pastelito de chocolate tibio con centro líquido y helado de vainilla', price: 6.90, cost: 2.00, stock: 3, minStock: 8, category: 'Postres' },
    { name: 'Limonada de Coco', description: 'Bebida refrescante licuada con crema de coco fresca', price: 3.90, cost: 0.90, stock: 80, minStock: 15, category: 'Bebidas' }
  ],
  minimercado: [
    { name: 'Arroz Extra de Grano Largo 1kg', description: 'Arroz blanco seleccionado grado 1', price: 1.80, cost: 0.90, stock: 250, minStock: 50, category: 'Abarrotes' },
    { name: 'Aceite Vegetal Canola 1 Litro', description: 'Aceite de cocina de alta pureza y libre de colesterol', price: 3.90, cost: 2.10, stock: 8, minStock: 20, category: 'Abarrotes' },
    { name: 'Leche Entera de Vaca 1L', description: 'Leche pasteurizada adicionada con vitaminas A y D', price: 1.40, cost: 0.80, stock: 180, minStock: 30, category: 'Lácteos' },
    { name: 'Detergente Líquido Multiusos 2L', description: 'Fórmula concentrada con aroma fresco', price: 7.50, cost: 3.60, stock: 45, minStock: 10, category: 'Limpieza' },
    { name: 'Cereal de Avena Tradicional 500g', description: 'Hojuelas de avena de grano entero listas para cocinar', price: 2.90, cost: 1.30, stock: 70, minStock: 15, category: 'Desayunos' },
    { name: 'Jabón Corporal Humectante 3 pzas', description: 'Barra de jabón con crema humectante', price: 3.20, cost: 1.40, stock: 4, minStock: 12, category: 'Higiene Personal' },
    { name: 'Café Molido Gourmet 250g', description: 'Café de altura 100% arábica tostado medio', price: 5.80, cost: 2.90, stock: 65, minStock: 15, category: 'Abarrotes' }
  ],
  papeleria: [
    { name: 'Cuaderno Universitario Cuadriculado', description: '100 hojas, espiral metálico doble, tapa dura', price: 3.50, cost: 1.20, stock: 150, minStock: 25, category: 'Escolar' },
    { name: 'Caja de Lapiceros de Gel Negro (12 pzas)', description: 'Punta fina 0.5mm de escritura ultra suave', price: 8.90, cost: 3.20, stock: 30, minStock: 8, category: 'Escritura' },
    { name: 'Resma de Papel Carta Multifuncional', description: '500 hojas de papel blanco multiusos de 75g', price: 5.90, cost: 2.80, stock: 6, minStock: 15, category: 'Papel' },
    { name: 'Plumas de Colores Surtidos (8 pzas)', description: 'Bolígrafos con grip ergonómico y tinta viva', price: 4.20, cost: 1.50, stock: 48, minStock: 10, category: 'Escritura' },
    { name: 'Juego Geométrico Profesional', description: 'Contiene regla, escuadras, transportador y compás', price: 7.50, cost: 3.00, stock: 22, minStock: 5, category: 'Escolar' },
    { name: 'Calculadora Científica 240 Funciones', description: 'Pantalla de 2 líneas, ideal para secundaria y bachillerato', price: 18.50, cost: 8.00, stock: 2, minStock: 5, category: 'Electrónicos' },
    { name: 'Caja de Colores Premium (24 Tonos)', description: 'Lápices de colores con mina resistente y suave', price: 11.90, cost: 4.80, stock: 35, minStock: 8, category: 'Arte / Oficina' }
  ]
};
