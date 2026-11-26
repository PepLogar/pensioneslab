# Pensiones Lab

Simulador de las pensiones de España y de las cuentas del Estado, de 2026 a 2070. Compara el reparto, las cuentas nocionales, la capitalización y sus mezclas, y dice si cada sistema se sostiene en el tiempo.

- **Web:** <https://demarquia.org/pensioneslab/>
- **Proyecto:** Pensiones Lab · Demarquía Planetaria · Cabeza Propia.
- **Desarrollo:** Pep Logar AI Solutions · <https://aisolutions.peplogar.com/>
- **Fallos y mejoras:** info@aisolutions.peplogar.com

Es una simulación con supuestos y una calibración agregada. No es una previsión oficial, ni un derecho legal, ni un ranking validado.

## Arranque

```
npm install
npm run dev      # http://127.0.0.1:5180/
npm test         # unos 3 minutos
```

Necesita Node 20 o posterior. Las páginas no funcionan abiertas desde el disco: necesitan el servidor.

Lo demás, en [docs/README.md](docs/README.md). Las decisiones y sus motivos, en [docs/DECISIONES.md](docs/DECISIONES.md). El modelo, en [docs/modelo](docs/modelo).

## Fuentes

Los datos de partida vienen de organismos públicos y estudios. Cada módulo de `data/` cita su fuente, y la página Metodología las lista todas.

Las copias de esos documentos no están en el repositorio, porque son de sus autores. [data/sources/README.md](data/sources/README.md) dice de dónde descargar cada una y da su huella SHA-256 para comprobarla. El simulador y las pruebas funcionan sin ellas. Solo `scripts/contrast-external.mjs`, que regenera el contraste con otras instituciones, necesita algunas de ellas.

## Licencias

- **Código:** GNU AGPL-3.0 o posterior.
- **Textos, gráficos y resultados:** CC BY 4.0.

Los detalles, incluido el crédito que debe conservar toda versión, están en [LICENSE.md](LICENSE.md).
