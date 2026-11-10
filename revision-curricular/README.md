# NEXO · Revisión curricular

Página publicada: https://juanperez238421-cpu.github.io/revision-curricular/

Historia de usuario 1: carga PDF con texto, DOCX y TXT; comparación de malla y planeación; criterios por período; semáforo con evidencia; informe editable; exportación HTML/JSON/TXT e impresión PDF; historial local y guardado opcional en Supabase; revisión pedagógica opcional con Claude mediante la API del usuario; exportación de contexto para Codex/Ollama.

## Distinción entre motores

El motor documental normaliza palabras y calcula correspondencia entre líneas. Es explicable, pero no comprende por sí solo la coherencia pedagógica. La puntuación usa 75% correspondencia de referentes y 25% correspondencia de categorías estructurales explícitas. Verde >=67, amarillo >=34, rojo <34. Selecciona los criterios del mismo grado, área y período. Ningún resultado es una calificación definitiva.

La opción Claude requiere clave de API y un ID de modelo disponible. El botón envía ambos documentos directamente a Anthropic; puede generar cargos de API. La clave no se guarda y se vacía tras la solicitud. La respuesta se incorpora como retroalimentación editable; no modifica los porcentajes del análisis documental. Esta integración no ha sido validada con una clave real del usuario. Claude Chat, Codex y Ollama también pueden recibir el contexto exportado; exportar no es una conexión automática con estos dos últimos.

## Datos y privacidad

Los textos se extraen en el navegador. Los hallazgos y el texto del informe se transmiten solo al pulsar Guardar en Supabase. Los textos completos de la malla y la planeación no se guardan en ese historial. Una clave aleatoria de 256 bits identifica el espacio por posesión; el servidor almacena únicamente su hash SHA-256 y filtra todas las operaciones por ese hash. Exporta la clave para recuperar el historial en otro dispositivo, sin publicarla ni enviarla a docentes. No es autenticación institucional por roles. La tabla tiene RLS y no permite lectura directa por anon o authenticated; solo la Edge Function accede con la credencial de servidor.

No hay envío automático de correo ni funcionamiento offline garantizado. Los PDF escaneados requieren OCR previo. Límite por archivo: 8 MB, 150 páginas PDF y 200.000 caracteres de texto. Los lectores PDF y DOCX se obtienen de CDN y necesitan internet.

## Backend

`supabase/nexo-reviews/index.ts` corresponde a la Edge Function en el proyecto Supabase conectado. Las claves administrativas existen únicamente en el entorno de Supabase. Tabla: `public.nexo_academic_reviews_v1`. Este código no modifica las aplicaciones académicas existentes.

## Verificar

Abrir la página; cargar el ejemplo; analizar; editar retroalimentación; descargar el informe; Guardar en Supabase; Cargar revisiones; Abrir. Para evaluar una versión corregida, conservar los mismos criterios y guardar cada informe con una versión diferente en el campo Docente o versión de entrega.

Antes de afirmar ahorro real de tiempo se requiere un piloto con asesores y documentos institucionales.
