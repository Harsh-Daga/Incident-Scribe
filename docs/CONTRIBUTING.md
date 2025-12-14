# Contributing to IncidentScribe AI

First off, thank you for considering contributing to IncidentScribe AI! It's people like you that make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity, gender identity
- Level of experience, education, socio-economic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When submitting a bug report, include:**

1. **Clear title** - Describe the issue concisely
2. **Steps to reproduce** - Detailed steps to reproduce the behavior
3. **Expected behavior** - What you expected to happen
4. **Actual behavior** - What actually happened
5. **Screenshots** - If applicable, add screenshots
6. **Environment**:
   - OS: [e.g., macOS 14.0]
   - Browser: [e.g., Chrome 120]
   - Node version: [e.g., 20.10.0]
   - Next.js version: [e.g., 16.0.10]
7. **Additional context** - Any other relevant information

**Bug Report Template:**

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Screenshots
[If applicable]

## Environment
- OS:
- Browser:
- Node version:
- Next.js version:

## Additional Context
[Any other context]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting an enhancement, include:**

1. **Clear title** - Use a descriptive title
2. **Use case** - Explain the problem this enhancement solves
3. **Proposed solution** - Describe your proposed solution
4. **Alternatives** - Other solutions you've considered
5. **Additional context** - Screenshots, mockups, examples

### Pull Requests

We actively welcome your pull requests!

**Good first issues:**
- Look for issues labeled `good first issue`
- Documentation improvements
- Adding tests
- Fixing typos
- Improving error messages

---

## Development Setup

### Prerequisites

- **Node.js** 20.0 or higher
- **Docker** & Docker Compose
- **Git**
- **Supabase Account** (free tier works)
- **Google Gemini API Key** (free tier available)

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Incident-Scribe.git
cd incident-scribe

# Add upstream remote
git remote add upstream https://github.com/Harsh-Daga/Incident-Scribe.git
```

### 2. Setup Database

Follow the [SETUP.md](./SETUP.md) guide to configure Supabase.

### 3. Configure Environment

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

### 4. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# CLI (if contributing to CLI)
cd ../cli
npm install
```

### 5. Start Development Server

```bash
# Terminal 1: Start Kestra
docker compose up -d

# Terminal 2: Start Next.js
cd frontend
npm run dev
```

Visit http://localhost:3000

### 6. Create a Branch

```bash
# Always create a new branch for your changes
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-123
```

---

## Pull Request Process

### 1. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 2. Test Your Changes

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint --fix

# Test manually
# - Test the feature works as expected
# - Test edge cases
# - Test on different screen sizes (if UI change)
```

### 3. Commit Your Changes

We use **Conventional Commits** for commit messages:

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(dashboard): add incident severity filter"
git commit -m "fix(api): correct organization isolation bug"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(auth): simplify middleware logic"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 5. Open a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template (see below)
5. Submit the pull request

**Pull Request Template:**

```markdown
## Description
[Clear description of what this PR does]

## Related Issue
Fixes #[issue number]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
[Describe the tests you ran]

## Checklist
- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have tested my changes thoroughly
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
[Add screenshots]
```

### 6. Code Review

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged

---

## Code Standards

### TypeScript

All new code must be TypeScript. No JavaScript files.

```typescript
// ✅ Good - Explicit types
interface Incident {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: string
}

export async function getIncident(id: string): Promise<Incident | null> {
  // ...
}

// ❌ Bad - Using `any`
export async function getIncident(id: any): Promise<any> {
  // ...
}
```

### Naming Conventions

```typescript
// Components - PascalCase
export default function IncidentCard() {}

// Functions - camelCase
export async function getIncidents() {}

// Constants - UPPER_SNAKE_CASE
const MAX_RETRIES = 3

// Types/Interfaces - PascalCase
interface UserProfile {}
type IncidentStatus = 'open' | 'closed'

// Files - kebab-case
// incident-detail.tsx
// api-client.ts
```

### Code Organization

```typescript
// Order: imports, types, component/function, exports

// 1. React/Next imports
import { useState } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. Third-party imports
import { createClient } from '@supabase/supabase-js'

// 3. Local imports - types
import type { Incident } from '@/types/incident'

// 4. Local imports - components/utilities
import { getIncidents } from '@/lib/supabase-queries'
import IncidentCard from '@/components/IncidentCard'

// 5. Types/Interfaces
interface Props {
  incidents: Incident[]
}

// 6. Component/Function
export default function Dashboard({ incidents }: Props) {
  // ...
}
```

### ESLint

We use ESLint with strict rules:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint --fix
```

Common rules:
- No unused variables
- Prefer `const` over `let`
- No `any` types
- Explicit return types for functions
- No console.log in production code (use proper logging)

### Formatting

We don't enforce a formatter (Prettier), but prefer:
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line objects/arrays

---

## Testing Guidelines

### Manual Testing

Currently, we rely on manual testing. When testing:

1. **Test the happy path** - Normal usage
2. **Test edge cases** - Empty data, max values, etc.
3. **Test error handling** - Invalid input, network errors
4. **Test permissions** - Different user roles
5. **Test organization isolation** - Users can't access other orgs' data

### Example Test Scenarios

**New Feature: Add incident filtering by date**

- [ ] Filter shows incidents within date range
- [ ] Filter works with no results
- [ ] Filter persists across page reloads
- [ ] Filter UI is accessible (keyboard navigation)
- [ ] Filter works on mobile
- [ ] Filter respects organization isolation

### Future: Automated Tests

We plan to add:
- Unit tests (Jest)
- Integration tests (Playwright)
- E2E tests (Playwright)

If you'd like to contribute tests, please open an issue first to discuss the approach.

---

## Documentation

### When to Update Docs

Update documentation when you:
- Add a new feature
- Change existing behavior
- Add new API endpoints
- Modify environment variables
- Change deployment process

### Documentation Files

- **README.md** - Main project overview
- **docs/SETUP.md** - Installation and setup
- **docs/API.md** - API endpoints
- **docs/ARCHITECTURE.md** - System design
- **docs/DEPLOYMENT.md** - Deployment guide
- **docs/SECURITY.md** - Security model
- **docs/CLI.md** - CLI usage
- **docs/KESTRA.md** - Kestra workflows
- **docs/WEBHOOKS.md** - Webhook integration

### Code Comments

```typescript
// ✅ Good - Explains WHY, not WHAT
// Use service role key to bypass RLS for webhook ingestion
const supabase = createClient(url, serviceRoleKey)

// ❌ Bad - Obvious from code
// Create supabase client
const supabase = createClient(url, serviceRoleKey)

// ✅ Good - Complex logic explained
/**
 * Normalizes incident payloads from different monitoring platforms.
 *
 * Datadog uses 'priority', PagerDuty uses 'urgency', we map both
 * to our standard 'severity' field with values: LOW, MEDIUM, HIGH, CRITICAL
 */
function normalizeSeverity(payload: any, source: string): Severity {
  // ...
}
```

---

## Community

### Communication Channels

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas, show & tell
- **Pull Requests** - Code contributions

### Getting Help

**Stuck on something?**

1. Check existing [documentation](../README.md)
2. Search [GitHub Issues](https://github.com/Harsh-Daga/Incident-Scribe/issues)
3. Ask in [GitHub Discussions](https://github.com/Harsh-Daga/Incident-Scribe/discussions)
4. Reach out to maintainers

### Maintainers

- **Harsh Daga** - [@Harsh-Daga](https://github.com/Harsh-Daga)

---

## Recognition

Contributors will be recognized in:
- **README.md** - Contributors section
- **Release notes** - Feature credits
- **GitHub** - Contributor badge

---

## Questions?

Don't hesitate to ask questions! We're here to help.

**Thank you for contributing to IncidentScribe AI!** 🎉
