const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
  console.log('=== Generating User Manual PDF ===\n');

  const htmlPath = path.join(__dirname, 'docs', 'user-manual.html');
  const pdfPath = path.join(__dirname, 'docs', 'UserManual.pdf');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the HTML file
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  console.log(`Loading: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for images to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // Don't fail on broken images
        }))
    );
  });

  console.log('Generating PDF...');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '18mm',
      bottom: '25mm',
      left: '18mm',
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%; text-align:center; font-size:9px; color:#999; padding:0 20mm;">
        <span>Personal Finance Manager &mdash; User Manual</span>
        <span style="float:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  console.log(`\nPDF generated successfully!`);
  console.log(`Output: ${pdfPath}`);

  await browser.close();
}

generatePDF().catch(console.error);
