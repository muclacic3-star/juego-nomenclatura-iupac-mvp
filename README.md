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
2. Colocar enlaces simples, dobles o triples, radicales lineales y, en la unidad de oxigenados, los grupos funcionales. Para los dos alcoholes aromáticos también está disponible la pieza **fenilo (C₆H₅)**.
3. Inspeccionar una pieza colocada para moverla, reemplazarla o quitarla. **Deshacer** restaura las acciones completas, incluido el reinicio o el cambio de esqueleto.
4. Pulsar **Verificar**. Se acepta la misma molécula orientada al revés, con un anillo rotado o reflejado, o construida mediante otro recorrido válido de la cadena.

Los hidrógenos se calculan automáticamente. CHO y COOH transforman un carbono existente: **no agregan otro carbono**. Se pueden colocar hasta tres OH en carbonos distintos; CHO, cetona y COOH siguen siendo funciones únicas y no se mezclan con OH. Una pieza fenilo incorpora sus seis carbonos al total molecular, sin aumentar la longitud del esqueleto elegido. Las colocaciones que exceden la valencia o incumplen las restricciones se rechazan sin modificar la construcción.

La construcción y su historial se conservan durante la sesión; no se recuperan al recargar. Las preferencias y los resultados sí se guardan en `localStorage`.

## Alcance químico

| Unidad | Familias |
|---|---|
| **Hidrocarburos (Cap. 1–2)** | Alcanos, alquenos, dienos, alquinos, cicloalcanos y aromáticos básicos derivados del benceno. |
| **Compuestos oxigenados (Cap. 3)** | **Alcoholes monohidroxilados, Dioles, Trioles y Alcoholes aromáticos** (dos ejemplos), además de aldehídos, cetonas y ácidos carboxílicos. |

| Elemento | Restricción |
|---|---|
| Cadena abierta | 1–15 carbonos en el esqueleto. |
| Radicales | Alquilo lineales: metil, etil, propil, butil y pentil. Fenilo para los dos alcoholes aromáticos admitidos. |
| Insaturaciones | Hasta dos dobles enlaces no adyacentes o un triple; no se mezclan dobles y triples. |
| Anillos | Cicloalcanos de 3–6 carbonos o benceno; radicales lineales. |
| Grupos funcionales | Uno, dos o tres OH en carbonos distintos; o una única función CHO, cetona o COOH. No se mezclan funciones. |

Los dioles y trioles generados son de cadena abierta, saturados y lineales, con dos y tres OH respectivamente. Se practica la numeración de todos los hidroxilos: por ejemplo, **1,2-etanodiol** y **1,2,3-propanotriol**. Los nombres modernos equivalentes, como `etano-1,2-diol` y `propano-1,2,3-triol`, y los nombres comunes documentados se muestran como referencias; el ejercicio conserva su nombre escolar principal. También se pueden consultar con **Ver solución después de acertar**, sin sumar otra jugada ni reiniciar la racha.

La familia de alcoholes aromáticos se limita a **fenilmetanol** y **2-feniletanol**, con el OH en la cadena lateral. El anillo se identifica como fenilo; no se incluyen fenoles, OH unidos directamente al anillo, varios fenilos ni polioles aromáticos. Esta familia utiliza esos dos ejemplos en las tres complejidades.

El motor calcula los nombres desde la estructura y filtra ejercicios ambiguos. Sigue las convenciones escolares utilizadas por el proyecto, como `2-butanol`, `2-pentanona` y `ácido etanoico`. El grupo funcional tiene prioridad en la numeración de los oxigenados. La corrección del constructor compara la conectividad completa y los enlaces, sin depender de la orientación ni de los números mostrados en pantalla.

Las representaciones desarrollada completa, molecular, global funcional y zigzag quedan para una etapa posterior.

## Dificultad y práctica personalizada

Los niveles son **Fácil (Wöhler)**, **Medio (Kekulé)** y **Difícil (Le Bel–Van't Hoff)**. En oxigenados, Fácil incorpora dioles; Medio y Difícil incorporan además trioles y los dos alcoholes aromáticos. Las familias anteriores continúan disponibles. El alcance de hidrocarburos se conserva.

**A tu medida** permite seleccionar las familias y una complejidad baja, media o alta, incluso en combinaciones que no ofrecen los niveles predeterminados. Se mantiene disponible en los dos sentidos de práctica. Los récords se separan por modo, unidad y nivel; los resultados anteriores de construir nombres se conservan.

En la selección personalizada, los dioles usan cadenas de **2–5 / 3–8 / 4–12 carbonos** para complejidad baja/media/alta; los trioles, **3–5 / 3–8 / 4–12**. Una selección guardada antes de esta ampliación conserva sus familias y deja las nuevas desactivadas. En una instalación nueva se ofrecen todas las familias. Las preferencias de los dos modos permanecen independientes.

## Ejecutar y comprobar

- **En línea:** abrir la [página del juego](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/).
- **Sin conexión:** descargar `index.html` y abrirlo con un navegador moderno. El archivo contiene HTML, estilos y JavaScript; no realiza descargas para jugar. Esta versión no incorpora todavía instalación PWA ni publicación en Google Play.
- **Pruebas automatizadas:** con Node.js instalado, ejecutar `node --test tests/formula.test.cjs tests/name-layout.test.cjs tests/alcohols.test.cjs` desde la carpeta del proyecto. No se necesitan paquetes adicionales.

Las **93 comprobaciones existentes** del motor y de la selección personalizada continúan ejecutándose al cargar la página. Las 61 pruebas anteriores se conservan. La nueva batería de alcoholes comprueba nombres y fórmulas de referencia, 1.200 objetivos de dioles y trioles con aleatoriedad reproducible, ambos alcoholes aromáticos, representaciones equivalentes, valencia, edición, progreso y compatibilidad de preferencias. Las pruebas de navegación comprueban el cambio entre los dos modos y la recuperación del foco. Las verificaciones automáticas no sustituyen la comprobación visual ni de gestos en dispositivos Android e iOS reales.

## Equipo

**Integrantes:** Carlos Martín, Alex Jehan, Benjamín Olivera, Valentino Navarro y Zaira Pereyra.

**Institución:** colegio san José · **Evento:** Exposición Anual.

Proyecto educativo sin fines de lucro.
