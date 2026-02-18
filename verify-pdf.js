const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const pdfPath = path.join(__dirname, 'docs', 'UserManual.pdf');
  const stats = fs.statSync(pdfPath);
  console.log('PDF file size:', (stats.size / 1024).toFixed(1), 'KB');

  // Read raw PDF to check page count
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfText = pdfBuffer.toString('latin1');

  // Count pages by looking for /Type /Page entries
  const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
  console.log('Estimated page count:', pageMatches ? pageMatches.length : 'unknown');

  // Check for images
  const imageMatches = pdfText.match(/\/Subtype\s*\/Image/g);
  console.log('Embedded images:', imageMatches ? imageMatches.length : 0);

  // Take a screenshot of HTML for verification
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, 'docs', 'user-manual.html');
  await page.setViewport({ width: 800, height: 1100 });
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(__dirname, 'docs', 'screenshots', 'html-preview.png'), fullPage: false });
  console.log('HTML preview saved to screenshots/html-preview.png');
  await browser.close();
})();
