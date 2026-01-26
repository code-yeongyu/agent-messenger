# Contributing to Agent Slack

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-slack.git
cd agent-slack

# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build
```

## Running Tests

We follow TDD (Test-Driven Development):

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/commands/message.test.ts

# Watch mode
bun test --watch
```

## Code Style

We use Biome for linting and formatting:

```bash
# Check code style
bun run lint

# Format code
bun run format
```

## Commit Conventions

Follow conventional commits:

- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `docs: description` - Documentation changes
- `test(scope): description` - Test changes
- `chore: description` - Build/tooling changes

Examples:
```
feat(message): add message send command
fix(auth): handle missing credentials gracefully
docs: update README with new examples
test(channel): add channel list tests
```

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests first (TDD)
3. Implement the feature
4. Ensure all tests pass
5. Run lint and fix any issues
6. Submit PR with clear description

## Project Structure

```
src/
  commands/       # CLI command handlers
  lib/            # Core library code
  types/          # TypeScript type definitions
  utils/          # Utility functions
tests/            # Test files (mirror src/)
skills/           # AI agent skills directory
```

## Testing Guidelines

- Write tests FIRST (TDD)
- Mock SlackClient in command tests
- Use descriptive test names
- Follow BDD style (Given-When-Then)
- Aim for high coverage

## Questions?

Open an issue or start a discussion!
