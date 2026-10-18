# NombraQuímica 🧪 — Juego de Nomenclatura IUPAC

**[Jugar en el navegador](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/)**

Juego educativo para practicar química orgánica en dos sentidos. Es un proyecto escolar para la Exposición Anual del colegio san José. Funciona en un único `index.html`, sin servidor ni dependencias externas.

## Dos formas de practicar

- **Construir el nombre:** el juego muestra una molécula y el estudiante arma su nombre mediante bloques de raíz, sufijo, radicales y localizadores.
- **Construir la fórmula:** el juego muestra un nombre y el estudiante construye su fórmula **semidesarrollada**, eligiendo un esqueleto y colocando enlaces, radicales y grupos funcionales.

Ambos modos utilizan los mismos generadores y convenciones de nomenclatura. Las pistas orientan sobre qué revisar sin revelar la respuesta. **Ver solución** permite consultar la respuesta y cuenta el ejercicio como una jugada sin acierto.

Cambiar de sentido conserva durante la sesión el ejercicio y la configuración propios de cada modo. Los aciertos, las jugadas y los récords se guardan por separado en el navegador. Una respuesta ya contabilizada no suma puntos nuevamente al editarla o deshacer.

## Construir el nombre con una molécula legible

La molécula ocupa primero todo el ancho disponible y el constructor del nombre aparece debajo. En pantallas de al menos **900 px**, los campos internos del constructor se distribuyen en dos columnas; en pantallas más pequeñas se apilan. La estructura objetivo conserva su tamaño y se puede recorrer horizontalmente cuando es larga, sin reducirla hasta volverla ilegible.

Las fórmulas usan letras de **24 px en pantallas pequeñas y 32 px en pantallas amplias**. Los controles del modo de nombres tienen un tamaño táctil mínimo de **48 × 48 px**. La opción **Ver molécula** permite regresar a la estructura mientras se construye el nombre.

**Unidad y dificultad** se presenta plegado, con la unidad y el nivel activos visibles en el resumen. Se puede desplegar para cambiar de tema, dificultad o selección personalizada. La navegación contiene únicamente **Construir el nombre** y **Construir la fórmula**; el prototipo Aprender y sus fichas de propiedades se retiraron de esta versión.

## Constructor para móvil

Se puede **arrastrar una pieza** o **tocarla y después tocar su destino**. Ambos métodos aplican las mismas reglas químicas. El lienzo permite desplazarse para trabajar con cadenas largas. Los controles admiten teclado y el navegador conserva su zoom.

1. Elegir una cadena abierta de 1–15 carbonos, un ciclo de 3–6 carbonos o un benceno.
2. Colocar enlaces simples, dobles o triples, radicales lineales y, en la unidad de oxigenados, el grupo funcional.
3. Inspeccionar una pieza colocada para moverla, reemplazarla o quitarla. **Deshacer** restaura las acciones completas, incluido el reinicio o el cambio de esqueleto.
4. Pulsar **Verificar**. Se acepta la misma molécula orientada al revés, con un anillo rotado o reflejado, o construida mediante otro recorrido válido de la cadena.

Los hidrógenos se calculan automáticamente. CHO y COOH transforman un carbono existente: **no agregan otro carbono**. Solo se admite un grupo funcional, conforme al alcance de los ejercicios. Las colocaciones que exceden la valencia o incumplen las restricciones se rechazan sin modificar la construcción.

La construcción y su historial se conservan durante la sesión; no se recuperan al recargar. Las preferencias y los resultados sí se guardan en `localStorage`.

## Alcance químico

| Unidad | Familias |
|---|---|
| **Hidrocarburos (Cap. 1–2)** | Alcanos, alquenos, dienos, alquinos, cicloalcanos y aromáticos básicos derivados del benceno. |
| **Compuestos oxigenados (Cap. 3)** | Alcoholes, aldehídos, cetonas y **ácidos carboxílicos**, saturados y de cadena abierta. |

| Elemento | Restricción |
|---|---|
| Cadena abierta | 1–15 carbonos en el esqueleto. |
| Radicales | Alquilo lineales: metil, etil, propil, butil y pentil. |
| Insaturaciones | Hasta dos dobles enlaces no adyacentes o un triple; no se mezclan dobles y triples. |
| Anillos | Cicloalcanos de 3–6 carbonos o benceno; radicales lineales. |
| Grupos funcionales | OH, CHO, carbonilo interno de cetona y COOH; uno por molécula. |

El motor calcula los nombres desde la estructura y filtra ejercicios ambiguos. Sigue las convenciones escolares utilizadas por el proyecto, como `2-butanol`, `2-pentanona` y `ácido etanoico`. El grupo funcional tiene prioridad en la numeración de los oxigenados. La corrección del constructor compara la conectividad completa y los enlaces, sin depender de la orientación ni de los números mostrados en pantalla.

Las representaciones desarrollada completa, molecular, global funcional y zigzag quedan para una etapa posterior.

## Dificultad y práctica personalizada

Los niveles **Fácil (Wöhler)**, **Medio (Kekulé)** y **Difícil (Le Bel–Van't Hoff)** conservan sus generadores originales. El alcance de cada nivel depende de la unidad elegida.

**A tu medida** permite seleccionar las familias y una complejidad baja, media o alta, incluso en combinaciones que no ofrecen los niveles predeterminados. Se mantiene disponible en los dos sentidos de práctica. Los récords se separan por modo, unidad y nivel; los resultados anteriores de construir nombres se conservan.

## Ejecutar y comprobar

- **En línea:** abrir la [página del juego](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/).
- **Sin conexión:** descargar `index.html` y abrirlo con un navegador moderno. El archivo contiene HTML, estilos y JavaScript; no realiza descargas para jugar. Esta versión no incorpora todavía instalación PWA ni publicación en Google Play.
- **Pruebas automatizadas:** con Node.js instalado, ejecutar `node --test tests/formula.test.cjs tests/name-layout.test.cjs` desde la carpeta del proyecto. No se necesitan paquetes adicionales.

Las **93 comprobaciones existentes** del motor y de la selección personalizada continúan ejecutándose al cargar la página. Las pruebas del constructor se ejecutan por separado, con aleatoriedad reproducible: cubren las diez familias y las tres complejidades, estructuras equivalentes, isómeros distintos, funciones y valencias, y acciones que no deben modificar una construcción inválida. Las pruebas de navegación comprueban el cambio entre los dos modos, la recuperación del foco y las preferencias guardadas, incluido el regreso al modo de nombres desde una antigua preferencia de Aprender. Las verificaciones automáticas no sustituyen la comprobación visual ni de gestos en dispositivos Android e iOS reales.

## Equipo

**Integrantes:** Carlos Martín, Alex Jehan, Benjamín Olivera, Valentino Navarro y Zaira Pereyra.

**Institución:** colegio san José · **Evento:** Exposición Anual.

Proyecto educativo sin fines de lucro.
