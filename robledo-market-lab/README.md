# Robledo Market Lab

Proyecto final **nivel senior de referencia** para Seminario de Programación. Está construido con HTML, CSS y JavaScript puro, sin frameworks, bases de datos ni servicios externos.

## Enlaces oficiales para estudiantes

- **Aplicación publicada:** https://juanperez238421-cpu.github.io/robledo-market-lab/
- **Código fuente vigente:** https://github.com/juanperez238421-cpu/juanperez238421-cpu.github.io/tree/main/robledo-market-lab
- **Rama oficial:** `main`
- **Versión de referencia:** `1.0.0`

La versión publicada y el código de la rama `main` constituyen la referencia vigente. Los estudiantes deben usarla para comprender arquitectura, flujo y calidad esperada, no para copiar literalmente la solución.

## Qué demuestra

- HTML semántico y accesible.
- CSS responsive con diseño de dos columnas.
- Catálogo generado desde un arreglo de objetos.
- Búsqueda y filtros.
- Manejo del DOM y eventos.
- Estado centralizado mediante una clase `CartStore`.
- Validaciones de datos.
- Cálculos puros y comprobables.
- Persistencia con `localStorage`.
- Navegación entre tienda y comprobante.
- Impresión del comprobante.
- Pruebas automáticas con Node.

## Recorrido recomendado

1. Abrir la aplicación publicada.
2. Buscar y filtrar productos.
3. Agregar productos y modificar cantidades.
4. Aplicar el cupón `ROBLEDO10`.
5. Cambiar entre recogida y domicilio.
6. Provocar y corregir errores de validación.
7. Generar el comprobante.
8. Recargar la página para comprobar la persistencia.
9. Revisar el código y relacionar cada comportamiento con HTML, CSS y JavaScript.
10. Ejecutar las pruebas desde una copia local.

## Ejecutar localmente

### Windows

1. Descarga o clona el repositorio.
2. Entra a la carpeta `robledo-market-lab`.
3. Haz doble clic en `start-server.bat`.
4. Abre `http://localhost:8000`.

### Terminal

```bash
python -m http.server 8000
```

Después abre:

```text
http://localhost:8000
```

## Ejecutar pruebas

Requiere Node.js 18 o superior:

```bash
npm test
```

## Estructura

```text
robledo-market-lab/
├── index.html
├── receipt.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── cart-store.js
│   ├── core.js
│   ├── products.js
│   ├── receipt.js
│   └── storage.js
├── tests/
│   └── core.test.js
├── docs/
│   ├── GUION_CLASE.md
│   ├── SOURCE_REVIEW.md
│   └── STUDENT_CHECKLIST.md
├── package.json
├── start-server.bat
└── start-server.sh
```

## Flujo de la aplicación

```text
Catálogo → agregar producto → actualizar estado → validar formulario
→ crear orden → guardar localmente → abrir comprobante → imprimir o reiniciar
```

## Nota pedagógica

La clase `CartStore` muestra una implementación orientada a objetos, pero los estudiantes pueden alcanzar los requisitos mínimos con funciones y objetos literales. La arquitectura y el flujo son obligatorios; la POO puede tratarse como nivel avanzado.
