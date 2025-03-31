# Server Insure

A TypeScript server for insurance services.

## Requirements

- Node.js (v14+)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run build` - Compiles TypeScript to JavaScript
- `npm run start` - Starts the server from compiled JavaScript
- `npm run dev` - Starts the development server with hot reloading
- `npm run lint` - Runs ESLint to check for code quality
- `npm run format` - Formats code using Prettier
- `npm run test` - Runs tests using Jest

## Project Structure

```
mcphub/
├── src/             # Source code
│   ├── routes/      # API routes
│   └── index.ts     # Entry point
├── dist/            # Compiled JavaScript (generated)
├── .env             # Environment variables (create from .env.example)
├── package.json     # Project dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## API Endpoints

- GET /api/insurance - Get all insurance policies
- GET /api/insurance/:id - Get a specific insurance policy
- POST /api/insurance - Create a new insurance policy
