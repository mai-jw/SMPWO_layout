<div align="center">
  <h1>🌌 Antigravity: SMPWO Layout Engine</h1>
  <p><strong>Advanced Exhibition Cart Management & Visualization Tool</strong></p>
</div>

---

Welcome to the **SMPWO Layout Engine**. Developed under Project Antigravity, this web application is designed to streamline the visual layout and planning process for exhibition carts. It allows users to programmatically and visually configure publications, booklets, and promotional materials across dynamic, responsive cart shelves.

## ✨ Features

- **Dynamic Dual-Cart Configuration**: Manage CART A and CART B with independent shelf configurations and live-preview rendering.
- **Intelligent Slotting**: Mathematical and visual alignment with real-world proportions. Automatically calculates heights, widths, and gaps for various publication types (Bunkobon, Booklets, Pamphlets, Posters).
- **Export Capabilities**: Seamlessly export your custom layout configurations to PNG, PDF, or Excel for easy sharing and physical setup reference.
- **Premium UI/UX**: A modern, clean, and responsive design interface that minimizes visual clutter and maximizes design efficiency.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS for utility-first styling and Framer Motion for micro-interactions
- **Icons**: Lucide React
- **Backend/Storage**: Supabase (Remote Asset Storage)

## 📦 Getting Started

1. **Navigate to the application directory**:
   ```bash
   cd artifacts/exhibition-cart
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   # or
   pnpm run dev
   ```

4. Open `http://localhost:3000` (or the port specified in your terminal) to view the application.

## 🎨 Design Philosophy

Aligning with the Antigravity design principles, this tool prioritizes:
1. **Clarity**: Unnecessary placeholder texts have been removed to present users with a true-to-life representation of the physical exhibition cart over a pristine, guidelines-driven background (`cart_empty_guid.png`).
2. **Precision**: Shelf gaps, element sizes, and absolute positioning are carefully calibrated to ensure no overflowing or text clipping.
3. **Visual Excellence**: Utilizing sharp corner aesthetics, a crisp color palette, and streamlined toolbar controls for a professional-grade user experience.

---
*Maintained by the Antigravity Team.*
