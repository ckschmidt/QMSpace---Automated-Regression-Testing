Playwright Test Generation Standards

When converting recorded Playwright tests into maintainable automated tests:

Use TypeScript.
Follow existing project conventions, folder structure, and coding patterns.
Separate page objects and reusable components into /pages and test files into /tests.
Create clean, reusable, and maintainable page methods.
Prefer parameterized methods over one-method-per-control when appropriate.
Group related controls into reusable page components.
Extract common navigation and shared functionality into reusable components.
Use reusable locators and prefer data-testid selectors where available.
Avoid generating page objects that contain only a single action unless reused across multiple tests.
Include meaningful assertions and infer basic UI assertions where appropriate.
Include comments where business rules are being validated.
Follow Playwright best practices.
Generate scalable, maintainable code suitable for large regression suites.

When existing Page Objects exist, extend them rather than creating duplicates.
When existing test patterns exist, follow those patterns.