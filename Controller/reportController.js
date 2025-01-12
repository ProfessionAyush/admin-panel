const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const generateReport = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    // Log the received query parameters
    console.log('Received Query Parameters:', { search, startDate, endDate });
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set cookies for session-based authentication
    const cookies = req.headers.cookie
      ? req.headers.cookie.split('; ').map((c) => {
        const [name, value] = c.split('=');
        return { name, value, domain: req.get('host').split(':')[0] };
      })
      : [];
    await page.setCookie(...cookies);

    // Navigate to the report page with filters and isPDF=true
    const reportUrl = `${req.protocol}://${req.get('host')}/registry-entry-report?search=${encodeURIComponent(
      search || ''
    )}&startDate=${encodeURIComponent(
      startDate || ''
    )}&endDate=${encodeURIComponent(endDate || '')}&isPDF=true`;

    await page.goto(reportUrl, { waitUntil: 'networkidle2' });

    // Set viewport and generate PDF
    await page.setViewport({ width: 1680, height: 1050 });
    const fileName = `${Date.now()}-report.pdf`;
    const pdfPath = path.join(__dirname, '../public/files', fileName);

    await page.pdf({
      path: pdfPath,
      printBackground: true,
      format: 'A3', // Adjusted for larger tables
      landscape: true, // Horizontal layout
      scale: 0.8, // Scale down content
    });

    await browser.close();

    // Send the file to the client
    res.download(pdfPath, function (err) {
      if (err) {
        console.log(err);
      } else {
        // Delete the file after download
        fs.unlink(pdfPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting file:', unlinkErr);
          } else {
            console.log('File deleted successfully');
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error generating report');
  }
};





const generateSiteReport = async (req, res) => {
  try {
    const siteName = req.query.siteName; const browser = await puppeteer.launch();
    const page = await browser.newPage(); // Navigate to the collection-detail page for the site

    // Get session cookies from the request 
    const cookies = req.headers.cookie.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return { name, value, domain: req.hostname };

    });

    // Set cookies in Puppeteer page 
    await page.setCookie(...cookies);

    await page.goto(`${req.protocol}://${req.get('host')}/site-details/${siteName}`, { waitUntil: 'networkidle2', });
    await page.setViewport({ width: 1680, height: 1050 });
    const todayDate = new Date();
    const pdfPath = path.join(__dirname, '../public/files', `${todayDate.getTime()}.pdf`);
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      format: 'A4',
    }); await browser.close();
    res.download(pdfPath, function (err) {
      if (err) { console.log(err); }
    });
  } catch (error) {
    console.log(error); res.status(500).send('Error generating report');
  }
};

const generateDetailsPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Log the received ID for debugging
    console.log('Received Entry ID:', id);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set cookies for session-based authentication
    const cookies = req.headers.cookie
      ? req.headers.cookie.split('; ').map((c) => {
        const [name, value] = c.split('=');
        return { name, value, domain: req.get('host').split(':')[0] };
      })
      : [];
    await page.setCookie(...cookies);

    // Navigate to the details page with isPDF=true
    const detailsUrl = `${req.protocol}://${req.get('host')}/registry-entry/details/${id}?isPDF=true`;
    console.log('Navigating to URL:', detailsUrl);

    await page.goto(detailsUrl, { waitUntil: 'networkidle2' });

    // Set viewport and generate PDF
    await page.setViewport({ width: 1680, height: 1050 });
    const fileName = `${Date.now()}-details.pdf`;
    const pdfPath = path.join(__dirname, '../public/files', fileName);

    await page.pdf({
      path: pdfPath,
      printBackground: true,
      format: 'A3', // Adjusted for larger tables
      landscape: true, // Horizontal layout
      scale: 0.8, // Scale down content
    });

    await browser.close();

    // Send the file to the client
    res.download(pdfPath, function (err) {
      if (err) {
        console.error(err);
      } else {
        // Delete the file after download
        fs.unlink(pdfPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting file:', unlinkErr);
          } else {
            console.log('File deleted successfully');
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
};

module.exports = {
  generateReport,
  generateSiteReport,
  generateDetailsPDF,
};
