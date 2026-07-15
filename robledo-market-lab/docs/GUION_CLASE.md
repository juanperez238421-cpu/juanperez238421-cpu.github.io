# Guion de clase - De ejercicio aislado a aplicación web completa

## Objetivo

Al finalizar, cada estudiante identificará y aplicará el flujo:

**Entrada → validación → procesamiento → estado → renderizado → persistencia → salida.**

## Inicio sugerido

> Hoy no vamos a crear otro ejercicio. Vamos a observar cómo se ve una entrega final y después cada estudiante llevará su proyecto actual hacia esa estructura.

## Demostración de 12 minutos

1. Abrir `http://localhost:8000`.
2. Mostrar que el catálogo se genera desde JavaScript.
3. Buscar un producto y filtrar por categoría.
4. Agregar productos y cambiar cantidades.
5. Aplicar el cupón `ROBLEDO10`.
6. Cambiar de recogida a domicilio.
7. Enviar el formulario vacío para provocar validaciones.
8. Completar los datos correctamente.
9. Generar el comprobante.
10. Recargar la página para evidenciar `localStorage`.
11. Imprimir o guardar el recibo en PDF.
12. Ejecutar `npm test` y explicar por qué las funciones puras se pueden probar.

## Temas teóricos

1. Responsabilidades de HTML, CSS y JavaScript.
2. DOM y selección de elementos.
3. Eventos y delegación de eventos.
4. Funciones de una sola responsabilidad.
5. Arreglos y objetos.
6. Estado de la aplicación.
7. Renderizado dinámico.
8. Validación antes de modificar estado.
9. Persistencia en `localStorage`.
10. POO como capa avanzada: clase `CartStore`.
11. Pruebas de funciones puras.

## Preguntas para los estudiantes

- ¿Qué información entra a tu aplicación?
- ¿Qué debe validar?
- ¿Qué estado cambia?
- ¿Qué resultado debe mostrar?
- ¿Qué información debe permanecer después de recargar?
- ¿Cómo se reinicia la aplicación?

## Producto mínimo de la clase

Cada estudiante debe terminar al menos:

- estructura HTML visible;
- un evento conectado;
- una validación;
- una función de procesamiento;
- un resultado renderizado en la página;
- un commit descriptivo.
