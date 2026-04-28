# Contributing

## Getting Started

Clone the repository, install dependencies, copy `.env.example` to `.env`, fill in your Interswitch credentials, then start the server in development mode.

```bash
git clone <repo-url>
cd interswitch-mcp-server
npm install
cp .env.example .env
npm run dev
```

## Making Changes

Create a branch for your work, make focused changes, and verify the project before submitting.

```bash
git checkout -b your-change
npm run build && npm test
```

## Submitting a PR

Open an issue first for major changes. In your pull request, describe what changed, why it changed, and how you tested it.
