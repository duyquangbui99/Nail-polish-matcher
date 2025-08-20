# Coding Pattern Preferences

## General Principles
- Always prefer simple solutions
- Keep the codebase clean and organized
- Avoid code duplication - check for existing similar functionality in the codebase
- Write environment-aware code (dev, test, prod)

## Code Organization
- Keep files under 200-300 lines of code
- Refactor when files exceed the recommended size
- Avoid writing one-off scripts in files

## Change Management
- Only make well-understood changes that are directly related to the request
- When fixing issues:
  - Exhaust existing implementation options before introducing new patterns/technologies
  - Remove old implementations when introducing new ones to avoid duplicate logic

## Environment & Data Handling
- Mock data should only be used in tests
- No stubbing or fake data patterns in dev or prod environments
- Never modify .env files without explicit confirmation

## File Size Guidelines
- Maximum file size: 300 lines
- Recommended refactoring threshold: 200 lines 