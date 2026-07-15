export const PRODUCTS = Object.freeze([
  {
    id: "calc-scientific",
    name: "Calculadora científica",
    category: "Tecnología",
    description: "Calculadora educativa con funciones trigonométricas y estadísticas.",
    price: 78000,
    stock: 8,
    icon: "🧮"
  },
  {
    id: "geometry-kit",
    name: "Kit de geometría",
    category: "Matemáticas",
    description: "Regla, escuadras, transportador y compás en estuche reutilizable.",
    price: 32000,
    stock: 12,
    icon: "📐"
  },
  {
    id: "notebook-grid",
    name: "Cuaderno cuadriculado",
    category: "Papelería",
    description: "Cuaderno de 100 hojas para ejercicios, gráficas y laboratorios.",
    price: 18500,
    stock: 20,
    icon: "📓"
  },
  {
    id: "usb-drive",
    name: "Memoria USB 32 GB",
    category: "Tecnología",
    description: "Almacenamiento portátil para proyectos, presentaciones y respaldos.",
    price: 42000,
    stock: 6,
    icon: "💾"
  },
  {
    id: "science-kit",
    name: "Kit de laboratorio escolar",
    category: "Ciencias",
    description: "Vaso graduado, gotero, gafas y elementos para prácticas demostrativas.",
    price: 96000,
    stock: 4,
    icon: "🧪"
  },
  {
    id: "marker-pack",
    name: "Marcadores borrables",
    category: "Papelería",
    description: "Paquete de cuatro marcadores para tablero, colores surtidos.",
    price: 26000,
    stock: 15,
    icon: "🖍️"
  }
]);

export const CATEGORIES = Object.freeze([
  ...new Set(PRODUCTS.map((product) => product.category))
]);
