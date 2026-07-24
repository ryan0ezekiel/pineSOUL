# pineSOUL 🔥

**Soul of your soldering iron** — A modern Pinecil V2 controller via Bluetooth.

<p align="center">
  <img src="docs/screenshot-control.png" width="600" alt="pineSOUL Control Tab">
</p>

## Features

- **Live Temperature Monitoring** — Animated ring dial with real-time tip temp, target, and power draw
- **Full Settings Control** — Soldering, sleep, power, display, and advanced settings organized by category
- **Bluetooth LE** — Automatic discovery and connection to Pinecil V2 via BLE
- **Dark Theme** — Polished, modern UI with glow effects and smooth animations
- **Cross-Platform** — Windows, macOS, and Linux via Electron

## Screenshots

| Control | Settings | Connect |
|---------|----------|---------|
| ![Control](docs/screenshot-control.png) | ![Settings](docs/screenshot-settings.png) | ![Connect](docs/screenshot-connect.png) |

## Quick Start

### Prerequisites

- Node.js 18+
- Bluetooth adapter (for connecting to your Pinecil)

### Development

```bash
git clone https://github.com/ryan0ezekiel/pineSOUL.git
cd pineSOUL
npm install
npm run dev
```

### Building

```bash
# Linux (AppImage, .deb, .rpm)
npm run dist:linux

# Windows (.exe installer + portable)
npm run dist:win

# macOS (.dmg)
npm run dist:mac

# All platforms
npm run dist:all
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop Shell | Electron 33 |
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Icons | Lucide React |
| BLE | @abandonware/noble |
| Packaging | electron-builder |

## BLE Protocol

pineSOUL communicates with the Pinecil V2 over Bluetooth Low Energy using:

- **Settings Service** — Read/write all iron settings
- **Live Data Service** — 2Hz telemetry stream (temp, voltage, power, etc.)
- **Device Info** — Firmware version, device ID, power source

Based on the [PineSAM](https://github.com/joric/PineSAM) BLE protocol specification.

## Project Structure

```
pineSOUL/
├── electron/           # Main process (Node.js / CommonJS)
│   ├── main.js         # Electron entry point + IPC handlers
│   ├── preload.js      # Context bridge for renderer
│   └── ble/            # Bluetooth Low Energy
│       ├── ble-manager.js   # Device discovery + connection
│       ├── protocol.js      # Binary encode/decode
│       └── constants.js     # UUIDs, register maps
├── src/                # Renderer process (React / ESM)
│   ├── App.jsx         # Main layout + navigation
│   ├── hooks/
│   │   └── usePinecil.js    # State management + mock data
│   └── components/
│       ├── TitleBar.jsx         # Custom window title bar
│       ├── TemperatureDial.jsx  # Animated SVG temperature ring
│       ├── LiveDataPanel.jsx    # Live telemetry cards
│       ├── SettingsPanel.jsx    # Settings editor
│       └── ConnectionPanel.jsx  # BLE device discovery
├── build/              # App icons
└── package.json
```

## License

MIT
