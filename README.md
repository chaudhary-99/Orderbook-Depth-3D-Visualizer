


# Orderbook Depth 3D Visualizer

A modern web application for visualizing order book depth data in 3D, providing real-time insights and pressure zone analysis for financial markets. Built with Next.js, React, and Three.js, styled using Tailwind CSS.

---

## Table of Contents
- [Features](#features)
- [Assumptions](#assumptions)
- [APIs Used](#apis-used)
- [Technical Decisions](#technical-decisions)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Technologies Used](#technologies-used)
- [License](#license)
- [Author](#author)

---

## Features

- **3D Orderbook Visualization:** Interactive 3D rendering of order book depth using Three.js.
- **Real-Time Data:** Live updates via WebSocket for accurate market depth representation.
- **Pressure Zone Analysis:** Detects and highlights significant liquidity zones.
- **Customizable Controls:** User-friendly control panel for adjusting visualization parameters.
- **Responsive UI:** Clean, modern interface with Tailwind CSS.

---

## Assumptions

- The order book data is received in real-time via a WebSocket connection, and the data format is compatible with the processing logic in `src/utils/orderbookProcessor.ts`.
- The pressure zone detection logic assumes that significant liquidity zones can be identified by analyzing order book depth and volume, as implemented in `src/utils/pressureZoneDetector.ts`.
- The visualization is intended for desktop browsers with WebGL support.
- The user is familiar with basic trading/order book concepts.

---

## APIs Used

- **WebSocket API:** Used for real-time streaming of order book data. The WebSocket connection is managed in `src/utils/websocketManager.ts`.
  - The specific WebSocket endpoint and message format should be configured as needed for your data provider.
- **Three.js:** Used for rendering the 3D visualization of the order book in `OrderbookVisualizer.tsx` and related hooks.

---

## Technical Decisions

- **Next.js App Directory:** The project uses the Next.js app directory structure for better routing and layout management.
- **Component Structure:** Visualization, control panel, and analysis are separated into modular React components under `src/components/` for maintainability.
- **Custom Hooks:** Data fetching and Three.js scene management are encapsulated in custom hooks (`useOrderbookData.ts`, `useThree.ts`) for reusability and separation of concerns.
- **TypeScript:** Used throughout the project for type safety and improved developer experience.
- **Tailwind CSS:** Chosen for rapid UI development and consistent styling.
- **Utility Modules:** Data processing and business logic are separated into utility files under `src/utils/`.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository:
	```sh
	git clone https://github.com/chaudhary-99/Orderbook-Depth-3D-Visualizer.git
	cd orderbook-3d-visualizer
	```
2. Install dependencies:
	```sh
	npm install
	# or
	yarn install
	```

### Running the App
Start the development server:
```sh
npm run dev
# or

```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Project Structure

- `src/app/` - Next.js app directory (pages, layout, global styles)
- `src/components/` - React components (visualizer, control panel, analysis)
- `src/hooks/` - Custom React hooks (orderbook data, Three.js integration)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions (orderbook processing, pressure zone detection, WebSocket management)
- `public/` - Static assets (SVGs, icons)

---

## Scripts
- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server

---

## Technologies Used
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Author

[chaudhary-99](https://github.com/chaudhary-99)
