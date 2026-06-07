/**
 * Path where the `setup` project persists the authenticated browser context
 * (cookies + localStorage). Kept in a standalone module so both
 * playwright.config.ts and tests/auth.setup.ts can import it without the
 * config indirectly triggering the setup file's top-level `setup(...)` call.
 */
export const STORAGE_STATE = 'playwright/.auth/user.json';
