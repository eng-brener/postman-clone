# Tauri API Client (Postman Clone)

A modern, lightweight, and fast API client built with **Tauri v2**, **React**, and **Rust**. Designed to be a performant alternative to heavy Electron-based clients like Postman or Insomnia.

![License](https://img.shields.io/badge/license-MIT-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![React](https://img.shields.io/badge/React-19-blue)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange)

## 🚀 Features

- **Lightweight & Fast**: Powered by Rust and the OS native webview (WebView2/WebKitGTK). Significantly smaller memory footprint than Electron apps.
- **Modern UI**: Dark mode by default, inspired by tools like Linear and VS Code.
- **Full Request Control**:
  - Methods: GET, POST, PUT, PATCH, DELETE.
  - Query Params & Headers editor.
  - Body support: JSON (with syntax highlighting), Form-Data, x-www-form-urlencoded, Raw (Text, XML, HTML).
- **Authentication**:
  - API Key (Header/Query).
  - Bearer Token.
  - Basic Auth.
- **Advanced Response Viewer**:
  - Monaco Editor integration for JSON response highlighting and folding.
  - Response stats: Status code, time, size.
  - Raw & Preview modes.
- **Settings**: Control HTTP version, SSL verification, and redirect behavior.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: CSS Variables (Themeable), Lucide React (Icons).
- **Editor**: Monaco Editor (`@monaco-editor/react`).
- **Backend/Core**: Tauri v2 (Rust), `reqwest` (via Tauri HTTP plugin).

## 📦 Installation & Setup

### Prerequisites

1.  **Node.js** (v18+) and **pnpm**.
2.  **Rust** (stable). Install via [rustup](https://rustup.rs/).
3.  **OS Dependencies** (Linux only):
    ```bash
    sudo apt-get install libwebkit2gtk-4.0-dev \
        build-essential \
        curl \
        wget \
        file \
        libssl-dev \
        libgtk-3-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev
    ```

### Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/postman-clone.git
    cd postman-clone
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Run in development mode**:
    ```bash
    pnpm tauri dev
    ```

### Build for Production

To create a native executable for your OS:

```bash
    pnpm tauri build
    ```

The output binary will be located in `src-tauri/target/release/bundle/`.

## 🗺️ Roadmap

- [x] Basic Request/Response loop.
- [x] Advanced Body Editors (JSON, Form, etc).
- [x] Auth Methods (Bearer, Basic, API Key).
- [ ] **Persistence**: Save collections and history to disk.
- [ ] **Environments**: Variables support (e.g., `{{base_url}}`).
- [ ] **Tabs**: Multiple open requests.
- [ ] **Code Generation**: Export requests to curl, fetch, python, etc.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a Pull Request.

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.