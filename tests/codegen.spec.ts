import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { ProductsPage } from '../pages/ProductsPage.js';
import type { TestProduct } from '../pages/TestProduct.js';

const CREDENTIALS = {
  username: process.env['QMS_USERNAME'] ?? 'connor.schmidt@gessnet.com',
  password: process.env['QMS_PASSWORD'] ?? 'Connor23!',
};

const PARENT_PRODUCT = 'Automated Regression Test';
const CATEGORY = 'Device Technologies *';
const DEVICE_TECHNOLOGY = 'PFS or Auto Injector (none software) - V3.0';
const LIFE_CYCLE = 'General Product Life Cycle';

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.gotoLoginPage();
  await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
  await expect(page).toHaveURL(/auto\.qmsgpt\.net/);
});

test('create minimal intended product', async ({ page }) => {
  const product: TestProduct = {
    name: 'Test Product 3',
    parentProduct: PARENT_PRODUCT,
    category: CATEGORY,
    deviceTechnology: DEVICE_TECHNOLOGY,
    lifeCycle: LIFE_CYCLE,
  };

  const productsPage = new ProductsPage(page);
  await productsPage.goto();
  const form = await productsPage.openIntendedProductForm();
  await form.createProduct(product);
});

test('create intended product with design controls and risk management', async ({ page }) => {
  const product: TestProduct = {
    name: 'Test Product 4',
    parentProduct: PARENT_PRODUCT,
    category: CATEGORY,
    deviceTechnology: DEVICE_TECHNOLOGY,
    lifeCycle: LIFE_CYCLE,
    enableDesignControls: true,
    modules: ['Risk Management'],
  };

  const productsPage = new ProductsPage(page);
  await productsPage.goto();
  const form = await productsPage.openIntendedProductForm();
  await form.createProduct(product);
});