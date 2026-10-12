# 🐍 Classic Snake Game

A fast, responsive, and lightweight arcade Snake Game built with vanilla **HTML5, CSS, and JavaScript**. Designed from the ground up to run directly in any web browser and deploy effortlessly to **GitHub Pages** with zero backend or build setup required.

---

## 🚀 Features

- **Pure Static Frontend**: Zero backend dependencies, no frameworks or build steps required.
- **Cross-Platform**:
  - **Desktop**: Full keyboard support (Arrow keys, WASD, Space to Pause, R to Restart).
  - **Mobile & Tablet**: Touch swipe navigation and dedicated on-screen Virtual D-Pad with tactile haptic feedback.
- **Web Audio Sound Effects**: Retro arcade sounds synthesized dynamically via the Web Audio API (no external audio files to load or fail).
- **Persistent High Score**: Best scores and sound settings are saved in your browser's `localStorage`.
- **Exciting Bonus Fruit**: Shimmering golden star fruits spawn periodically with a countdown timer for bonus points.
- **High-DPI Retina Ready**: Canvas automatically scales to match retina and high-refresh-rate screens.

---

## 🎮 How to Play

### Controls
| Platform | Action | Controls |
| :--- | :--- | :--- |
| **Desktop** | Move Snake | <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Desktop** | Pause / Resume | <kbd>Space</kbd> or Pause button |
| **Desktop** | Restart Game | <kbd>R</kbd> or <kbd>Enter</kbd> |
| **Mobile** | Move Snake | Swipe on screen or tap the **Virtual D-Pad** buttons |
| **Mobile** | Pause / Resume | Tap the **Pause** button in the control bar |

### Rules & Scoring
- 🍎 **Red Apple**: +10 points (grows snake by 1 segment).
- ⭐ **Golden Star Bonus**: +50 points (appears every 5 apples for 6 seconds).
- 💀 **Game Over**: Crashing into the outer wall border or biting your own tail ends the game.

---

## 📦 How to Deploy to GitHub Pages (2 Easy Ways)

### Option 1: Direct GitHub Pages Deployment (Recommended & Simplest)

1. **Create a new repository** on [GitHub.com](https://github.com/new) (e.g., `snake-game`).
2. **Push your files** to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Classic Snake Game"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/snake-game.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** > **Pages** (under "Code and automation" in the left sidebar).
   - Under **Build and deployment**:
     - **Source**: Select `Deploy from a branch`.
     - **Branch**: Select `main` and set the folder to `/ (root)`.
   - Click **Save**.
4. In about 30 seconds, your game will be live at:  
   `https://<YOUR-USERNAME>.github.io/snake-game/`

---

### Option 2: Automated Deployment via GitHub Actions

This repository includes `.github/workflows/deploy.yml`. To use automated GitHub Actions:

1. Push your code to your repository's `main` branch.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**.
4. GitHub Actions will automatically run the workflow and deploy the latest version every time you push changes to `main`.

---

## 💻 Running Locally

You can run this project locally in any of the following ways:

- **Directly**: Double-click `index.html` to open it in any web browser.
- **Using Python**:
  ```bash
  python3 -m http.server 8000
  ```
  Open `http://localhost:8000` in your browser.
- **Using Node / Vite** (if installed):
  ```bash
  npm install
  npm run dev
  ```

---

## 📂 Project Structure

```text
├── index.html                 # Main website entry point in project root
├── style.css                  # Modern retro styling & responsive layout
├── script.js                  # Complete game mechanics, audio, and controls
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions deployment workflow
├── README.md                  # Documentation and setup instructions
└── .gitignore                 # Standard git ignore rules
```

---

## 📄 License

This project is open source and free to use under the [MIT License](https://opensource.org/licenses/MIT).
