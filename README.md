# ChatCat Desktop Pet

A cute desktop pet powered by Electron, featuring a sprite-based cat character with keyboard/mouse tracking and AI chat.

![Electron](https://img.shields.io/badge/Electron-28-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Sprite Character** — Based on the open-source [bongo.cat](https://github.com/Externalizable/bongo.cat) assets (MIT license), with layered PNG compositing
- **Keyboard & Mouse Tracking** — Cat paws alternate left/right when you type, both paws press on mouse click
- **9 Color Skins** — Classic, Orange, Pink, Blue, Green, Purple, Golden, Shadow, Inverted
- **AI Chat** — Manga-style speech bubble with streaming responses, supports OpenAI / Claude / DeepSeek / Gemini / OpenRouter
- **System Info Widget** — Real-time CPU & memory usage display
- **Draggable Window** — Transparent, always-on-top window you can drag anywhere
- **Tray Support** — Minimize to system tray

## Quick Start

```bash
# Install dependencies
npm install

# Run
npm start
```

## Configuration

Click the gear icon on the toolbar to configure:

- **AI Service** — Choose from OpenAI, Claude, DeepSeek, Gemini, OpenRouter, or custom endpoint
- **API Key** — Your API key for the selected service
- **Model** — Select from available models
- **Opacity** — Adjust window transparency

## Tech Stack

- Electron 28
- Canvas 2D sprite rendering
- OpenAI-compatible API (streaming)
- [uiohook-napi](https://github.com/nickhall/uiohook-napi) for global input hooks
- [electron-store](https://github.com/nickhall/electron-store) for persistent settings

## Credits

Cat sprites from [bongo.cat](https://github.com/Externalizable/bongo.cat) by Externalizable (MIT License).
