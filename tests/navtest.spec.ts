import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { ProductsPage } from '../pages/ProductsPage.js';

// test('should have the correct title', async ({ page }) => {
//     await page.goto('https://srv.myqmspace.com/signin');
//     await expect(page).toHaveTitle('QMSpace - Sign In');
// });

test('login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login('taskcreator@email.fake', 'QMSpace123!');
    await expect(page).toHaveURL(/auto\.qmsgpt\.net/);
    await expect(page).toHaveURL(/home|products/);
});


// test('select product', async ({ page }) => {
//     const productsPage = new ProductsPage(page);
//     await productsPage.selectProduct('Regression Test Product 1');
//     await expect(page).toHaveURL('https://srv.myqmspace.com/products/318799c5-0187-4a6b-a390-eb11de0288b2/318799c5-0187-0187-a390-eb11de0288b2/');
// });