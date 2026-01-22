import { Page } from "playwright";

interface MouseMovementConfig {
  steps?: number;
  minDelay?: number;
  maxDelay?: number;
  offsetX?: number;
  offsetY?: number;
}

/**
 * Moves the mouse cursor in a human-like manner to the specified coordinates
 * @param {Page} page - Playwright page instance
 * @param {number} x - Target X coordinate
 * @param {number} y - Target Y coordinate
 * @param {MouseMovementConfig} config - Configuration options
 */
export async function moveMouseHuman(
  page: Page,
  x: number,
  y: number,
  config: MouseMovementConfig = {}
): Promise<void> {
  const { steps = Math.floor(Math.random() * 10) + 15, minDelay = 5, maxDelay = 20, offsetX = 5, offsetY = 3 } = config;

  const finalX = x + (Math.random() - 0.5) * offsetX * 2;
  const finalY = y + (Math.random() - 0.5) * offsetY * 2;

  const currentX = Math.random() * 200;
  const currentY = Math.random() * 200;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const nx = currentX + (finalX - currentX) * easeProgress;
    const ny = currentY + (finalY - currentY) * easeProgress;
    await page.mouse.move(nx, ny);
    await page.waitForTimeout(Math.random() * (maxDelay - minDelay) + minDelay);
  }
}

/**
 * Configuration for human-like scrolling
 */
interface ScrollConfig {
  minAmount?: number;
  maxAmount?: number;
  minDelay?: number;
  maxDelay?: number;
}

/**
 * Scrolls the page in a human-like manner
 * @param {Page} page - Playwright page instance
 * @param {ScrollConfig} config - Configuration options
 */
export async function scrollHuman(page: Page, config: ScrollConfig = {}): Promise<void> {
  const { minAmount = 100, maxAmount = 350, minDelay = 300, maxDelay = 800 } = config;

  const scrollAmount = Math.floor(Math.random() * (maxAmount - minAmount)) + minAmount;
  await page.evaluate((amount) => {
    window.scrollBy({
      top: amount,
      behavior: "smooth",
    });
  }, scrollAmount);
  await page.waitForTimeout(Math.random() * (maxDelay - minDelay) + minDelay);
}

/**
 * Result of reCAPTCHA wait operation
 */
export interface RecaptchaResult {
  success: boolean;
  timedOut: boolean;
}

/**
 * Waits for reCAPTCHA to be solved
 * @param {Page} page - Playwright page instance
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<RecaptchaResult>} Result indicating if reCAPTCHA was solved
 */
export async function waitForRecaptcha(page: Page, timeout: number = 15000): Promise<RecaptchaResult> {
  try {
    await page.waitForFunction(
      () => {
        const response = document.getElementById("g-recaptcha-response-100000") as HTMLTextAreaElement;
        return response && response.value && response.value.length > 0;
      },
      { timeout }
    );
    return { success: true, timedOut: false };
  } catch (error) {
    return { success: false, timedOut: true };
  }
}

/**
 * Configuration for simulating human activity
 */
interface HumanActivityConfig {
  movements?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  minDelay?: number;
  maxDelay?: number;
  scrollAmount?: number;
}

/**
 * Simulates random human-like activity on the page (mouse movements and scrolling)
 * @param {Page} page - Playwright page instance
 * @param {HumanActivityConfig} config - Configuration options
 */
export async function simulateHumanActivity(page: Page, config: HumanActivityConfig = {}): Promise<void> {
  const {
    movements = 2,
    minX = 100,
    maxX = 700,
    minY = 100,
    maxY = 400,
    minDelay = 300,
    maxDelay = 800,
    scrollAmount = 200,
  } = config;

  for (let i = 0; i < movements; i++) {
    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    await page.mouse.move(x, y);
    await page.waitForTimeout(Math.random() * (maxDelay - minDelay) + minDelay);
  }

  await page.evaluate((amount) => {
    window.scrollTo({
      top: Math.random() * amount,
      behavior: "smooth",
    });
  }, scrollAmount);
  await page.waitForTimeout(Math.random() * (maxDelay - minDelay) + minDelay);
}
