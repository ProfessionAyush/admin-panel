const puppeteer = require('puppeteer');
const path = require('path')

const genrateReport = async (req, res) => {
    try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${req.protocol}://${req.get('host')}`+"/registry-entry-report",{
        waitUntil:"networkidle2"
    });

    await page.setViewport({width : 1680, height:1050});
    const todayDate = new Date();
    const pdfn = await page.pdf({
        path:`${path.join(__dirname,'../public/files',todayDate.getTime()+".pdf")}`,
        printBackground:true,
        format:"A4"
    });

    await browser.close();   
     
    const pdfURL = path.join(__dirname,'../public/files',todayDate.getTime()+".pdf");

//   res.set({
//     "content-type":"application/pdf",
//     "content-length":pdfn.length
//   });

//   res.sendFile(pdfURL);



res.download(pdfURL, function(err){

if (err){
   console.log(err);

}

});

    } catch (error) {
        console.log(error);

    }
}


module.exports = {
genrateReport
}