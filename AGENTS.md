# Repository Guidelines

This is a Next.js timesheet generator that integrates with Azure DevOps and Jira to produce Excel/PDF timesheets.

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components
├── lib/           # Utilities: api.ts, exportUtils.ts, generator.ts, oauthUtils.ts, types.ts
└── assets/        # Static assets
```

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create production build |
| `npm start` | Run production server |
| `npm run check` | Run Biome check and format |
| `npm run lint` | Run Biome linter |
| `npm run format` | Run Biome formatter |

## Coding Style

- **Indentation:** 2 spaces
- **Line width:** 100 characters max
- **Quotes:** Single quotes in JS/TS; double quotes in JSX
- **Semicolons:** Required
- **Trailing commas:** ES5 style
- **TypeScript:** Strict mode enabled
- **Path alias:** Use `@/*` to reference `src/` (e.g., `@/lib/api`)

## Testing

No test framework is currently configured. Validate changes manually using `npm run dev` and verify with `npm run check`.

## Commit Conventions

```
feat:    New feature
fix:     Bug fix
refactor: Code restructuring
update:  Minor changes
chore:   Tooling or configuration
```

## Pull Request Guidelines

- Title format: `type: short description`
- All Biome checks must pass (`npm run check`)
- Link related issues in the PR description
- Screenshots welcome for UI changes
