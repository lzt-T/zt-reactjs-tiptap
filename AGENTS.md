# Agent Guidelines for md-tiptap

## Project Overview
React + TypeScript + Vite application for markdown editing with TipTap.

## Build Commands

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Tech Stack
- **Framework**: React 19 + Vite 7
- **Language**: TypeScript 5.9 (strict mode)
- **Package Manager**: pnpm
- **Module System**: ES Modules

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Strict mode enabled with additional checks:
  - `noUnusedLocals: true` - Error on unused variables
  - `noUnusedParameters: true` - Error on unused function parameters
  - `noFallthroughCasesInSwitch: true` - Prevent switch case fallthrough
  - `verbatimModuleSyntax: true` - Preserve import/export syntax

### Import Conventions
- Use ES module imports
- Import React hooks explicitly: `import { useState } from 'react'`
- CSS imports: `import './App.css'`
- No default exports preferred for components

### Naming Conventions
- Components: PascalCase (e.g., `App.tsx`)
- Files: PascalCase for components, camelCase for utilities
- Hooks: camelCase with `use` prefix (e.g., `useCounter`)
- Types/Interfaces: PascalCase

### Component Structure
- Use functional components with hooks
- Prefer destructured props
- Always define explicit return types for complex components

### Error Handling
- Use TypeScript's strict null checks
- Handle async errors with try/catch
- Validate external data at boundaries

### ESLint Rules
- Standard TypeScript ESLint recommended rules
- React Hooks rules (exhaustive-deps enforced)
- React Refresh rules for HMR
- `dist/` folder is ignored

### CSS
- Component-scoped CSS files
- Use CSS custom properties for theming
- Follow BEM naming for complex selectors

## Type Definitions
- Define interfaces for component props
- Use strict typing for event handlers
- Avoid `any` type; use `unknown` when type is uncertain

## Performance Guidelines
- Use React.memo for expensive renders
- Lazy load heavy components
- Optimize images before adding to public/

## Git Workflow
- This is NOT a git repository (no .git folder found)
- Initialize git with `git init` if version control is needed

## Common Tasks

### Adding a New Component
1. Create file in `src/components/ComponentName.tsx`
2. Add corresponding CSS: `src/components/ComponentName.css`
3. Export component and import where needed

### Adding Type Definitions
- Place shared types in `src/types/` directory
- Keep component-specific types with the component

### Running Linting
Always run `pnpm lint` before committing to ensure code quality.

## Project Structure
```
src/
├── main.tsx          # Application entry point
├── App.tsx           # Root component
├── App.css           # App styles
├── index.css         # Global styles
└── assets/           # Static assets
public/               # Public static files
```

## Notes for AI Agents
- This project uses pnpm as package manager
- Vite provides Hot Module Replacement (HMR) in development
- TypeScript errors will block builds due to `tsc -b` in build script
- No testing framework is currently configured
- Always check for TypeScript strict mode violations
- Follow existing patterns in `src/App.tsx` for component structure
