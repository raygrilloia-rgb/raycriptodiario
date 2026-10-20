// Genera la web estática de @raycriptodiario en docs/ (GitHub Pages sirve esa carpeta) a partir de articulos/*.md.
// Uso: node generar.mjs        (sin dependencias: solo Node 18+)
// Los enlaces internos son relativos, así funciona en GitHub Pages (/raycriptodiario/) y abriendo los archivos en local.
//
// Formato de cada artículo (articulos/<slug>.md, el nombre del archivo es la URL):
// ---
// titulo: Título para Google (50-65 caracteres, con la palabra clave al principio)
// descripcion: Metadescripción de 140-160 caracteres
// fecha: 2026-10-20T21:10:00Z
// actualizado: (opcional) fecha ISO
// categoria: Noticias | Aprende | Protégete | Mercado
// etiquetas: bitcoin, etf, blackrock
// imagen: URL pública de la ilustración (banco de Flow)
// imagen_alt: descripción de la imagen
// instagram: permalink del carrusel (opcional)
// reel: permalink del reel (opcional)
// ---
// Cuerpo en Markdown sencillo: ## y ### títulos, párrafos, listas con - o 1., **negrita**, *cursiva*, [enlaces](url) y > citas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(RAIZ, 'docs');
const SITE = 'https://raygrilloia-rgb.github.io/raycriptodiario/';
const NOMBRE = 'Ray Cripto Diario';
const LEMA = 'Noticias cripto explicadas fácil, sin hype';
const INSTAGRAM = 'https://www.instagram.com/raycriptodiario/';
const OG_DEFECTO = 'https://raw.githubusercontent.com/raygrilloia-rgb/raycriptodiario-media/main/banco/bitcoin/bitcoin-monumento.jpg';
const CATEGORIAS = {
  'Noticias': 'Lo que pasa en cripto, explicado con contexto y sin alarmismo.',
  'Aprende': 'Guías para entender cripto desde cero: conceptos claros, con ejemplos.',
  'Protégete': 'Cómo detectar estafas y proteger tus criptos y tus cuentas.',
  'Mercado': 'Qué mueve el precio y qué significa para ti, sin predicciones.',
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = iso => { const d = new Date(iso); return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };

function escribe(rel, txt) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, txt);
}

// ---------- Markdown sencillo ----------
function enLinea(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
      const ext = /^https?:/.test(url) && !url.startsWith(SITE);
      return `<a href="${url}"${ext ? ' rel="noopener" target="_blank"' : ''}>${txt}</a>`;
    });
}

function markdown(md) {
  const out = [], lineas = md.replace(/\r/g, '').split('\n');
  let parrafo = [], lista = null, cita = [];
  const cierra = () => {
    if (parrafo.length) { out.push(`<p>${enLinea(parrafo.join(' '))}</p>`); parrafo = []; }
    if (lista) { out.push(`<${lista.tipo}>${lista.items.map(i => `<li>${enLinea(i)}</li>`).join('')}</${lista.tipo}>`); lista = null; }
    if (cita.length) { out.push(`<blockquote>${markdown(cita.join('\n'))}</blockquote>`); cita = []; }
  };
  const indice = [];
  for (const l of lineas) {
    let m;
    if (!l.trim()) { cierra(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)/))) {
      cierra();
      const nivel = m[1].length, id = slugify(m[2]);
      if (nivel === 2) indice.push({ id, txt: m[2] });
      out.push(`<h${nivel} id="${id}">${enLinea(m[2])}</h${nivel}>`);
    } else if ((m = l.match(/^>\s?(.*)/))) {
      if (parrafo.length || lista) { const c = cita; cita = []; cierra(); cita = c; }
      cita.push(m[1]);
    } else if ((m = l.match(/^\s*[-*]\s+(.*)/)) || (m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
      const tipo = /^\s*\d/.test(l) ? 'ol' : 'ul';
      if (parrafo.length || cita.length || (lista && lista.tipo !== tipo)) cierra();
      if (!lista) lista = { tipo, items: [] };
      lista.items.push(m[1]);
    } else {
      if (lista || cita.length) cierra();
      parrafo.push(l.trim());
    }
  }
  cierra();
  markdown.indice = indice;
  return out.join('\n');
}

function leeArticulo(archivo) {
  const txt = fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${archivo}: falta la cabecera --- ... ---`);
  const a = {};
  for (const l of m[1].split(/\r?\n/)) {
    const i = l.indexOf(':');
    if (i > 0) a[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  for (const k of ['titulo', 'descripcion', 'fecha', 'categoria']) if (!a[k]) throw new Error(`${archivo}: falta "${k}"`);
  if (!CATEGORIAS[a.categoria]) throw new Error(`${archivo}: categoría "${a.categoria}" no válida (${Object.keys(CATEGORIAS).join(', ')})`);
  a.slug = path.basename(archivo, '.md');
  a.cuerpoHtml = markdown(m[2]);
  a.indice = markdown.indice;
  a.palabras = m[2].split(/\s+/).filter(Boolean).length;
  a.etiquetas = (a.etiquetas || '').split(',').map(s => s.trim()).filter(Boolean);
  a.url = `${SITE}articulos/${a.slug}/`;
  return a;
}

// ---------- plantilla común ----------
function pagina({ titulo, descripcion, base, cuerpo, canonical, imagen, tipo = 'website', jsonld = [], extraHead = '' }) {
  const tituloCompleto = titulo.includes(NOMBRE) ? titulo : `${titulo} | ${NOMBRE}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="${NOMBRE}">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(imagen || OG_DEFECTO)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A1222">
${extraHead}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<link rel="icon" href="${base}assets/icono.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${NOMBRE}" href="${SITE}feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/estilo.css">
</head>
<body>
<header class="cab">
  <a class="marca" href="${base}"><span class="logo">₿</span>${NOMBRE}</a>
  <nav>${Object.keys(CATEGORIAS).map(c => `<a href="${base}categoria/${slugify(c)}/">${c}</a>`).join('')}</nav>
</header>
<main>
${cuerpo}
</main>
<footer class="pie">
  <p><strong>${NOMBRE}</strong> · ${LEMA}. Síguenos en <a href="${INSTAGRAM}" rel="noopener" target="_blank">Instagram @raycriptodiario</a>.</p>
  <p class="aviso">Contenido educativo. Nada de lo que publicamos es consejo financiero: investiga siempre por tu cuenta (DYOR).</p>
  <p><a href="${base}sobre/">Sobre Ray</a> · <a href="${base}aviso-legal/">Aviso legal</a> · <a href="${SITE}feed.xml">RSS</a></p>
</footer>
</body>
</html>
`;
}

const ORG = { '@type': 'Organization', name: NOMBRE, url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}assets/icono.svg` }, sameAs: [INSTAGRAM] };
const AUTOR = { '@type': 'Person', name: 'Ray', url: `${SITE}sobre/`, sameAs: [INSTAGRAM] };

function tarjeta(a, base, lazy = true) {
  return `<article class="tarjeta">
  <a href="${base}articulos/${a.slug}/">
    ${a.imagen ? `<img src="${esc(a.imagen)}" alt="${esc(a.imagen_alt || a.titulo)}"${lazy ? ' loading="lazy"' : ''} width="600" height="338">` : ''}
    <div class="txt">
      <span class="cat">${esc(a.categoria)}</span>
      <h3>${esc(a.titulo)}</h3>
      <p>${esc(a.descripcion)}</p>
      <time datetime="${a.fecha}">${fechaLarga(a.fecha)}</time>
    </div>
  </a>
</article>`;
}

function paginaArticulo(a, todos) {
  const base = '../../';
  const relacionados = todos.filter(o => o.slug !== a.slug && (o.categoria === a.categoria || o.etiquetas.some(e => a.etiquetas.includes(e)))).slice(0, 3);
  const minutos = Math.max(1, Math.round(a.palabras / 200));
  const catUrl = `${SITE}categoria/${slugify(a.categoria)}/`;
  const jsonld = [{
    '@context': 'https://schema.org', '@type': a.categoria === 'Noticias' || a.categoria === 'Mercado' ? 'NewsArticle' : 'Article',
    headline: a.titulo, description: a.descripcion, image: [a.imagen || OG_DEFECTO],
    datePublished: a.fecha, dateModified: a.actualizado || a.fecha, inLanguage: 'es',
    author: AUTOR, publisher: ORG, mainEntityOfPage: a.url, keywords: a.etiquetas.join(', '), articleSection: a.categoria,
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
      { '@type': 'ListItem', position: 2, name: a.categoria, item: catUrl },
      { '@type': 'ListItem', position: 3, name: a.titulo, item: a.url },
    ],
  }];
  const ig = [a.instagram && `<a class="boton" href="${esc(a.instagram)}" rel="noopener" target="_blank">Ver el carrusel en Instagram</a>`,
    a.reel && `<a class="boton sec" href="${esc(a.reel)}" rel="noopener" target="_blank">Ver el reel (30 s)</a>`].filter(Boolean).join('');
  const cuerpo = `<article class="articulo">
  <nav class="migas"><a href="${base}">Inicio</a> › <a href="${base}categoria/${slugify(a.categoria)}/">${esc(a.categoria)}</a></nav>
  <span class="cat">${esc(a.categoria)}</span>
  <h1>${esc(a.titulo)}</h1>
  <p class="entradilla">${esc(a.descripcion)}</p>
  <p class="meta">Por <a href="${base}sobre/">Ray</a> · <time datetime="${a.fecha}">${fechaLarga(a.fecha)}</time>${a.actualizado ? ` · actualizado el <time datetime="${a.actualizado}">${fechaLarga(a.actualizado)}</time>` : ''} · ${minutos} min de lectura</p>
  ${a.imagen ? `<img class="portada" src="${esc(a.imagen)}" alt="${esc(a.imagen_alt || a.titulo)}" width="1200" height="675">` : ''}
  ${a.indice.length >= 3 ? `<nav class="indice"><strong>En este artículo</strong><ol>${a.indice.map(i => `<li><a href="#${i.id}">${esc(i.txt)}</a></li>`).join('')}</ol></nav>` : ''}
  <div class="cuerpo">
${a.cuerpoHtml}
  </div>
  <aside class="aviso-art">Esto es contenido educativo, no consejo financiero. Investiga siempre por tu cuenta (DYOR) y no inviertas lo que no puedas permitirte perder.</aside>
  <aside class="cta">
    <h2>Cada día, lo importante de cripto en 1 minuto</h2>
    <p>Sigue a <strong>@raycriptodiario</strong> en Instagram: noticias explicadas fácil, seguridad y conceptos sin hype.</p>
    <div class="botones"><a class="boton" href="${INSTAGRAM}" rel="noopener" target="_blank">Seguir en Instagram</a>${ig}</div>
  </aside>
  ${a.etiquetas.length ? `<p class="etiquetas">${a.etiquetas.map(e => `<span>#${esc(e)}</span>`).join(' ')}</p>` : ''}
</article>
${relacionados.length ? `<section class="relacionados"><h2>Sigue leyendo</h2><div class="rejilla">${relacionados.map(r => tarjeta(r, base)).join('\n')}</div></section>` : ''}`;
  return pagina({ titulo: a.titulo, descripcion: a.descripcion, base, cuerpo, canonical: a.url, imagen: a.imagen, tipo: 'article', jsonld,
    extraHead: `<meta property="article:published_time" content="${a.fecha}">\n<meta property="article:modified_time" content="${a.actualizado || a.fecha}">\n<meta property="article:section" content="${esc(a.categoria)}">` });
}

// ---------- construir ----------
const dirArt = path.join(RAIZ, 'articulos');
const articulos = fs.existsSync(dirArt)
  ? fs.readdirSync(dirArt).filter(f => f.endsWith('.md')).map(f => leeArticulo(path.join(dirArt, f)))
  : [];
articulos.sort((a, b) => b.fecha.localeCompare(a.fecha));

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(RAIZ, 'assets'), path.join(OUT, 'assets'), { recursive: true });
escribe('.nojekyll', '');

for (const a of articulos) escribe(`articulos/${a.slug}/index.html`, paginaArticulo(a, articulos));

// Inicio
{
  const [destacado, ...resto] = articulos;
  const cuerpo = `<section class="hero">
  <h1>Noticias cripto explicadas fácil</h1>
  <p>Cada día te contamos lo que pasa en bitcoin y cripto con contexto: qué ha pasado, por qué importa y qué significa para ti. Sin hype y sin promesas de dinero fácil.</p>
  <a class="boton" href="${INSTAGRAM}" rel="noopener" target="_blank">Síguenos en Instagram</a>
</section>
${destacado ? `<section class="destacado">${tarjeta(destacado, '', false)}</section>` : '<p>Pronto, los primeros artículos.</p>'}
${resto.length ? `<section><h2>Últimos artículos</h2><div class="rejilla">${resto.slice(0, 30).map(a => tarjeta(a, '')).join('\n')}</div></section>` : ''}`;
  escribe('index.html', pagina({ titulo: `${NOMBRE}: ${LEMA}`, descripcion: 'Noticias de bitcoin y criptomonedas explicadas fácil, guías para empezar desde cero y cómo protegerte de estafas. En español y sin hype.',
    base: '', cuerpo, canonical: SITE, jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NOMBRE, url: SITE, inLanguage: 'es', publisher: ORG }, { '@context': 'https://schema.org', ...ORG }] }));
}

// Categorías
for (const [cat, desc] of Object.entries(CATEGORIAS)) {
  const lista = articulos.filter(a => a.categoria === cat);
  const cuerpo = `<section class="hero peq"><h1>${esc(cat)}</h1><p>${esc(desc)}</p></section>
${lista.length ? `<div class="rejilla">${lista.map(a => tarjeta(a, '../../')).join('\n')}</div>` : '<p>Todavía no hay artículos en esta sección.</p>'}`;
  escribe(`categoria/${slugify(cat)}/index.html`, pagina({ titulo: `${cat}: ${desc.replace(/\.$/, '')}`, descripcion: desc, base: '../../', cuerpo, canonical: `${SITE}categoria/${slugify(cat)}/` }));
}

// Sobre Ray (autoría y confianza: Google lo valora mucho en temas de dinero)
escribe('sobre/index.html', pagina({ titulo: 'Sobre Ray y Ray Cripto Diario', descripcion: 'Quién está detrás de Ray Cripto Diario, cómo elegimos y verificamos las noticias y por qué no damos consejos de inversión.', base: '../', canonical: `${SITE}sobre/`,
  jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Sobre Ray', url: `${SITE}sobre/`, mainEntity: AUTOR }],
  cuerpo: `<article class="articulo"><h1>Sobre Ray y Ray Cripto Diario</h1><div class="cuerpo">
<p>Soy Ray y llevo años aprendiendo sobre bitcoin y criptomonedas. Empecé como casi todos: perdido entre términos raros, promesas de dinero fácil y miedo a equivocarme. Ray Cripto Diario nace para ahorrarte ese camino: <strong>explicar cripto en español, fácil y sin hype</strong>.</p>
<h2>Cómo trabajamos</h2>
<ul>
<li><strong>Verificamos cada noticia</strong> en al menos dos medios fiables antes de publicarla, y enlazamos siempre las fuentes.</li>
<li><strong>Contamos el contexto</strong>: qué ha pasado, por qué importa y qué significa para ti.</li>
<li><strong>No damos consejos de inversión</strong> ni recomendamos comprar o vender nada. Nuestro objetivo es que entiendas lo que pasa para que decidas por tu cuenta.</li>
<li><strong>La seguridad primero</strong>: nunca te pediremos tu frase semilla, tus claves ni tu dinero. Si alguien lo hace en nuestro nombre, es una estafa.</li>
</ul>
<h2>Dónde encontrarnos</h2>
<p>Publicamos cada día en <a href="${INSTAGRAM}" rel="noopener" target="_blank">Instagram @raycriptodiario</a> (carruseles, reels e historias) y aquí, en la web, con los artículos completos.</p>
</div></article>` }));

escribe('aviso-legal/index.html', pagina({ titulo: 'Aviso legal y descargo de responsabilidad', descripcion: 'Condiciones de uso de Ray Cripto Diario: contenido educativo, sin consejo financiero.', base: '../', canonical: `${SITE}aviso-legal/`,
  cuerpo: `<article class="articulo"><h1>Aviso legal</h1><div class="cuerpo">
<p>Ray Cripto Diario es un proyecto <strong>educativo e informativo</strong>. Nada de lo publicado en esta web ni en nuestras redes es asesoramiento financiero, fiscal ni legal, ni una recomendación para comprar, vender o mantener ningún activo.</p>
<p>Las criptomonedas son activos muy volátiles: puedes perder todo lo que inviertas. Investiga siempre por tu cuenta (DYOR) y, si lo necesitas, consulta con un profesional autorizado.</p>
<p>Verificamos la información con fuentes fiables, pero puede contener errores o quedar desactualizada. Si ves algo incorrecto, escríbenos por Instagram y lo corregimos.</p>
<p>Esta web no usa cookies propias ni herramientas de seguimiento. Las fuentes tipográficas se cargan desde Google Fonts.</p>
</div></article>` }));

escribe('404.html', pagina({ titulo: 'Página no encontrada', descripcion: 'Esta página no existe.', base: SITE, canonical: SITE,
  cuerpo: `<section class="hero peq"><h1>Esta página no existe</h1><p><a href="${SITE}">Vuelve al inicio</a> para ver los últimos artículos.</p></section>` }));

// sitemap, robots y RSS
const urls = [{ loc: SITE, mod: articulos[0]?.fecha }, ...Object.keys(CATEGORIAS).map(c => ({ loc: `${SITE}categoria/${slugify(c)}/` })),
  { loc: `${SITE}sobre/` }, ...articulos.map(a => ({ loc: a.url, mod: a.actualizado || a.fecha }))];
escribe('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
escribe('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
escribe('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${NOMBRE}</title><link>${SITE}</link><description>${LEMA}</description><language>es</language>
<atom:link href="${SITE}feed.xml" rel="self" type="application/rss+xml"/>
${articulos.slice(0, 30).map(a => `<item><title>${esc(a.titulo)}</title><link>${a.url}</link><guid>${a.url}</guid><pubDate>${new Date(a.fecha).toUTCString()}</pubDate><description>${esc(a.descripcion)}</description></item>`).join('\n')}
</channel></rss>
`);

console.log(`Web generada en docs/: ${articulos.length} artículos`);
