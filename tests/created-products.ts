import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TestInfo } from '@playwright/test';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory where intended-product.spec.ts persists the exact names of the
 * Intended Products it creates. Lives under the gitignored
 * `playwright/.auth/` tree alongside the auth `storageState` file so the
 * files are never committed and are wiped cleanly with the rest of the
 * test artifacts.
 */
const PRODUCTS_DIR = path.resolve(dir, '..', 'playwright', '.auth');

/**
 * Suffix the playwright.config.ts product-creation projects append to each
 * browser's name (e.g. `chromium-products`). Stripped by [[browserKey]] so
 * the producer (`${browser}-products`) and any consumer (`${browser}`)
 * agree on the same per-browser identifier — that identifier keys the
 * state-file filename and the prefix baked into each product's name.
 */
const PRODUCTS_PROJECT_SUFFIX = '-products';

/**
 * Reduces a Playwright project name to its underlying browser identifier.
 *
 * The project structure in playwright.config.ts splits each browser into a
 * `${browser}-products` phase (creates baseline products) and a `${browser}`
 * phase (everything else, depends on the products phase). Both phases must
 * address the same persisted state, so both must funnel project names
 * through this helper before keying into the state file.
 *
 * Non-browser projects (`setup`) are returned unchanged — they don't
 * create or consume product state, so they should never call
 * [[recordCreatedProduct]] / [[getCreatedProduct]] anyway.
 */
export function browserKey(projectName: string): string {
  return projectName.endsWith(PRODUCTS_PROJECT_SUFFIX)
    ? projectName.slice(0, -PRODUCTS_PROJECT_SUFFIX.length)
    : projectName;
}

/**
 * Discriminates the kinds of Intended Products created by
 * tests/intended-product.spec.ts. Downstream specs reference a created
 * product by its kind so they don't need to know its `Date.now()`-suffixed
 * name.
 *
 * - `simple` — the "without batch" product (one Create modal, no tasks).
 * - `batch`  — the "with batch" product (Create + batch-task sub-flow).
 *
 * The delete test creates a transient product and removes it, so nothing
 * is persisted for that flow.
 */
export type ProductKind = 'simple' | 'batch';

type CreatedProductsFile = Partial<Record<ProductKind, string>>;

function statePath(browser: string): string {
  return path.join(PRODUCTS_DIR, `products-${browser}.json`);
}

function readState(filePath: string): CreatedProductsFile {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CreatedProductsFile;
}

/**
 * Persists `name` as the known created product of `kind` for the browser
 * the current test is running under. Read-modify-write merges into any
 * existing file so the `simple` and `batch` entries coexist in a single
 * per-browser JSON document.
 *
 * Safe to call from any test in intended-product.spec.ts — the
 * `${browser}-products` project runs its tests serially (the spec sets
 * `mode: 'serial'` in its describe block) so there is no concurrent
 * writer racing this read-modify-write.
 */
export function recordCreatedProduct(
  testInfo: TestInfo,
  kind: ProductKind,
  name: string,
): void {
  const browser = browserKey(testInfo.project.name);
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  const filePath = statePath(browser);
  const state = readState(filePath);
  state[kind] = name;
  fs.writeFileSync(filePath, JSON.stringify(state));
}

/**
 * Reads the persisted name of the `kind` product for the browser the
 * current test is running under. Throws with an actionable message if
 * either the state file or the requested kind is missing — both signal
 * that the upstream `${browser}-products` project failed or hasn't run,
 * which the project dependencies in playwright.config.ts normally prevent
 * but can happen during ad-hoc filtered runs.
 *
 * Use this from any spec that needs to address a product created by
 * intended-product.spec.ts. Example:
 *
 * ```ts
 * const name = getCreatedProduct(testInfo, 'batch');
 * await productsPage.openProduct(name);
 * ```
 */
export function getCreatedProduct(
  testInfo: TestInfo,
  kind: ProductKind,
): string {
  const browser = browserKey(testInfo.project.name);
  const filePath = statePath(browser);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No created-products state for browser "${browser}" at ${filePath}. ` +
        `Run the "${browser}-products" project first (it persists product names).`,
    );
  }
  const state = readState(filePath);
  const name = state[kind];
  if (name === undefined) {
    throw new Error(
      `No "${kind}" product recorded for browser "${browser}". ` +
        `Check that tests/intended-product.spec.ts persists a "${kind}" product for this project.`,
    );
  }
  return name;
}
