<p align="center">
  <strong>&#9788; OZICAN</strong><br/>
  <em>Interactive 3D Solar System Explorer</em>
</p>

<p align="center">
  <a href="#english">English</a> &nbsp;|&nbsp;
  <a href="#türkçe">Türkçe</a> &nbsp;|&nbsp;
  <a href="#deutsch">Deutsch</a>
</p>

---

# English

## Overview

**Ozican** is a web-based interactive astronomy application that renders the entire solar system in real-time 3D. Built for amateur astronomers, students, educators, and anyone curious about space, the app presents the Sun, all eight planets, and 27 major moons with scientifically accurate data, procedurally generated photorealistic textures, custom GLSL shaders, and smooth orbital animations.

No plugins, no downloads — it runs entirely in your browser.

## Features

### For General Users

- **Full Solar System** — Explore the Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune in an interactive 3D environment.
- **Click Any Planet** — Click or tap on any celestial body to zoom in and view a detailed information panel with physical attributes, atmospheric composition, geology, minerals, astrophysical data, and fun facts.
- **27 Moons** — Major moons for Earth (Luna), Mars (Phobos, Deimos), Jupiter (Io, Europa, Ganymede, Callisto), Saturn (Titan, Enceladus, Mimas, Iapetus), Uranus (Miranda, Ariel, Titania, Oberon), and Neptune (Triton, Proteus, Nereid) are all included with individual data sheets.
- **Planet Comparison Table** — Compare all planets side-by-side across diameter, mass, gravity, day length, orbital period, temperature, and more.
- **Orbital Trajectories** — Elliptical orbit lines rendered with correct eccentricity and inclination for every planet.
- **Animation Speed Control** — Pause the simulation or speed it up (0.25x, 1x, 3x, 10x) to observe orbital mechanics at your preferred pace.
- **Toggle Controls** — Show or hide orbit lines and planet labels independently.
- **Fullscreen Mode** — Immerse yourself in the cosmos with a single click.
- **Responsive Design** — Works on desktop, tablet, and mobile browsers.

### For Technical Users

- **Three.js (r162)** — WebGL-based 3D rendering with `MeshPhongMaterial`, `ShaderMaterial`, `OrbitControls`, raycasting, and sprite-based effects.
- **Custom GLSL Shaders** — The Sun features a multi-octave fractal Brownian motion (fBm) noise shader with animated turbulence, limb darkening, and a separate corona glow shader. Planets with atmospheres (Earth, Venus) use Fresnel-based atmospheric scattering shaders. Saturn's rings use a custom band-pattern shader with Cassini Division, Encke Gap, and planetary shadow casting.
- **Procedural Texture Generation** — Every planet texture is generated at runtime on HTML5 Canvas using seeded Perlin noise, fractal layering, and domain-specific color palettes. No external image assets are required. Textures include Jupiter's banded clouds with the Great Red Spot, Earth's continents/oceans/polar ice/cloud layer, Mars's rust terrain with polar caps, and more.
- **ACES Filmic Tone Mapping** — The renderer uses `ACESFilmicToneMapping` with sRGB output for physically plausible HDR-to-LDR conversion.
- **Elliptical Orbits** — Orbit paths are computed using the vis-viva equation with real eccentricity values, not simple circles.
- **Smooth Camera Transitions** — Cubic ease-in-out interpolation between camera positions when focusing on planets, with continuous target tracking during orbital motion.
- **Modular Architecture** — Clean separation of concerns: data layer (`solarSystem.js`), 3D scene (`SolarSystemScene.js`), shaders (`sunShader.js`, `atmosphereShader.js`), procedural textures (`proceduralTextures.js`), and UI components (`InfoPanel.js`, `ComparePanel.js`).
- **Vite Build System** — Fast HMR development server and optimized production builds with tree-shaking.
- **Zero External Assets** — The entire application is self-contained with no external image dependencies. All textures, starfields, and ring patterns are generated procedurally.

## Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (included with Node.js)
- A modern browser with WebGL support (Chrome, Firefox, Edge, Safari)

### Installation

```bash
git clone https://github.com/bnelabs/ozican.git
cd ozican
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173` with hot module replacement.

### Production Build

```bash
npm run build
npm run preview
```

Generates optimized static files in the `dist/` directory, suitable for deployment to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## Controls

| Action | Mouse / Touch | Keyboard |
|---|---|---|
| Rotate view | Left-click + drag | — |
| Zoom | Scroll wheel / pinch | — |
| Pan | Right-click + drag | — |
| Select planet | Click on planet or bottom bar | `1`–`9` |
| Return to overview | Click "Overview" button | `Esc` |
| Pause / Resume | Click "Speed" button | `Space` |
| Fullscreen | Click fullscreen button | — |

## Project Structure

```
ozican/
├── index.html                            # Application shell and UI structure
├── package.json                          # Dependencies and scripts
├── vite.config.js                        # Vite build configuration
└── src/
    ├── main.js                           # Entry point — wires 3D scene to UI
    ├── data/
    │   └── solarSystem.js                # Comprehensive astronomical dataset
    ├── scene/
    │   └── SolarSystemScene.js           # Three.js scene, camera, controls, animation loop
    ├── shaders/
    │   ├── sunShader.js                  # GLSL vertex/fragment shaders for Sun and corona
    │   └── atmosphereShader.js           # GLSL shaders for atmospheres and ring systems
    ├── textures/
    │   └── proceduralTextures.js         # Canvas-based procedural texture generators
    ├── styles/
    │   └── main.css                      # Complete UI stylesheet
    └── ui/
        ├── InfoPanel.js                  # Planet/moon detail panel renderer
        └── ComparePanel.js               # Planet comparison table renderer
```

## Technology Stack

| Component | Technology |
|---|---|
| 3D Rendering | Three.js r162 |
| Shading | Custom GLSL (vertex + fragment) |
| Textures | Procedural (Canvas 2D + Perlin noise) |
| Build Tool | Vite 5 |
| Language | Vanilla JavaScript (ES Modules) |
| Styling | CSS3 with CSS Custom Properties |
| Fonts | Inter, Space Grotesk (Google Fonts) |

## Browser Support

| Browser | Minimum Version |
|---|---|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 15+ |
| Edge | 90+ |
| Mobile Chrome | 90+ |
| Mobile Safari | 15+ |

WebGL 2.0 support is required. Hardware-accelerated GPU is recommended for smooth performance.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

# Türkçe

## Genel Bakış

**Ozican**, güneş sistemini gerçek zamanlı 3B olarak görselleştiren, tarayıcı tabanlı interaktif bir astronomi uygulamasıdır. Amatör astronomlar, öğrenciler, eğitimciler ve uzaya merak duyan herkes için tasarlanan uygulama; Güneş'i, sekiz gezegeni ve 27 büyük uyduyu bilimsel olarak doğru veriler, prosedürel olarak üretilmiş fotorealistik dokular, özel GLSL gölgelendiriciler ve akıcı yörünge animasyonlarıyla sunar.

Eklenti yok, indirme yok — tamamen tarayıcınızda çalışır.

## Özellikler

### Genel Kullanıcılar İçin

- **Tam Güneş Sistemi** — Güneş, Merkür, Venüs, Dünya, Mars, Jüpiter, Satürn, Uranüs ve Neptün'ü interaktif 3B ortamda keşfedin.
- **Herhangi Bir Gezegene Tıklayın** — Herhangi bir gök cismine tıklayarak veya dokunarak yakınlaştırın; fiziksel özellikler, atmosfer bileşimi, jeoloji, mineraller, astrofizik verileri ve ilginç bilgiler içeren detaylı bilgi panelini görüntüleyin.
- **27 Uydu** — Dünya (Ay), Mars (Phobos, Deimos), Jüpiter (Io, Europa, Ganymede, Callisto), Satürn (Titan, Enceladus, Mimas, Iapetus), Uranüs (Miranda, Ariel, Titania, Oberon) ve Neptün (Triton, Proteus, Nereid) uydularının tamamı bireysel veri sayfalarıyla dahil edilmiştir.
- **Gezegen Karşılaştırma Tablosu** — Tüm gezegenleri çap, kütle, yerçekimi, gün uzunluğu, yörünge periyodu, sıcaklık ve daha fazlası üzerinden yan yana karşılaştırın.
- **Yörünge Yolları** — Her gezegen için doğru dışmerkezlilik ve eğimle çizilmiş eliptik yörünge çizgileri.
- **Animasyon Hız Kontrolü** — Simülasyonu duraklatın veya hızlandırın (0.25x, 1x, 3x, 10x).
- **Açma/Kapama Kontrolleri** — Yörünge çizgilerini ve gezegen etiketlerini bağımsız olarak gösterin veya gizleyin.
- **Tam Ekran Modu** — Tek bir tıklamayla kendinizi kozmosun içine bırakın.
- **Duyarlı Tasarım** — Masaüstü, tablet ve mobil tarayıcılarda çalışır.

### Teknik Kullanıcılar İçin

- **Three.js (r162)** — `MeshPhongMaterial`, `ShaderMaterial`, `OrbitControls`, ışın izleme (raycasting) ve sprite tabanlı efektlerle WebGL tabanlı 3B görselleştirme.
- **Özel GLSL Gölgelendiriciler** — Güneş, animasyonlu türbülanslı çok oktavlı fraktal Brownian hareket (fBm) gürültü gölgelendiricisi, kenar kararması ve ayrı bir korona parlaklık gölgelendiricisi ile donatılmıştır. Atmosferi olan gezegenler (Dünya, Venüs) Fresnel tabanlı atmosferik saçılma gölgelendiricileri kullanır. Satürn'ün halkaları Cassini Bölünmesi, Encke Boşluğu ve gezegen gölge projeksiyonu içeren özel bir bant deseni gölgelendiricisi kullanır.
- **Prosedürel Doku Üretimi** — Tüm gezegen dokuları, tohumlu Perlin gürültüsü, fraktal katmanlama ve alana özgü renk paletleri kullanılarak HTML5 Canvas üzerinde çalışma zamanında üretilir. Harici görsel dosyası gerekmez.
- **ACES Filmik Ton Eşleme** — Görselleştirici, fiziksel olarak makul HDR-LDR dönüşümü için sRGB çıkışıyla `ACESFilmicToneMapping` kullanır.
- **Eliptik Yörüngeler** — Yörünge yolları, basit daireler yerine gerçek dışmerkezlilik değerleriyle vis-viva denklemi kullanılarak hesaplanır.
- **Modüler Mimari** — Veri katmanı, 3B sahne, gölgelendiriciler, prosedürel dokular ve kullanıcı arayüzü bileşenleri arasında temiz ayrım.
- **Vite Derleme Sistemi** — Hızlı HMR geliştirme sunucusu ve ağaç sallama (tree-shaking) ile optimize edilmiş üretim derlemeleri.
- **Sıfır Harici Kaynak** — Tüm uygulama, harici görsel bağımlılığı olmadan tamamen bağımsızdır.

## Hızlı Başlangıç

### Gereksinimler

- **Node.js** 18+ (LTS önerilir)
- **npm** 9+ (Node.js ile birlikte gelir)
- WebGL destekli modern bir tarayıcı (Chrome, Firefox, Edge, Safari)

### Kurulum

```bash
git clone https://github.com/bnelabs/ozican.git
cd ozican
npm install
```

### Geliştirme

```bash
npm run dev
```

Uygulamayı `http://localhost:5173` adresinde sıcak modül değiştirme (HMR) ile açar.

### Üretim Derlemesi

```bash
npm run build
npm run preview
```

`dist/` dizininde optimize edilmiş statik dosyalar oluşturur. Herhangi bir statik barındırma hizmetine (Vercel, Netlify, GitHub Pages vb.) dağıtım için uygundur.

## Kontroller

| Eylem | Fare / Dokunmatik | Klavye |
|---|---|---|
| Görünümü döndür | Sol tık + sürükle | — |
| Yakınlaştır / Uzaklaştır | Kaydırma tekerleği / kıstırma | — |
| Kaydır | Sağ tık + sürükle | — |
| Gezegen seç | Gezegene veya alt çubuğa tıkla | `1`–`9` |
| Genel görünüme dön | "Overview" düğmesine tıkla | `Esc` |
| Duraklat / Devam | "Speed" düğmesine tıkla | `Space` |
| Tam ekran | Tam ekran düğmesine tıkla | — |

## Proje Yapısı

```
ozican/
├── index.html                            # Uygulama kabuğu ve arayüz yapısı
├── package.json                          # Bağımlılıklar ve betikler
├── vite.config.js                        # Vite derleme yapılandırması
└── src/
    ├── main.js                           # Giriş noktası — 3B sahneyi arayüze bağlar
    ├── data/
    │   └── solarSystem.js                # Kapsamlı astronomik veri seti
    ├── scene/
    │   └── SolarSystemScene.js           # Three.js sahnesi, kamera, kontroller, animasyon döngüsü
    ├── shaders/
    │   ├── sunShader.js                  # Güneş ve korona için GLSL gölgelendiriciler
    │   └── atmosphereShader.js           # Atmosfer ve halka sistemleri için GLSL gölgelendiriciler
    ├── textures/
    │   └── proceduralTextures.js         # Canvas tabanlı prosedürel doku üreteçleri
    ├── styles/
    │   └── main.css                      # Tam kullanıcı arayüzü stil sayfası
    └── ui/
        ├── InfoPanel.js                  # Gezegen/uydu detay paneli oluşturucu
        └── ComparePanel.js               # Gezegen karşılaştırma tablosu oluşturucu
```

## Teknoloji Yığını

| Bileşen | Teknoloji |
|---|---|
| 3B Görselleştirme | Three.js r162 |
| Gölgelendirme | Özel GLSL (vertex + fragment) |
| Dokular | Prosedürel (Canvas 2D + Perlin gürültüsü) |
| Derleme Aracı | Vite 5 |
| Dil | Vanilla JavaScript (ES Modülleri) |
| Stil | CSS3 ve CSS Özel Özellikleri |
| Yazı Tipleri | Inter, Space Grotesk (Google Fonts) |

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

---

# Deutsch

## Überblick

**Ozican** ist eine browserbasierte, interaktive Astronomie-Anwendung, die das gesamte Sonnensystem in Echtzeit-3D darstellt. Entwickelt für Hobbyastronomen, Studierende, Lehrkräfte und alle Weltraumbegeisterten, präsentiert die App die Sonne, alle acht Planeten und 27 große Monde mit wissenschaftlich fundierten Daten, prozedural erzeugten fotorealistischen Texturen, benutzerdefinierten GLSL-Shadern und flüssigen Umlaufbahn-Animationen.

Keine Plugins, keine Downloads — die Anwendung läuft vollständig in Ihrem Browser.

## Funktionen

### Für allgemeine Nutzer

- **Vollständiges Sonnensystem** — Erkunden Sie Sonne, Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus und Neptun in einer interaktiven 3D-Umgebung.
- **Auf jeden Planeten klicken** — Klicken oder tippen Sie auf einen Himmelskörper, um heranzuzoomen und ein detailliertes Informationspanel mit physikalischen Eigenschaften, atmosphärischer Zusammensetzung, Geologie, Mineralien, astrophysikalischen Daten und interessanten Fakten anzuzeigen.
- **27 Monde** — Große Monde von Erde (Luna), Mars (Phobos, Deimos), Jupiter (Io, Europa, Ganymed, Kallisto), Saturn (Titan, Enceladus, Mimas, Iapetus), Uranus (Miranda, Ariel, Titania, Oberon) und Neptun (Triton, Proteus, Nereid) sind jeweils mit eigenen Datenblättern enthalten.
- **Planetenvergleichstabelle** — Vergleichen Sie alle Planeten nebeneinander nach Durchmesser, Masse, Schwerkraft, Tageslänge, Umlaufzeit, Temperatur und mehr.
- **Umlaufbahnen** — Elliptische Bahnlinien mit korrekter Exzentrizität und Inklination für jeden Planeten.
- **Animationsgeschwindigkeit** — Pausieren Sie die Simulation oder beschleunigen Sie sie (0,25x, 1x, 3x, 10x), um die Orbitalmechanik in Ihrem bevorzugten Tempo zu beobachten.
- **Umschalt-Steuerungen** — Bahnlinien und Planetenbeschriftungen unabhängig voneinander ein- oder ausblenden.
- **Vollbildmodus** — Tauchen Sie mit einem Klick in den Kosmos ein.
- **Responsives Design** — Funktioniert auf Desktop-, Tablet- und Mobilbrowsern.

### Für technische Nutzer

- **Three.js (r162)** — WebGL-basiertes 3D-Rendering mit `MeshPhongMaterial`, `ShaderMaterial`, `OrbitControls`, Raycasting und Sprite-basierten Effekten.
- **Benutzerdefinierte GLSL-Shader** — Die Sonne verfügt über einen mehroktavigen fraktalen Brownschen Bewegungs-Rausch-Shader (fBm) mit animierter Turbulenz, Randverdunklung und einem separaten Korona-Glüh-Shader. Planeten mit Atmosphären (Erde, Venus) verwenden Fresnel-basierte atmosphärische Streuungs-Shader. Saturns Ringe verwenden einen benutzerdefinierten Bandmuster-Shader mit Cassini-Teilung, Encke-Lücke und Planetenschatten-Projektion.
- **Prozedurale Textur-Erzeugung** — Alle Planetentexturen werden zur Laufzeit auf HTML5 Canvas mittels geseedeter Perlin-Rauschfunktionen, fraktaler Schichtung und bereichsspezifischer Farbpaletten erzeugt. Keine externen Bilddateien erforderlich.
- **ACES Filmisches Tone Mapping** — Der Renderer verwendet `ACESFilmicToneMapping` mit sRGB-Ausgabe für physikalisch plausible HDR-zu-LDR-Konvertierung.
- **Elliptische Umlaufbahnen** — Bahnpfade werden mit der Vis-Viva-Gleichung unter Verwendung realer Exzentrizitätswerte berechnet, nicht als einfache Kreise.
- **Modulare Architektur** — Saubere Trennung von Datenschicht, 3D-Szene, Shadern, prozeduralen Texturen und UI-Komponenten.
- **Vite Build-System** — Schneller HMR-Entwicklungsserver und optimierte Produktions-Builds mit Tree-Shaking.
- **Keine externen Ressourcen** — Die gesamte Anwendung ist eigenständig ohne externe Bildabhängigkeiten.

## Schnellstart

### Voraussetzungen

- **Node.js** 18+ (LTS empfohlen)
- **npm** 9+ (in Node.js enthalten)
- Ein moderner Browser mit WebGL-Unterstützung (Chrome, Firefox, Edge, Safari)

### Installation

```bash
git clone https://github.com/bnelabs/ozican.git
cd ozican
npm install
```

### Entwicklung

```bash
npm run dev
```

Öffnet die App unter `http://localhost:5173` mit Hot Module Replacement.

### Produktions-Build

```bash
npm run build
npm run preview
```

Erzeugt optimierte statische Dateien im Verzeichnis `dist/`, geeignet für die Bereitstellung auf jedem statischen Hosting-Dienst (Vercel, Netlify, GitHub Pages usw.).

## Steuerung

| Aktion | Maus / Touch | Tastatur |
|---|---|---|
| Ansicht drehen | Linksklick + ziehen | — |
| Zoomen | Scrollrad / Pinch-Geste | — |
| Schwenken | Rechtsklick + ziehen | — |
| Planet auswählen | Auf Planet oder untere Leiste klicken | `1`–`9` |
| Zur Übersicht zurückkehren | „Overview"-Schaltfläche klicken | `Esc` |
| Pause / Fortsetzen | „Speed"-Schaltfläche klicken | `Leertaste` |
| Vollbild | Vollbild-Schaltfläche klicken | — |

## Projektstruktur

```
ozican/
├── index.html                            # Anwendungsgerüst und UI-Struktur
├── package.json                          # Abhängigkeiten und Skripte
├── vite.config.js                        # Vite-Build-Konfiguration
└── src/
    ├── main.js                           # Einstiegspunkt — verbindet 3D-Szene mit UI
    ├── data/
    │   └── solarSystem.js                # Umfassender astronomischer Datensatz
    ├── scene/
    │   └── SolarSystemScene.js           # Three.js-Szene, Kamera, Steuerung, Animationsschleife
    ├── shaders/
    │   ├── sunShader.js                  # GLSL-Shader für Sonne und Korona
    │   └── atmosphereShader.js           # GLSL-Shader für Atmosphären und Ringsysteme
    ├── textures/
    │   └── proceduralTextures.js         # Canvas-basierte prozedurale Textur-Generatoren
    ├── styles/
    │   └── main.css                      # Vollständiges UI-Stylesheet
    └── ui/
        ├── InfoPanel.js                  # Planeten-/Mond-Detailpanel-Renderer
        └── ComparePanel.js               # Planetenvergleichstabellen-Renderer
```

## Technologie-Stack

| Komponente | Technologie |
|---|---|
| 3D-Rendering | Three.js r162 |
| Shading | Benutzerdefiniertes GLSL (Vertex + Fragment) |
| Texturen | Prozedural (Canvas 2D + Perlin-Rauschen) |
| Build-Werkzeug | Vite 5 |
| Sprache | Vanilla JavaScript (ES-Module) |
| Styling | CSS3 mit CSS Custom Properties |
| Schriftarten | Inter, Space Grotesk (Google Fonts) |

## Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert. Details finden Sie in der Datei [LICENSE](LICENSE).

---

<p align="center">
  <sub>Built with Three.js and procedural generation. No external textures required.</sub><br/>
  <sub>&copy; 2026 BNELabs &mdash; MIT License</sub>
</p>
