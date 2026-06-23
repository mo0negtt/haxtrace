<div align="center">
<img width="169" height="169" alt="HaxTrace logo" src="https://github.com/user-attachments/assets/83b7f8ae-7183-46c7-8f47-19bb696b21c1" />

# HaxTrace
### Vectoriza imagenes para Haxball

<p align="center">
  🇪🇸 Español | <a href="README.en.md">🇺🇸 English</a>
</p>

<br/>

[![Version](https://img.shields.io/badge/version-2.7.0-00d4ff?style=for-the-badge&labelColor=0d1117)](https://github.com/mo0negtt/HaxTrace/releases)
[![Editor en vivo](https://img.shields.io/badge/Editor-en%20vivo-00d4ff?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117)](https://haxtrace.pages.dev/editor)
[![License](https://img.shields.io/badge/license-MIT-00d4ff?style=for-the-badge&labelColor=0d1117)](LICENSE)
[![TikTok](https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white&labelColor=0d1117)](https://www.tiktok.com/@mo0negtt)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0d1117)](https://www.typescriptlang.org/)

[**Editor**](#editor) · [**Funciones**](#funciones) · [**Flujo de trabajo**](#flujo) · [**Atajos**](#atajos) · [**FAQ**](#faq)

</div>

> [!TIP]
> **HaxTrace** está pensado para mappers que necesitan geometría perfecta. Usa **Snap-to-Grid** y las **Smart Guides** para alinear cada vértice sin perder precisión.

---

<div align="center">

<h2><a id="editor"></a>🖥️ Interfaz</h2>

<img width="100%" alt="HaxTrace — vista general del editor" src="https://github.com/user-attachments/assets/93cdec04-09ab-474e-b26b-d8a487612759" />
<img width="100%" alt="HaxTrace — Smart Guides en acción" src="https://github.com/user-attachments/assets/c2e3932a-72c4-4fa3-a28b-3c4c9b6db775" />
<img width="100%" alt="HaxTrace — Ayuda y Info" src="https://github.com/user-attachments/assets/936ada2c-6164-4e5a-8909-14a00fdbadac" />

</div>

---

## 🧠 ¿Qué es HaxTrace?

HaxTrace convierte un logo o una imagen de referencia en geometría **nativa de Haxball**: vértices y segmentos reales, renderizados en tiempo real sobre HTML5 Canvas.

> Subís tu logo → trazás con precisión → exportás vértices y segmentos listos para tu `.hbs`.

---

<h2><a id="funciones"></a>✨ Funciones</h2>

<table>
<tr>
<td width="50%" valign="top">

#### 🎯 Precisión & Asistencia
- **Smart Guides** — alineación dinámica X/Y con resalte en cian.
- **Mirror Mode** — simetría real en tiempo real (vertical / horizontal).
- **Vertex Magnetic** — atrae el cursor a puntos existentes para conexiones perfectas.
- **Gap Detector** — localiza vértices sueltos que rompen la colisión física.

</td>
<td width="50%" valign="top">

#### ⚡ Interacción Avanzada
- **Omni-Selection** — selección múltiple universal con cuadro de selección (marquee).
- **Edit in Bulk** — cambiá bouncing, color o visibilidad de varios segmentos a la vez.
- **Keyboard Mastery** — atajos profesionales para un flujo de trabajo sin mouse.

</td>
</tr>
</table>

---

<h2><a id="flujo"></a>🔁 Flujo de trabajo</h2>

1. **Subí** tu logo o imagen de referencia al lienzo.
2. **Trazá** los vértices — Snap-to-Grid y Vertex Magnetic hacen que cada punto encaje solo.
3. **Alineá** con Smart Guides y activá Mirror Mode si el logo es simétrico.
4. **Revisá** con Gap Detector antes de exportar — un vértice suelto es una fuga de colisión invisible a simple vista.
5. **Exportá** la geometría y pegala en `vertexes` / `segments` de tu mapa.

---

<h2><a id="atajos"></a>⌨️ Atajos de teclado</h2>

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + Z` | Deshacer |
| `Ctrl + Shift + Z` | Rehacer |
| `Delete` / `Backspace` | Eliminar selección |
| `Esc` | Deseleccionar |
| `Ctrl + A` | Seleccionar todo |

---

## 🔒 Decisiones de diseño

| Decisión | Riesgo que mitiga |
| :--- | :--- |
| Geometría nativa (vértices/segmentos) en vez de rasterizar la imagen | Haxball solo calcula colisión sobre `vertexes`/`segments` — un PNG de fondo no choca con nada. |
| Gap Detector | Un vértice "casi" pegado a otro genera fugas de colisión que a simple vista parecen una pared cerrada. |
| Smart Guides en cian | Mismo contraste sobre lienzos claros y oscuros, sin perderse entre el trazo. |
| Vertex Magnetic | Evita micro-huecos invisibles entre segmentos que deberían compartir un punto exacto. |

---

<h2><a id="faq"></a>❓ FAQ</h2>

**¿Necesito instalar algo?**
No. HaxTrace corre 100% en el navegador, sin registro ni instalación.

**¿Qué subo como referencia?**
Cualquier imagen (PNG, JPG, WebP) que quieras vectorizar.

**¿Qué obtengo al exportar?**
Vértices y segmentos listos para pegar directamente en tu `.hbs`.

**¿Funciona mejor en escritorio o en mobile?**
Recomendado en escritorio — el trazado de precisión depende de mouse + teclado.

---

## 🗺️ Roadmap

- [x] Smart Guides + Snap-to-Grid
- [x] Mirror Mode (vertical / horizontal)
- [x] Vertex Magnetic
- [x] Gap Detector
- [x] Omni-Selection (marquee)
- [x] Atajos de teclado profesionales
- [ ] Rediseño a la interfaz
- [ ] Hacer una té

---

## ⚠️ Estado

> **Estado del proyecto:** v2.7.0 — editor estable, en uso activo por la comunidad de mappers de Haxball.

---

<div align="center">

## Contribuidores

<a href="https://github.com/mo0negtt/HaxTrace/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=mo0negtt/HaxTrace" alt="Contributors"/>
</a>

</div>

---

## 📄 Licencia

MIT

---

<div align="center">
<br/>

**Hecho con ❤️ por [mo0negtt](https://github.com/mo0negtt)**

🇵🇸 🇪🇭

</div>
