# Ray Cripto Diario (web)

Web de [@raycriptodiario](https://www.instagram.com/raycriptodiario/): noticias cripto explicadas fácil, sin hype.
Se publica en https://raygrilloia-rgb.github.io/raycriptodiario/ (GitHub Pages, carpeta `docs/`).

- `articulos/<slug>.md`: un artículo por archivo. El nombre del archivo es la URL; el formato está al principio de `generar.mjs`.
- `node generar.mjs`: regenera `docs/` entera (sin dependencias, Node 18+).
- `node servir.mjs`: la sirve en local en http://localhost:8080/raycriptodiario/ para revisarla.

La rutina en la nube de @raycriptodiario añade un artículo por cada publicación de Instagram, regenera la web y hace push.
