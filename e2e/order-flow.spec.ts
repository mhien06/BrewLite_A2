import { test, expect } from '@playwright/test';

test.describe('E2E Customer Journey: Menu -> Cart -> Checkout -> Place Order -> Confirmation', () => {
  test('Complete purchase flow through web interface', async ({ page }) => {
    // Intercept payment creation để không chuyển hướng sang cổng sandbox bên thứ 3 trong bài test E2E UI
    await page.route('**/orders/*/payments', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 9999,
          paymentMethod: 'VNPAY',
          paymentStatus: 'PENDING',
          paymentUrl: null,
        }),
      });
    });

    // 1. Khách hàng truy cập trang chủ và khám phá Menu
    await page.goto('/');
    await expect(page).toHaveTitle(/BrewLite/i);

    // Cuộn xuống khu vực thực đơn và đợi sản phẩm hiển thị
    const menuSection = page.locator('#menu');
    await menuSection.scrollIntoViewIfNeeded();
    const firstProductCard = page.locator('.product-card').first();
    await expect(firstProductCard).toBeVisible({ timeout: 10000 });

    const productName = await firstProductCard.locator('h3').innerText();
    expect(productName.length).toBeGreaterThan(0);

    // 2. Nhấp vào xem chi tiết sản phẩm
    await firstProductCard.locator('a.image-link').click();
    await page.waitForURL(/\/products\/\d+/);
    await expect(page.locator('h1')).toHaveText(productName);

    // 3. Chọn tùy chọn và thêm vào giỏ hàng
    const addToCartButton = page.locator('button.add-cart');
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();
    await expect(page.locator('.added-message')).toBeVisible({ timeout: 5000 });

    // 4. Di chuyển vào trang Giỏ hàng (Cart)
    const viewCartLink = page.locator('a[href="/cart"]').first();
    await viewCartLink.click();
    await page.waitForURL('/cart');
    await expect(page.locator('.cart-item')).toBeVisible({ timeout: 5000 });

    // 5. Bấm tiến hành Đặt hàng (Checkout)
    const checkoutLink = page.locator('a[href="/checkout"]').first();
    await checkoutLink.click();
    await page.waitForURL('/checkout');

    // 6. Kiểm tra yêu cầu Đăng nhập và thực hiện Đăng ký tài khoản mới
    const loginPrompt = page.locator('.empty-cart h1');
    if (await loginPrompt.isVisible()) {
      await expect(loginPrompt).toHaveText('Đăng nhập để đặt hàng');
      const registerLink = page.locator('a[href*="/register"]');
      await registerLink.click();
      await page.waitForURL(/\/register/);

      // Điền thông tin đăng ký
      const uniqueEmail = `playwright_e2e_${Date.now()}@example.com`;
      await page.fill('input[placeholder="Nguyễn Văn A"]', 'Nguyễn E2E Playwright');
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[placeholder="Tối thiểu 8 ký tự"]', 'StrongPass123!');
      await page.fill('input[placeholder="Nhập lại mật khẩu"]', 'StrongPass123!');

      // Submit đăng ký
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('/checkout', { timeout: 10000 });
    }

    // 7. Tại trang Checkout: Kiểm tra thông tin giỏ và tiến hành Đặt hàng
    await expect(page.locator('.checkout-panel')).toBeVisible({ timeout: 10000 });
    const placeOrderButton = page.locator('button:has-text("Đặt hàng và thanh toán VNPay")');
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // 8. Kiểm tra màn hình Xác nhận đơn hàng (Order Received)
    const successHeading = page.locator('.checkout-success h1');
    await expect(successHeading).toBeVisible({ timeout: 15000 });
    await expect(successHeading).toContainText('Đã tạo đơn');

    // Kiểm tra có mã đơn hàng hợp lệ
    const confirmationText = page.locator('.checkout-success p strong').first();
    await expect(confirmationText).toBeVisible();
    const orderIdText = await confirmationText.innerText();
    expect(orderIdText).toMatch(/#\d+/);

    // Kiểm tra payment panel hiển thị
    await expect(page.locator('.payment-panel, .state-box')).toBeVisible();
  });
});
