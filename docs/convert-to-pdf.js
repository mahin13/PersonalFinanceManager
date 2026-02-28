const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'user-manual.html');
  const fileUrl = 'file:///' + htmlPath.split('\\').join('/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.resolve(__dirname, 'user-manual.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '25mm', left: '18mm', right: '18mm' }
  });
  await browser.close();
  console.log('PDF created successfully at docs/user-manual.pdf');
})();
