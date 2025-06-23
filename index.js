function email_generator() {
  let token = "";
  for (i = 1; i <= 2; i++) {
    const r1 = Math.random().toString(36).substring(2, 12);
    token += r1;
  }
  const email = token + "@gmail.com";
  const years = Math.floor(Math.random() * 43) + 18;
  return [email, years];
}

const { chromium } = require("playwright");
const fs = require("fs");

async function createAccount() {
  let gmail = email_generator();
  let email = gmail[0];
  let age = gmail[1];
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ]
  });

  // executablePath: "/home/pgx/.cache/ms-playwright/chromium-1169/chrome-linux/chrome

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
    locale: "es-ES",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  console.log(" [+] Ingresando a Deezer");
  await page.goto("https://account.deezer.com/es-es/signup", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  console.log(" [+] Ahora estas en Deezer");

  await page.waitForSelector('button:has-text("Aceptar")', {
    state: "visible",
  });
  await page.click('button:has-text("Aceptar")');
  await page.waitForTimeout(1000);

  await page.fill('input[name="email"]', `${email}`);
  console.log(` [+] Correo introducido con exito`);
  await page.press('input[name="email"]', "Enter");
  await page.waitForSelector('input[name="password"]', { state: "visible" });
  await page.fill('input[name="password"]', "Chmod777..");
  console.log(` [+] Clave introducido con exito`);
  await page.press('input[name="password"]', "Enter");
  await page.waitForSelector('input[name="age"]', { state: "visible" });
  await page.fill('input[name="age"]', `${age}`);
  await page.press('input[name="age"]', "Enter");
  console.log(` [+] Edad cargada con exito`);
  await page.selectOption('select[name="identity"]', "M");
  await page.click('[data-testid="continue-button"]');
  console.log(" [+] Presionastes boton de registrar");
  let arlFound = false;
  let attempts = 0;
  const maxAttempts = 120;

  while (!arlFound && attempts < maxAttempts) {
    const cookies = await page.context().cookies();
    const arlCookie = cookies.find((cookie) => cookie.name === "arl");

    if (arlCookie) {
      console.log(" [+] ARL encontrado:", arlCookie.value);
      let text = `Correo => ${email}\nClave: Chmod777..\nARL: ${arlCookie.value}\n\n`;
      fs.appendFileSync("deezer_account.txt", text);
      arlFound = true;
      break;
    }
    attempts++;
    await page.waitForTimeout(1000);
  }
  if (!arlFound) {
    console.log(" [-] No se encontro el ARL despues de 120 segundos");
    const error = await page.$(".error-message");
    if (error) {
      console.log(" [!] Error:", await error.textContent());
    }
  }
  await browser.close();
}

(async () => {
  let number = 1;
  while (true) {
    console.log(`\n === Intento #${number} ===`);

    const result = await createAccount();
    if (result) return true;

    number++;

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
})();
