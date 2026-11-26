# Pensiones Lab 3

- Motor y consola de pensiones_lab_2 (1.64.0, commit 5643450), sin el resto del sitio. No traer más páginas ni herramientas del sitio.
- Objetivo: comparar reparto, cuentas nocionales, capitalización y combinaciones, junto con los ingresos del Estado.
- La calibración española es agregada y experimental: distinguir observaciones, reconstrucciones y supuestos; no presentar resultados como previsiones oficiales, derechos legales ni un ranking validado. Versionar el conjunto de datos y el estado guardado al cambiar la base.
- Mantener separados derechos nocionales, activos invertidos, financiación pública y prestaciones anteriores a la reforma.
- Una aportación no puede financiar simultáneamente reparto y capitalización.
- Una sola herramienta de trabajo, de escritorio, densa y funcional. Sin concesiones a móvil ni a vistosidad.
- Un cambio del motor cambia a propósito tests/fixtures/engine-reference-1.64.0.json y dice por qué en docs/DECISIONES.md.
- Documentar decisiones y cambios en docs/. Pruebas mínimas: identidades contables, transiciones, mezclas y conservación de escenarios. Evitar repetir baterías sin un fallo o cambio que lo justifique.
