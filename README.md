
# Orderbook Depth 3D Visualizer

A modern web application for visualizing order book depth data in 3D, providing real-time insights and pressure zone analysis for financial markets. Built with Next.js, React, and Three.js, styled using Tailwind CSS.

## Features

- **3D Orderbook Visualization:** Interactive 3D rendering of order book depth using Three.js.
- **Real-Time Data:** Live updates via WebSocket for accurate market depth representation.
- **Pressure Zone Analysis:** Detects and highlights significant liquidity zones.
- **Customizable Controls:** User-friendly control panel for adjusting visualization parameters.
- **Responsive UI:** Clean, modern interface with Tailwind CSS.

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

## Project Structure

- `src/app/` - Next.js app directory (pages, layout, global styles)
- `src/components/` - React components (visualizer, control panel, analysis)
- `src/hooks/` - Custom React hooks (orderbook data, Three.js integration)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions (orderbook processing, pressure zone detection, WebSocket management)
- `public/` - Static assets (SVGs, icons)

## Scripts
- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server

## Technologies Used
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

[chaudhary-99](https://github.com/chaudhary-99)
