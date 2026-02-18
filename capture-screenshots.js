const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'docs', 'screenshots');
const BASE_URL = 'http://localhost:8081';
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

// Test data to seed into the app
const TEST_USER_ID = 'testuser001';
const TEST_DB = {
  users: [{
    userId: TEST_USER_ID,
    name: 'Rafiq Ahmed',
    email: 'rafiq@example.com',
    birthdate: '1995-06-15T00:00:00.000Z',
    password: 'password123',
    createdAt: '2025-01-15T10:00:00.000Z',
  }],
  bankAccounts: [
    { accountId: 'acc001', userId: TEST_USER_ID, bankName: 'DBBL', createdAt: '2025-01-15T10:00:00.000Z' },
    { accountId: 'acc002', userId: TEST_USER_ID, bankName: 'Brac Bank', createdAt: '2025-01-15T10:00:00.000Z' },
    { accountId: 'acc003', userId: TEST_USER_ID, bankName: 'City Bank', createdAt: '2025-01-20T10:00:00.000Z' },
  ],
  transactions: [
    { transactionId: 'tx001', userId: TEST_USER_ID, accountId: 'acc001', type: 'Deposit', amount: '50000', reason: '', date: '2026-02-01T09:00:00.000Z', createdAt: '2026-02-01T09:00:00.000Z' },
    { transactionId: 'tx002', userId: TEST_USER_ID, accountId: 'acc002', type: 'Deposit', amount: '35000', reason: '', date: '2026-02-01T09:30:00.000Z', createdAt: '2026-02-01T09:30:00.000Z' },
    { transactionId: 'tx003', userId: TEST_USER_ID, accountId: 'acc001', type: 'Withdrawal', amount: '1500', reason: 'Groceries', date: '2026-02-03T12:00:00.000Z', createdAt: '2026-02-03T12:00:00.000Z' },
    { transactionId: 'tx004', userId: TEST_USER_ID, accountId: 'acc001', type: 'Withdrawal', amount: '800', reason: 'Transport', date: '2026-02-05T08:00:00.000Z', createdAt: '2026-02-05T08:00:00.000Z' },
    { transactionId: 'tx005', userId: TEST_USER_ID, accountId: 'acc002', type: 'Withdrawal', amount: '5000', reason: 'Shopping', date: '2026-02-07T14:00:00.000Z', createdAt: '2026-02-07T14:00:00.000Z' },
    { transactionId: 'tx006', userId: TEST_USER_ID, accountId: 'acc001', type: 'Deposit', amount: '20000', reason: '', date: '2026-02-10T10:00:00.000Z', createdAt: '2026-02-10T10:00:00.000Z' },
    { transactionId: 'tx007', userId: TEST_USER_ID, accountId: 'acc003', type: 'Deposit', amount: '15000', reason: '', date: '2026-02-10T11:00:00.000Z', createdAt: '2026-02-10T11:00:00.000Z' },
    { transactionId: 'tx008', userId: TEST_USER_ID, accountId: 'acc001', type: 'Withdrawal', amount: '2500', reason: 'Entertainment', date: '2026-02-12T19:00:00.000Z', createdAt: '2026-02-12T19:00:00.000Z' },
    { transactionId: 'tx009', userId: TEST_USER_ID, accountId: 'acc002', type: 'Withdrawal', amount: '3000', reason: 'Bills', date: '2026-02-13T10:00:00.000Z', createdAt: '2026-02-13T10:00:00.000Z' },
    { transactionId: 'tx010', userId: TEST_USER_ID, accountId: 'acc003', type: 'Withdrawal', amount: '1200', reason: 'Food', date: '2026-02-14T13:00:00.000Z', createdAt: '2026-02-14T13:00:00.000Z' },
  ],
  creditCards: [
    { cardId: 'cc001', userId: TEST_USER_ID, bankName: 'DBBL Visa', billGenerationDay: 5, lastPaymentDay: 25, createdAt: '2025-01-15T10:00:00.000Z' },
    { cardId: 'cc002', userId: TEST_USER_ID, bankName: 'Brac Mastercard', billGenerationDay: 10, lastPaymentDay: 28, createdAt: '2025-02-01T10:00:00.000Z' },
  ],
  creditCardBills: [
    { billId: 'bill001', cardId: 'cc001', billMonth: '2026-01', billAmount: '8500', status: 'Paid', createdAt: '2026-01-05T10:00:00.000Z' },
    { billId: 'bill002', cardId: 'cc001', billMonth: '2026-02', billAmount: '12000', status: 'Pending', createdAt: '2026-02-05T10:00:00.000Z' },
    { billId: 'bill003', cardId: 'cc002', billMonth: '2026-01', billAmount: '4500', status: 'Paid', createdAt: '2026-01-10T10:00:00.000Z' },
    { billId: 'bill004', cardId: 'cc002', billMonth: '2026-02', billAmount: '7800', status: 'Pending', createdAt: '2026-02-10T10:00:00.000Z' },
  ],
  pendingItems: [
    { pendingId: 'pi001', userId: TEST_USER_ID, title: 'Rent Payment', amount: '15000', dueDate: '2026-02-28T00:00:00.000Z', description: 'Monthly apartment rent', status: 'Pending', createdAt: '2026-02-01T10:00:00.000Z' },
    { pendingId: 'pi002', userId: TEST_USER_ID, title: 'Internet Bill', amount: '1200', dueDate: '2026-02-20T00:00:00.000Z', description: 'Monthly broadband bill', status: 'Pending', createdAt: '2026-02-01T10:00:00.000Z' },
    { pendingId: 'pi003', userId: TEST_USER_ID, title: 'Gym Membership', amount: '3000', dueDate: '2026-02-10T00:00:00.000Z', description: 'Quarterly gym fees', status: 'Overdue', createdAt: '2026-01-15T10:00:00.000Z' },
    { pendingId: 'pi004', userId: TEST_USER_ID, title: 'Phone Bill', amount: '800', dueDate: '2026-01-25T00:00:00.000Z', description: '', status: 'Completed', createdAt: '2026-01-01T10:00:00.000Z' },
  ],
};

const TEST_CURRENT_USER = {
  userId: TEST_USER_ID,
  name: 'Rafiq Ahmed',
  email: 'rafiq@example.com',
  birthdate: '1995-06-15T00:00:00.000Z',
  password: 'password123',
  createdAt: '2025-01-15T10:00:00.000Z',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  Captured: ${name}.png`);
}

async function waitForAppLoad(page) {
  // Wait for app to fully render (look for any visible text content)
  await sleep(3000);
  // Extra wait for React to hydrate and render
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid]') !== null ||
           document.body.innerText.length > 50;
  }, { timeout: 15000 }).catch(() => {});
  await sleep(1000);
}

async function clickByText(page, text) {
  await page.evaluate((searchText) => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() === searchText) {
        let el = node.parentElement;
        // Walk up to find a clickable ancestor
        while (el && el.tagName !== 'BODY') {
          const role = el.getAttribute('role');
          const cursor = window.getComputedStyle(el).cursor;
          if (role === 'button' || el.tagName === 'BUTTON' || el.tagName === 'A' ||
              el.onclick || cursor === 'pointer' ||
              el.getAttribute('tabindex') !== null) {
            el.click();
            return true;
          }
          el = el.parentElement;
        }
        // If no clickable ancestor, click the text node's parent
        node.parentElement.click();
        return true;
      }
    }
    return false;
  }, text);
  await sleep(2000);
}

async function clickByPartialText(page, text) {
  await page.evaluate((searchText) => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().includes(searchText)) {
        let el = node.parentElement;
        while (el && el.tagName !== 'BODY') {
          const role = el.getAttribute('role');
          const cursor = window.getComputedStyle(el).cursor;
          if (role === 'button' || el.tagName === 'BUTTON' || el.tagName === 'A' ||
              el.onclick || cursor === 'pointer' ||
              el.getAttribute('tabindex') !== null) {
            el.click();
            return true;
          }
          el = el.parentElement;
        }
        node.parentElement.click();
        return true;
      }
    }
    return false;
  }, text);
  await sleep(2000);
}

async function setInputValue(page, placeholder, value) {
  await page.evaluate((ph, val) => {
    const inputs = document.querySelectorAll('input, textarea');
    for (const input of inputs) {
      if (input.placeholder && input.placeholder.includes(ph)) {
        // React Native Web uses custom event handling
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }, placeholder, value);
  await sleep(500);
}

async function ensureOnApp(page) {
  const url = page.url();
  if (!url.startsWith(BASE_URL)) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
  }
}

async function seedDatabase(page) {
  await ensureOnApp(page);
  await page.evaluate((db, user) => {
    localStorage.setItem('finance_db', JSON.stringify(db));
    localStorage.setItem('current_user', JSON.stringify(user));
  }, TEST_DB, TEST_CURRENT_USER);
}

async function clearAuth(page) {
  await ensureOnApp(page);
  await page.evaluate(() => {
    localStorage.removeItem('current_user');
  });
}

async function dismissNotificationModal(page) {
  // Try to dismiss the notification modal that auto-opens
  await sleep(1500);
  // Click the Dismiss button
  const dismissed = await clickByText(page, 'Dismiss');
  await sleep(1000);
  // If Dismiss didn't work, try the X button
  if (!dismissed) {
    await clickByText(page, 'X');
    await sleep(1000);
  }
  // Also try clicking the X by coordinates (top-right of modal)
  await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent?.trim();
      if (text === 'X' || text === 'x' || text === '✕') {
        const rect = el.getBoundingClientRect();
        if (rect.right > 300 && rect.top > 300) {
          el.click();
          return true;
        }
      }
    }
    return false;
  });
  await sleep(1000);
}

async function loadAuthenticatedScreen(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await seedDatabase(page);
  await page.reload({ waitUntil: 'networkidle2' });
  await waitForAppLoad(page);
  await sleep(1500);
  // Dismiss the notification modal that auto-opens
  await dismissNotificationModal(page);
}

async function main() {
  console.log('=== PersonalFinanceManager Screenshot Capture ===\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();

  try {
    // ====== PHASE 1: AUTH SCREENS (unauthenticated) ======
    console.log('Phase 1: Capturing auth screens...');

    // Navigate to the app
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await clearAuth(page);
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForAppLoad(page);

    // 1. Login Screen
    await screenshot(page, '01-login');

    // 2. Sign Up Screen - navigate by clicking
    await clickByText(page, 'Sign Up');
    await sleep(1500);
    await screenshot(page, '02-signup-step1');

    // Go back to login for Reset Password
    await clickByText(page, 'Back');
    await sleep(1000);

    // If back didn't work, try the back arrow or navigate directly
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await clearAuth(page);
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForAppLoad(page);

    // 3. Reset Password Screen
    await clickByPartialText(page, 'Forgot Password');
    await sleep(1500);
    await screenshot(page, '03-reset-password');

    // ====== PHASE 2: MAIN SCREENS (authenticated) ======
    console.log('\nPhase 2: Capturing main screens...');

    // 4. Dashboard Screen - first capture WITH notification modal
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await seedDatabase(page);
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForAppLoad(page);
    await sleep(2000);
    // Capture the notification modal (it auto-opens)
    await screenshot(page, '04-notifications');

    // Now dismiss the modal and capture clean dashboard
    await dismissNotificationModal(page);
    await sleep(1000);
    await screenshot(page, '05-dashboard');

    // Scroll dashboard to see more content
    await page.evaluate(() => {
      const scrollables = document.querySelectorAll('[style*="overflow"]');
      scrollables.forEach(el => {
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = 400;
        }
      });
      document.documentElement.scrollTop = 400;
      document.body.scrollTop = 400;
    });
    await sleep(1000);
    await screenshot(page, '06-dashboard-scrolled');

    // 7. Deposit Screen - fresh load then click the green "+ Deposit" button
    await loadAuthenticatedScreen(page);
    await clickByText(page, '+ Deposit');
    await sleep(2000);
    await screenshot(page, '07-deposit');

    // 8. Withdrawal Screen - fresh load then click the red "- Cost" button
    await loadAuthenticatedScreen(page);
    await clickByText(page, '- Cost');
    await sleep(2000);
    await screenshot(page, '08-withdrawal');

    // 9. Transactions Screen - fresh load then click tab
    await loadAuthenticatedScreen(page);
    await clickByText(page, 'Transactions');
    await sleep(2000);
    await screenshot(page, '09-transactions');

    // 10. Credit Cards Screen - fresh load then click tab
    await loadAuthenticatedScreen(page);
    await clickByText(page, 'Credit Cards');
    await sleep(2000);
    await screenshot(page, '10-credit-cards');

    // 11. Pending Items Screen - click the Pending tab at the bottom
    await loadAuthenticatedScreen(page);
    // Click the Pending tab by targeting the bottom navigation area
    await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.trim();
        if (text === 'Pending') {
          const rect = el.getBoundingClientRect();
          // Bottom tabs are near the bottom of the viewport (y > 750)
          if (rect.top > 750) {
            let parent = el.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const role = parent.getAttribute('role');
              if (role === 'button' || role === 'tab' || parent.getAttribute('tabindex') !== null) {
                parent.click();
                return true;
              }
              parent = parent.parentElement;
            }
            el.click();
            return true;
          }
        }
      }
      return false;
    });
    await sleep(2000);
    await screenshot(page, '11-pending-items');

    // 12. Profile Screen - fresh load then click profile area
    await loadAuthenticatedScreen(page);
    // Click on the profile picture/avatar area (the "R" circle in top-left)
    await page.evaluate(() => {
      // Find elements near the top-left that look like a profile avatar
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        // Look for a circular element near the top-left
        if (rect.top < 80 && rect.left < 120 && rect.width > 30 && rect.width < 80 &&
            (style.borderRadius.includes('50') || style.borderRadius.includes('25') ||
             parseInt(style.borderRadius) >= 20)) {
          el.click();
          return true;
        }
      }
      // Fallback: look for the text "R" in a small element near the top
      for (const el of allElements) {
        const text = el.textContent?.trim();
        if (text === 'R') {
          const rect = el.getBoundingClientRect();
          if (rect.top < 100 && rect.left < 120 && rect.width < 60) {
            // Click the parent to get the touchable
            let parent = el.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const role = parent.getAttribute('role');
              if (role === 'button' || parent.getAttribute('tabindex') !== null) {
                parent.click();
                return true;
              }
              parent = parent.parentElement;
            }
            el.click();
            return true;
          }
        }
      }
      return false;
    });
    await sleep(2000);
    await screenshot(page, '12-profile');

    console.log('\n=== Screenshot capture complete! ===');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('Error during capture:', error.message);
    // Take a debug screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'debug-error.png') });
    console.log('Debug screenshot saved.');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
