<div align="center">
<img width="169" height="169" alt="HaxTrace logo" src="https://github.com/user-attachments/assets/83b7f8ae-7183-46c7-8f47-19bb696b21c1" />

# HaxTrace
### Vectorize images for Haxball

<p align="center">
  🇺🇸 English | <a href="README.md">🇪🇸 Español</a>
</p>

<br/>

[![Version](https://img.shields.io/badge/version-2.7.0-00d4ff?style=for-the-badge&labelColor=0d1117)](https://github.com/mo0negtt/HaxTrace/releases)
[![Live Editor](https://img.shields.io/badge/Editor-live-00d4ff?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117)](https://haxtrace.pages.dev/editor)
[![License](https://img.shields.io/badge/license-MIT-00d4ff?style=for-the-badge&labelColor=0d1117)](LICENSE)
[![TikTok](https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white&labelColor=0d1117)](https://www.tiktok.com/@mo0negtt)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0d1117)](https://www.typescriptlang.org/)

[**Editor**](#editor) · [**Features**](#features) · [**Workflow**](#workflow) · [**Shortcuts**](#shortcuts) · [**FAQ**](#faq)

</div>

> [!TIP]
> **HaxTrace** is built for mappers who need perfect geometry. Use **Snap-to-Grid** and **Smart Guides** to align every vertex without losing precision.

---

<div align="center">

<h2><a id="editor"></a>🖥️ Interface</h2>

<img width="100%" alt="HaxTrace — editor overview" src="https://github.com/user-attachments/assets/93cdec04-09ab-474e-b26b-d8a487612759" />
<img width="100%" alt="HaxTrace — Smart Guides in action" src="https://github.com/user-attachments/assets/c2e3932a-72c4-4fa3-a28b-3c4c9b6db775" />
<img width="100%" alt="HaxTrace — Help and Info" src="https://github.com/user-attachments/assets/936ada2c-6164-4e5a-8909-14a00fdbadac" />

</div>

---

## 🧠 What is HaxTrace?

HaxTrace turns a logo or reference image into **native Haxball geometry**: real vertices and segments, rendered in real time on HTML5 Canvas.

> Upload your logo → trace with precision → export vertices and segments ready for your `.hbs`.

---

<h2><a id="features"></a>✨ Features</h2>

<table>
<tr>
<td width="50%" valign="top">

#### 🎯 Precision & Assistance
- **Smart Guides** — dynamic X/Y alignment, highlighted in cyan.
- **Mirror Mode** — true real-time symmetry (vertical / horizontal).
- **Vertex Magnetic** — snaps the cursor to existing points for perfect connections.
- **Gap Detector** — finds loose vertices that break physics collision.

</td>
<td width="50%" valign="top">

#### ⚡ Advanced Interaction
- **Omni-Selection** — universal multi-select with a marquee box.
- **Edit in Bulk** — change bouncing, color, or visibility on multiple segments at once.
- **Keyboard Mastery** — professional shortcuts for a mouse-free workflow.

</td>
</tr>
</table>

---

<h2><a id="workflow"></a>🔁 Workflow</h2>

1. **Upload** your logo or reference image to the canvas.
2. **Trace** the vertices — Snap-to-Grid and Vertex Magnetic make every point snap into place.
3. **Align** with Smart Guides and turn on Mirror Mode if the logo is symmetric.
4. **Check** with Gap Detector before exporting — a loose vertex is a collision leak you won't see by eye.
5. **Export** the geometry and paste it into `vertexes` / `segments` of your map.

---

<h2><a id="shortcuts"></a>⌨️ Keyboard Shortcuts</h2>

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete selection |
| `Esc` | Deselect |
| `Ctrl + A` | Select all |

---

## 🔒 Design Decisions

| Decision | Risk mitigated |
| :--- | :--- |
| Native geometry (vertices/segments) instead of rasterizing the image | Haxball only computes collision over `vertexes`/`segments` — a background PNG doesn't collide with anything. |
| Gap Detector | A vertex that's "almost" touching another creates collision leaks that look like a closed wall to the naked eye. |
| Cyan Smart Guides | Same contrast on light and dark canvases, never lost against the artwork. |
| Vertex Magnetic | Prevents invisible micro-gaps between segments that should share an exact point. |

---

<h2><a id="faq"></a>❓ FAQ</h2>

**Do I need to install anything?**
No. HaxTrace runs 100% in the browser, no sign-up or install required.

**What can I upload as a reference?**
Any image (PNG, JPG, WebP) you want to vectorize.

**What do I get when I export?**
Vertices and segments ready to paste straight into your `.hbs`.

**Does it work better on desktop or mobile?**
Desktop is recommended — precise tracing relies on mouse + keyboard.

---

## 🗺️ Roadmap

- [x] Smart Guides + Snap-to-Grid
- [x] Mirror Mode (vertical / horizontal)
- [x] Vertex Magnetic
- [x] Gap Detector
- [x] Omni-Selection (marquee)
- [x] Professional keyboard shortcuts
- [ ] Interface redesign

---

## ⚠️ Status

> **Project status:** v2.7.0 — stable editor, actively used by the Haxball mapping community.

---

<div align="center">

## Contributors

<a href="https://github.com/mo0negtt/HaxTrace/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=mo0negtt/HaxTrace" alt="Contributors"/>
</a>

</div>

---

## 📄 License

MIT

---

<div align="center">
<br/>

**Made with ❤️ by [mo0negtt](https://github.com/mo0negtt)**

🇵🇸 🇪🇭

</div>
