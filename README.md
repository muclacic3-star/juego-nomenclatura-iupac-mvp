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
2. Colocar enlaces simples, dobles o triples, radicales lineales y, en la unidad de oxigenados, los grupos funcionales. Los oxigenados admiten un doble enlace para los enoles. La pieza **fenilo (C₆H₅)** sirve para los dos alcoholes aromáticos y el benzaldehído.
3. Inspeccionar una pieza colocada para moverla, reemplazarla o quitarla. **Deshacer** restaura las acciones completas, incluido el reinicio o el cambio de esqueleto.
4. Pulsar **Verificar**. Se acepta la misma molécula orientada al revés, con un anillo rotado o reflejado, o construida mediante otro recorrido válido de la cadena.

Los hidrógenos se calculan automáticamente teniendo en cuenta todos los grupos colocados. CHO y COOH transforman un carbono existente: **no agregan otro carbono**. Se admiten hasta tres OH en carbonos distintos, dos CHO terminales, dos carbonilos de cetona internos, o un CHO con un OH en otro carbono. El COOH conserva su alcance monofuncional. Para construir un enol se puede colocar primero OH o primero C=C; el OH debe quedar directamente sobre uno de los carbonos del doble enlace.

Una pieza fenilo incorpora sus seis carbonos al total molecular, sin aumentar la longitud del esqueleto elegido. Para **benzaldehído**, se elige una cadena de **un carbono**, se coloca CHO y se une un fenilo en C1: el resultado es C₆H₅–CHO, con siete carbonos totales. Las colocaciones que exceden la valencia o incumplen las restricciones se rechazan sin modificar la construcción.

La construcción y su historial se conservan durante la sesión; no se recuperan al recargar. Las preferencias y los resultados sí se guardan en `localStorage`.

## Alcance químico

| Unidad | Familias |
|---|---|
| **Hidrocarburos (Cap. 1–2)** | Alcanos, alquenos, dienos, alquinos, cicloalcanos y aromáticos básicos derivados del benceno. |
| **Compuestos oxigenados (Cap. 3)** | Alcoholes monohidroxilados, dioles, trioles, alcoholes aromáticos (dos ejemplos), aldehídos, cetonas, **aldehídos aromáticos, dialdehídos, dicetonas, enoles, hidroxi-aldehídos** y ácidos carboxílicos. |

| Elemento | Restricción |
|---|---|
| Cadena abierta | 1–15 carbonos en el esqueleto. |
| Radicales | Alquilo lineales: metil, etil, propil, butil y pentil. Fenilo para los dos alcoholes aromáticos y el benzaldehído. |
| Insaturaciones | En hidrocarburos, hasta dos dobles enlaces no adyacentes o un triple; no se mezclan dobles y triples. En oxigenados, un doble enlace para enoles; las demás categorías generadas son saturadas. |
| Anillos | Cicloalcanos de 3–6 carbonos o benceno; radicales lineales. |
| Grupos funcionales | Uno, dos o tres OH en carbonos distintos; uno o dos CHO terminales; uno o dos carbonilos de cetona internos; un CHO con un OH en otro carbono; o un único COOH. No se admiten otras mezclas. |

Los dioles y trioles generados son de cadena abierta, saturados y lineales, con dos y tres OH respectivamente. Se practica la numeración de todos los hidroxilos: por ejemplo, **1,2-etanodiol** y **1,2,3-propanotriol**. Los nombres modernos equivalentes, como `etano-1,2-diol` y `propano-1,2,3-triol`, y los nombres comunes documentados se muestran como referencias; el ejercicio conserva su nombre escolar principal. También se pueden consultar con **Ver solución después de acertar**, sin sumar otra jugada ni reiniciar la racha.

La familia de alcoholes aromáticos se limita a **fenilmetanol** y **2-feniletanol**, con el OH en la cadena lateral. El anillo se identifica como fenilo; no se incluyen fenoles, OH unidos directamente al anillo, varios fenilos ni polioles aromáticos. Esta familia utiliza esos dos ejemplos en las tres complejidades.

La ampliación del bloque de aldehídos y cetonas incorpora los ejemplos de las fuentes del curso:

| Categoría | Ejemplos de referencia | Variantes generadas |
|---|---|---|
| Aldehídos aromáticos | **Benzaldehído**, C₆H₅–CHO | Solo este ejemplo; el carbonilo está fuera del anillo. |
| Dialdehídos | **1,5-pentanodial**, OHC–CH₂–CH₂–CH₂–CHO | Cadenas lineales saturadas con dos CHO terminales. |
| Dicetonas | **2,4-pentanodiona**, CH₃–CO–CH₂–CO–CH₃ | Cadenas lineales saturadas con dos carbonilos internos distintos. |
| Enoles | **Etenol**, CH₂=CH–OH, y **prop-1-en-2-ol**, CH₂=C(OH)–CH₃ | Solo estos dos ejemplos, alternados. |
| Hidroxi-aldehídos | **3-hidroxibutanal**, OHC–CH₂–CH(OH)–CH₃ | Cadenas lineales saturadas con un CHO y un OH en otro carbono. |

En **Construir el nombre** se pueden seleccionar las terminaciones **–dial** y **–diona** con sus dos localizadores, **–en–ol** con localizadores de C=C y OH, y **hidroxi…al** para indicar el OH como prefijo: CHO fija C1 y la terminación. **Benzaldehído (base retenida)** se ofrece directamente. Los nombres escolares se conservan; las soluciones muestran equivalencias como `pentano-1,5-dial`, `pentano-2,4-diona` y `aldol`.

Los enoles se identifican por **C=C–OH**. Etanal/etenol y propanona/prop-1-en-2-ol tienen la misma fórmula molecular por pareja, pero su conectividad y sus enlaces son diferentes: el constructor exige la estructura solicitada. La selección del bloque es didáctica y no clasifica a los enoles como carbonilos.

La correspondencia entre categorías, fuentes y pruebas se detalla en [Verificación de aldehídos y cetonas](docs/carbonilos-verificacion.md). Cianhidrinas, paraldehído, alcanfor y actividades de propiedades o reacciones quedan para una ampliación posterior.

El motor calcula los nombres desde la estructura y filtra ejercicios ambiguos. Sigue las convenciones escolares utilizadas por el proyecto, como `2-butanol`, `2-pentanona` y `ácido etanoico`. El grupo funcional tiene prioridad en la numeración de los oxigenados. La corrección del constructor compara la conectividad completa y los enlaces, sin depender de la orientación ni de los números mostrados en pantalla.

Las representaciones desarrollada completa, molecular, global funcional y zigzag quedan para una etapa posterior.

## Dificultad y práctica personalizada

Los niveles son **Fácil (Wöhler)**, **Medio (Kekulé)** y **Difícil (Le Bel–Van't Hoff)**. En oxigenados, Fácil incorpora dioles; Medio suma trioles, los dos alcoholes aromáticos, benzaldehído, dialdehídos y dicetonas. Difícil conserva todas las categorías de Medio y añade enoles e hidroxi-aldehídos. Las familias anteriores continúan disponibles. El alcance de hidrocarburos se conserva.

**A tu medida** permite seleccionar las familias y una complejidad baja, media o alta, incluso en combinaciones que no ofrecen los niveles predeterminados. Se mantiene disponible en los dos sentidos de práctica. Los récords se separan por modo, unidad y nivel; los resultados anteriores de construir nombres se conservan.

Todas las categorías están disponibles individualmente en **A tu medida**, incluso con complejidad baja. Los rangos de las familias lineales son:

| Categoría | Baja | Media | Alta |
|---|---|---|---|
| Dioles y dialdehídos | 2–5 C | 3–8 C | 4–12 C |
| Trioles | 3–5 C | 3–8 C | 4–12 C |
| Dicetonas | 4–5 C | 5–8 C | 5–12 C |
| Hidroxi-aldehídos | 3–5 C | 3–8 C | 4–12 C |

Los catálogos aromáticos y enólicos mantienen sus ejemplos fijos en las tres complejidades. La primera aparición de cada nueva categoría en cada modo y sesión usa una referencia del curso. Después, dialdehídos, dicetonas e hidroxi-aldehídos eligen referencias con probabilidad **1/3** y variantes distintas con probabilidad **2/3**; una sesión corta no garantiza esa proporción exacta. Los enoles alternan sus dos ejemplos. Este seguimiento continúa al cambiar de nivel o volver al otro modo y se reinicia al recargar; no se guarda como preferencia.

Una selección guardada antes de esta ampliación conserva sus familias y deja las nuevas desactivadas. En una instalación nueva se ofrecen todas las familias. Las preferencias de los dos modos permanecen independientes.

## Ejecutar y comprobar

- **En línea:** abrir la [página del juego](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/).
- **Sin conexión:** descargar `index.html` y abrirlo con un navegador moderno. El archivo contiene HTML, estilos y JavaScript; no realiza descargas para jugar. Esta versión no incorpora todavía instalación PWA ni publicación en Google Play.
- **Pruebas automatizadas:** con Node.js instalado, ejecutar `node --test tests/formula.test.cjs tests/name-layout.test.cjs tests/alcohols.test.cjs tests/carbonyls.test.cjs` desde la carpeta del proyecto. No se necesitan paquetes adicionales.

Las **93 comprobaciones existentes** del motor y de la selección personalizada continúan ejecutándose al cargar la página. La batería externa contiene **122 pruebas**: conserva los casos anteriores y comprueba seis referencias del bloque carbonilo, **1.800 objetivos** de las tres categorías variables, nombres, composición, hidrógenos, orientaciones equivalentes, controles de ambos constructores, selección, alternativas de respaldo y progreso. También mantiene las pruebas de 1.200 polioles, alcoholes aromáticos, hidrocarburos, ácidos, preferencias, historial, puntuación única, navegación y foco. Las verificaciones automáticas no sustituyen la comprobación visual ni de gestos en dispositivos Android e iOS reales.

## Equipo

**Integrantes:** Carlos Martín, Alex Jehan, Benjamín Olivera, Valentino Navarro y Zaira Pereyra.

**Institución:** colegio san José · **Evento:** Exposición Anual.

Proyecto educativo sin fines de lucro.
