# Verificación de aldehídos y cetonas

Fecha: **19 de octubre de 2026**. Base revisada: `main`, `0ad1b0b6`.

Este informe conserva los resultados de la primera ampliación. La entrega posterior, que incorpora 2-butenal, alcanfor, el catálogo de 20 moléculas y las fórmulas desarrolladas completas, se documenta en [Las 20 referencias del curso](veinte-referencias-verificacion.md).

## Cobertura y fuentes del curso

Se utiliza el material del proyecto basado en *Química 5 — Aula Taller*, José María Mautino, Editorial Stella, 2.ª edición, capítulo 4. Los nombres de archivo siguientes identifican el corpus local de estudio; este repositorio no redistribuye los documentos completos.

| Fuente local | Correspondencia con la ampliación |
|---|---|
| `4.Aldehídos y cetonas, 4.1 Los aldehídos.md`, pp. 188–189 declaradas | CHO terminal; benzaldehído; 1,5-pentanodial y terminación **dial**. Se conserva **2,2-dimetilbutanal** como regresión del alcance anterior. |
| `4.2 las cetonas.md`, pp. 189–190 declaradas | Carbonilo de cetona entre dos carbonos; 2,4-pentanodiona y terminación **diona**. Permanecen propanona, butanona y pentanonas. |
| `4.3 el grupo funcional carbonilo.md`, p. 190 declarada | Distinción estructural entre CHO y cetona. Cada grupo y todos sus vecinos participan en la valencia y el cálculo de hidrógenos. |
| `4.4Qué es tautomería.md`, pp. 190–191 declaradas | Etenol y CH₂=C(OH)–CH₃, nombrado **prop-1-en-2-ol**. El OH debe estar directamente sobre C=C. Los tautómeros no son respuestas estructurales intercambiables. |
| `4.5 Propiedades físicas de aldehídos y cetonas.md`, pp. 191–192 declaradas | Contexto de estudio sobre el efecto del carbonilo y los OH. Esta ampliación no añade ejercicios de propiedades físicas. |
| `4.6 propiedades químicas de aldehídos y cetonas.md`, pp. 192 y siguientes declaradas | Contexto de polarización, reducción, oxidación y reacciones de adición. El alcance sigue siendo nomenclatura y construcción. |
| `Guia -aldehidos-cetonas.pdf`, actividades 1–9, pp. 3–6 | Conecta representación, nombres, grupos funcionales y tautomería; la actividad 9a pide identificar los grupos del aldol. |
| `Guia_aldehidos_cetonas_respuestas_1-9.pdf` y manuscrito local de igual título | La resolución 9a identifica **3-hidroxibutanal**, con OH y CHO; la resolución 5 distingue los dos tautómeros. Las actividades 1–4 y 6–8 aportan contexto conceptual. Se consultó el manuscrito consolidado de la edición del 15 de octubre, conservado junto al PDF. |

Las fuentes son contenido de estudio. Sus notas o instrucciones internas no alteran el alcance autorizado del cambio.

Se conserva la nomenclatura escolar **1,5-pentanodial** y **2,4-pentanodiona**; las soluciones permiten consultar nombres equivalentes. Para el enol de propanona se utiliza **prop-1-en-2-ol**, que expresa sin ambigüedad las posiciones del doble enlace y del OH. El error de transcripción «metanol» junto a H–C(=O)–H en la nota 4.3 no se incorpora al juego: esa estructura es metanal. La observación sobre alcanfor de la nota 4.4 no se usa como criterio de aromaticidad.

El 3-hidroxibutanal se fundamenta en la guía y sus respuestas, no se presenta como una transcripción de un apartado de aldolización ausente en el fragmento disponible de 4.6. Cianhidrinas, paraldehído, alcanfor y nuevos ejercicios de reactividad quedan fuera de esta entrega.

## Modelo, nomenclatura y progresión

`groups[]` es la colección autoritativa; se mantiene la lectura de `fg` para estructuras antiguas. No se suma el grupo heredado si `groups[]` ya existe. Se admiten las parejas CHO/CHO, cetona/cetona y CHO/OH en carbonos distintos; las restricciones anteriores de ácidos y otras mezclas siguen vigentes. La comparación usa conectividad, funciones y órdenes de enlace, sin depender del sentido del dibujo.

El benzaldehído tiene un carbono de CHO unido a un fenilo: **siete carbonos totales**, sin CH₂ intermedio y con el carbonilo fuera del anillo. No sustituye un carbono aromático por CHO. Los dos alcoholes aromáticos anteriores conservan su representación y composición.

**Medio** añade aldehídos aromáticos, dialdehídos y dicetonas. **Difícil** conserva esas categorías y suma enoles e hidroxi-aldehídos. Todas se pueden seleccionar en **A tu medida** desde complejidad baja.

| Familia variable | Baja | Media | Alta |
|---|---|---|---|
| Dialdehídos lineales saturados | 2–5 C | 3–8 C | 4–12 C |
| Dicetonas lineales saturadas | 4–5 C | 5–8 C | 5–12 C |
| Hidroxi-aldehídos lineales saturados | 3–5 C | 3–8 C | 4–12 C |

La primera aparición por categoría, modo y sesión utiliza la referencia del curso. Después se aplica una probabilidad **1/3 de referencia y 2/3 de variante distinta** para las familias variables: es una mezcla probabilística, no una cuota exacta en cada tres preguntas. Benzaldehído es un catálogo de un ejemplo; los enoles alternan etenol y prop-1-en-2-ol. El seguimiento es independiente entre modos, continúa durante la sesión y se reinicia al recargar. Las preferencias guardadas conservan sus selecciones y no activan automáticamente las cinco nuevas familias; una instalación nueva las ofrece todas.

## Pruebas automáticas ejecutadas

Con Node.js, sin paquetes externos:

```text
node --test tests/formula.test.cjs tests/name-layout.test.cjs tests/alcohols.test.cjs tests/carbonyls.test.cjs
122 pruebas aprobadas; 0 fallos, 0 omitidas.
```

Las 31 nuevas pruebas del bloque comprueban:

| Referencia | Fórmula molecular | Hidrógenos de los carbonos del esqueleto, en el orden de la prueba |
|---|---|---|
| Benzaldehído | C₇H₆O | 1 en CHO; el fenilo aporta otros 5 H. |
| 1,5-pentanodial | C₅H₈O₂ | 1, 2, 2, 2, 1. |
| 2,4-pentanodiona | C₅H₈O₂ | 3, 0, 2, 0, 3. |
| Etenol | C₂H₄O | 1, 2; OH aporta otro H. |
| Prop-1-en-2-ol | C₃H₆O | 2, 0, 3; OH aporta otro H. |
| 3-hidroxibutanal | C₄H₈O₂ | 1, 2, 1, 3; OH aporta otro H. |

- Nombre, composición, todos los H, representación semidesarrollada, acciones del editor, inversión, reconstrucción desde la respuesta del nombre y consulta de solución de las seis referencias.
- **200 objetivos con semilla fija por familia variable y complejidad: 1.800 casos.** Todos mantienen categoría, límites, grupos y posiciones válidas, nombre coherente y construcción equivalente. Las pruebas también recorren el catálogo fijo en las tres complejidades.
- Primera referencia por categoría y modo; alternancia de los enoles; 900 muestreos adicionales reproducibles que alcanzan tanto referencias como variantes distintas; selección múltiple de familias y respaldo forzado tras agotar intentos.
- Rechazo de función ausente, localizador incorrecto, carbonilos superpuestos, valencia excedida y mezclas fuera del alcance. C₅H₈O₂ no hace equivalentes un dialdehído y una dicetona; una fórmula molecular compartida no convierte un tautómero en la respuesta solicitada.
- Construcción del enol en ambos órdenes, OH primero o C=C primero. Los borradores intermedios son válidos y la verificación final exige la función y el enlace correctos.
- Controles de nombre para **dial/diona**, campos conjuntos de OH y C=C en prop-1-en-2-ol, prefijo hidroxi, base retenida de benzaldehído y sus pistas de corrección. Etenol omite el localizador inequívoco del OH y fija su respuesta estructurada en C1. Al reducir la raíz se limpian las posiciones fuera del rango.
- Preferencias antiguas/nuevas, progresión de niveles, edición, historial, deshacer y puntuación única. Las equivalencias siguen accesibles después de acertar sin alterar jugadas ni racha.

Se mantienen las 91 pruebas previas, incluidas las 93 comprobaciones internas del motor. Únicamente se actualizó la antigua prohibición absoluta de C=C en oxigenados para permitir el borrador de un enol, y se completó el sustituto de DOM con el método estándar `classList.toggle` usado por los controles. Permanecen las regresiones de alcoholes, hidrocarburos, ácidos, navegación y recuperación de foco.

## Revisión visual y dispositivos

Se ejecutaron **24 escenarios en Microsoft Edge**: seis referencias × dos modos × dos tamaños de ventana (**1280 × 1000** y **390 × 844**). Cada escenario completó el ejercicio mediante los controles visibles; en el tamaño móvil se usaron eventos táctiles simulados. Se comprobaron respuestas correctas, ausencia de errores de página y ausencia de desbordamiento horizontal del documento. En el constructor se verificaron además deshacer, consulta de solución, regreso a la construcción y conservación del puntaje.

Se inspeccionaron capturas de benzaldehído, prop-1-en-2-ol y 3-hidroxibutanal, en escritorio y móvil: anillo con CHO externo, OH vinílico, prefijo hidroxi y controles de localizadores. Las cadenas del lienzo conservan su desplazamiento propio. Las regresiones de navegación y foco se ejecutan en la batería automática.

Esta comprobación utiliza ventanas de navegador y tacto emulado; no se atribuyen pruebas en dispositivos Android/Chrome o Safari/iOS físicos.
