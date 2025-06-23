const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");

// Función generadora de emails (la misma que tenías)
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

// Función para crear cuenta Deezer (modificada para retornar el ARL o null)
async function createDeezerAccount() {
  let browser;
  try {
    let gmail = email_generator();
    let email = gmail[0];
    let age = gmail[1];

    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

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
        // Guardamos la cuenta en el archivo
        let text = `Correo => ${email}\nClave: Chmod777..\nARL: ${arlCookie.value}\n\n`;
        fs.appendFileSync("deezer_account.txt", text);

        await browser.close();
        return {
          email: email,
          password: "Chmod777..",
          arl: arlCookie.value,
          age: age,
          status: "success",
        };
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
    return null;
  } catch (error) {
    console.error(" [!] Error durante la creación de cuenta:", error);
    if (browser) await browser.close();
    return null;
  }
}

// Configuración de Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Endpoint para obtener un ARL
app.get("/api/arl", async (req, res) => {
  let attempts = 0;
  const maxAttempts = 5; // Máximo de intentos por petición

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n === Intento #${attempts} ===`);

    const result = await createDeezerAccount();

    if (result) {
      return res.json({
        success: true,
        data: result,
        attempts: attempts,
      });
    }

    // Esperar 3 segundos entre intentos
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Si llegamos aquí es que todos los intentos fallaron
  res.status(500).json({
    success: false,
    message: "No se pudo generar un ARL después de varios intentos",
    attempts: attempts,
  });
});

// Endpoint para obtener múltiples ARLs
app.get("/api/arls/:count", async (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 1, 10); // Máximo 10 ARLs por petición
  const results = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`\n === ARL ${i + 1}/${count} - Intento #${attempts} ===`);

      const result = await createDeezerAccount();

      if (result) {
        results.push(result);
        success = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    if (!success) {
      return res.status(500).json({
        success: false,
        message: `Error al generar el ARL #${i + 1} después de varios intentos`,
        generated: results,
        total_requested: count,
      });
    }
  }

  res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send(
    "API para generación de ARLs de Deezer. Use /api/arl para obtener un ARL."
  );
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en http://localhost:${PORT}`);
});
