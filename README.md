# NombraQuímica 🧪 — Juego de Nomenclatura IUPAC

**▶️ [Jugar ahora en el navegador](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/)**

Videojuego web educativo en 2D, estilo rompecabezas interactivo, para practicar la **nomenclatura IUPAC de química orgánica** (hidrocarburos). Es un **proyecto escolar** desarrollado para la **Exposición Anual** del colegio san José.

## ¿Qué es?

El juego genera aleatoriamente una molécula válida y muestra su **fórmula semidesarrollada** (o su estructura de anillo dibujada). El jugador debe **construir el nombre IUPAC correcto por bloques** — sin escribir libremente, para evitar errores de tipeo — eligiendo:

1. El **tipo de estructura** (cadena abierta, cicloalcano o aromático)
2. Los **radicales** (ramificaciones) con sus localizadores
3. La **raíz** de la cadena principal (met, et, prop… hasta pentadec)
4. El **sufijo** según el tipo de enlace (-ano, -eno, -ino, -dieno)
5. Los **localizadores del enlace múltiple** cuando corresponde

Al pulsar **Verificar**, si hay un error el juego **no revela la respuesta**: da una **pista socrática** que orienta hacia la regla que se está aplicando mal (Método Feynman: aprender razonando, no memorizando).

## Alcance químico

| Regla | Detalle |
|---|---|
| **Familias** | Alcanos, alquenos (incluye dienos), alquinos, cicloalcanos (ciclopropano a ciclohexano) y aromáticos básicos (benceno y derivados) |
| **Cadena principal** | De 1 a 15 carbonos (metano → pentadecano) |
| **Radicales** | Solo alquilo **lineales**: metil, etil, propil, butil, pentil |
| **Multiplicidad** | Dienos permitidos (dos dobles enlaces); **nunca** se mezclan enlaces dobles y triples en la misma molécula |

### Reglas IUPAC que aplica el motor de validación

- **Prioridad de numeración:** el enlace múltiple siempre recibe el localizador más bajo, por encima de los radicales. En alcanos, se numera desde el extremo más cercano a la primera ramificación (regla del primer punto de diferencia).
- **Orden alfabético:** los radicales se ordenan alfabéticamente **ignorando** los prefijos multiplicadores (*di-*, *tri-*, *tetra-*). Ejemplo: *etil* va antes que *dimetil* (se alfabetiza por «metil»).
- **Anillos:** numeración que da el conjunto de localizadores más bajo; en anillos monosustituidos el localizador se omite.

El nombre correcto se **calcula algorítmicamente** desde el grafo molecular (no hay respuestas memorizadas), y cada molécula generada pasa un filtro anti-ambigüedad: solo se aceptan ejercicios con una única respuesta correcta.

## ¿Cómo ayuda a practicar?

- **Práctica infinita:** el generador crea moléculas nuevas cada vez, dentro del alcance del curso.
- **Feedback formativo:** las pistas señalan *qué regla* revisar (sufijo, numeración, radicales…), no la solución.
- **Marcador de aciertos y racha** para motivar la repetición espaciada.
- **Botón "Ver solución"** con explicación razonada, para cuando el estudiante decide rendirse.
- **Recordatorio de reglas** integrado (sección plegable) para consultar sin salir del juego.

## Cómo ejecutarlo

- **Online:** entra a la [página del juego](https://muclacic3-star.github.io/juego-nomenclatura-iupac-mvp/).
- **Local:** descarga `index.html` y ábrelo con doble clic en cualquier navegador moderno. Es un único archivo autocontenido (HTML + CSS + JavaScript), sin dependencias externas y funciona sin internet.

## Equipo

**Integrantes:** Carlos Martín, Alex Jehan, Benjamín Olivera, Valentino Navarro, Zaira Pereyra.
**Institución:** colegio san José · **Evento:** Exposición Anual.

---

*Proyecto educativo sin fines de lucro. El motor de nomenclatura incluye una batería de auto-tests (19 casos) que se ejecuta al cargar la página; el resultado se muestra al pie.*
