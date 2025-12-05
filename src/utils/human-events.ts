import { Page } from "playwright";

export async function moveMouseHuman(page: Page, x: number, y: number, clickOffset: boolean = true) {
  let finalX = x;
  let finalY = y;

  if (clickOffset) {
    const offsetRangeX = 5;
    const offsetRangeY = 3;
    finalX += (Math.random() - 0.5) * offsetRangeX * 2;
    finalY += (Math.random() - 0.5) * offsetRangeY * 2;
  }

  const steps = Math.floor(Math.random() * 10) + 15;
  const currentX = Math.random() * 200;
  const currentY = Math.random() * 200;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const nx = currentX + (finalX - currentX) * easeProgress;
    const ny = currentY + (finalY - currentY) * easeProgress;
    await page.mouse.move(nx, ny);
    await page.waitForTimeout(Math.random() * 15 + 5);
  }
}

export async function scrollHuman(page: Page) {
  const scrollAmount = Math.floor(Math.random() * 250) + 100;
  await page.evaluate((amount) => {
    window.scrollBy({
      top: amount,
      behavior: "smooth",
    });
  }, scrollAmount);
  await page.waitForTimeout(Math.random() * 500 + 300);
}

export async function waitForRecaptcha(page: Page, timeout: number = 15000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const response = document.getElementById("g-recaptcha-response-100000") as HTMLTextAreaElement;
        return response && response.value && response.value.length > 0;
      },
      { timeout }
    );
    return true;
  } catch (error) {
    return false;
  }
}

export async function simulateHumanActivity(page: Page) {
  for (let i = 0; i < 2; i++) {
    const x = Math.random() * 600 + 100;
    const y = Math.random() * 300 + 100;
    await page.mouse.move(x, y);
    await page.waitForTimeout(Math.random() * 500 + 300);
  }

  await page.evaluate(() => {
    window.scrollTo({
      top: Math.random() * 200,
      behavior: "smooth",
    });
  });
  await page.waitForTimeout(Math.random() * 800 + 500);
}
