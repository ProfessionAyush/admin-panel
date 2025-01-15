const express = require('express');
const router = express.Router();
const path = require('path');
const passport = require('passport');
const localStrategy = require('passport-local');
const Admin = require('../models/admin');
const AdminCollection = require('../models/AdminCollection');
const RegistryEntry = require('../models/RegistryEntry');
const userController = require('../Controller/userController');
const Expense = require('../models/Expense');
const upload = require('../middleware/multer');
const report = require('../Controller/reportController');

passport.use(new localStrategy(Admin.authenticate()));

// Register Page
router.get('/register', (req, res) => res.render('register'));

// Register Handle
router.post('/register', isAdmin, function (req, res) {
  const { username, fullname } = req.body;
  const adminData = new Admin({ username, fullname });
  Admin.register(adminData, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect('/dashboard');
      });
    })
    .catch(err => {
      console.error(err);
      res.redirect('/register');
    });
});

// Login Page
router.get('/', (req, res) => res.render('login'));

// Login Handle
router.post('/', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
router.get('/logout', function (req, res) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Dashboard Page
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const adminCollections = await AdminCollection.find().populate('developmentExpenses incomeTaxExpenses').exec();
    const registryEntries = await RegistryEntry.find().exec();
    const sitesWithDetails = [];
    for (const site of adminCollections) {
      const siteEntries = registryEntries.filter(entry => entry.site === site.site);
      const totalPlots = siteEntries.length;
      const totalAreaSold = siteEntries.reduce((acc, entry) => acc + entry.area, 0);
      const availableArea = site.area - totalAreaSold;
     const totalBalanceAmount = siteEntries.reduce((acc, entry) => acc + entry.balanceAmount, 0);
      const totalSellingAmount = totalBalanceAmount + (availableArea * site.rate);
      const totalExpenses = site.registryExpenses + site.developmentExpenses.reduce((acc, expense) => acc + expense.amount, 0) + site.incomeTaxExpenses.reduce((acc, expense) => acc + expense.amount, 0);
      const totalPurchaseAmount = site.totalAmount + totalExpenses;
      const profit = totalSellingAmount - totalPurchaseAmount;
       sitesWithDetails.push({
        site: site.site,
        totalArea: site.area,
        rate: site.rate,
        expenses: site.developmentExpenses.concat(site.incomeTaxExpenses),
        totalPurchaseAmount,
        totalPlots,
        availableArea,
        totalAreaSold,
        totalSellingAmount,
        profit
      });

    } res.render('dashboard', { sites: sitesWithDetails });
  } catch (err) {
    console.error(err); res.status(500).send('Server Error');
  }
});

// Fetch Site Details for Collection Detail Page 
router.get('/site-details/:siteName', isAdmin, async (req, res) => {
  try {
    const siteName = req.params.siteName
      ; const site = await AdminCollection.findOne({ site: siteName }).populate('developmentExpenses incomeTaxExpenses').exec();
    const siteEntries = await RegistryEntry.find({ site: siteName }).exec();
    if (!site) {
      return res.status(404).send('Site not found');

    }
    const totalPlots = siteEntries.length;
    const totalAreaSold = siteEntries.reduce((acc, entry) => acc + entry.area, 0);
    const availableArea = site.area - totalAreaSold;
      const totalBalanceAmount = siteEntries.reduce((acc, entry) => acc + entry.balanceAmount, 0);
      const totalsiteArea = siteEntries.reduce((acc, entry) => acc + entry.area, 0);
    const totalSellingAmount = totalBalanceAmount + (availableArea * site.rate);
    const totalExpenses = site.registryExpenses + site.developmentExpenses.reduce((acc, expense) => acc + expense.amount, 0) + site.incomeTaxExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    const totalPurchaseAmount = site.totalAmount + totalExpenses;
    const profit = totalSellingAmount - totalPurchaseAmount;
    const totalGovValue = siteEntries.reduce((acc, entry) => acc + entry.govValue, 0);
    const totalAmount = siteEntries.reduce((acc, entry) => acc + entry.totalAmount, 0);
    const totalMarketingValue = siteEntries.reduce((acc, entry) => acc + entry.marketingValue, 0);
    const totalGroupCommision = siteEntries.reduce((acc, entry) => acc + entry.groupCommision, 0);
    const siteDetails = {
      site: site.site,
      totalArea: site.area,
      rate: site.rate,
       expenses: site.developmentExpenses.concat(site.incomeTaxExpenses),
      totalPurchaseAmount,
      totalAreaSold,
      totalPlots,
      availableArea,
      totalSellingAmount,
      profit,
     
      registryEntries: siteEntries,
      totalGovValue,
      totalMarketingValue,
      totalAmount,

      totalsiteArea,
      totalGroupCommision,
      totalBalanceAmount
    }; res.render('collection-detail', { siteDetails });
  } catch (err) {
    console.error(err); res.status(500).send('Server Error');
  }
});

// Fetch Admin Collection Data (With Search Functionality) 
router.get('/admin-collection', isAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.search;
    // Get the search query from the URL
    let results;
    if (!searchQuery || searchQuery.trim() === '') {
      // If no search query, fetch all records
      results = await AdminCollection.find().populate('developmentExpenses').populate('incomeTaxExpenses');
    } else {
      // If search query exists, use regex to filter results
      results = await AdminCollection.find({
        "$or": [{
          "site": { $regex: searchQuery, $options: 'i' }
        }
          // Search in the 'site' field 
        ]
      }).populate('developmentExpenses').populate('incomeTaxExpenses');
    } res.render('admin-collection', { data: results });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Fetch Registry Entry Data
router.get('/registry-entry', isAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate; let filter = {};
    if (searchQuery) {
      filter["$or"] = [
        { "site": { $regex: searchQuery, $options: 'i' } },
        { "seller": { $regex: searchQuery, $options: 'i' } },
        { "purchaser": { $regex: searchQuery, $options: 'i' } },
        { "mobileNo": { $regex: searchQuery, $options: 'i' } },
      ];
    } if (startDate && endDate) {
      filter.dateOfRegistration = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } const results = await RegistryEntry.find(filter).sort({ dateOfRegistration: -1 });
    res.render('registry-entry', {
      data: results
    });
  } catch (err) {
    console.error(err); res.status(500).send('Server Error');
  }
});

// Edit Admin Collection Data Page
router.get('/edit-admin-collection/:id', isAdmin, async (req, res) => {
  try {
    const adminCollection = await AdminCollection.findById(req.params.id).populate('developmentExpenses').populate('incomeTaxExpenses');
    res.render('edit-admin-collection', {
      data: adminCollection,
      admin: req.user
    });
  } catch (err) {
    res.status(500).send('Error retrieving admin collection data for editing');
  }
});




// Edit Registry Entry Data Page 
router.get('/edit-registry-entry/:id', isAdmin, async (req, res) => {
  try {
    const entry = await RegistryEntry.findById(req.params.id);
    res.render('edit-registry-entry', { entry });
  } catch (err) {
    res.status(500).send('Error retrieving registry entry for editing');
  }
});

// Edit Admin Page 
router.get('/edit-admin/:id', isAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    res.render('edit-admin', {
      admin,
      admin: req.user
    });
  }
  catch (err) {
    res.status(500).send('Error retrieving admin data for editing');
  }
});

router.get('/settings', isAdmin, async (req, res) => {
  try {
    const admins = await Admin.find();
    res.render('settings', {
      admins, admin: req.user
    });
  } catch (err) {
    res.status(500).send('Error retrieving admin data');
  }
});
// Add Images Page 
router.get('/add-images/:id', isAdmin, async (req, res) => {
  try {
    const entry = await RegistryEntry.findById(req.params.id);
    res.render('add-images', { entry });
  } catch (err) {
    res.status(500).send('Error retrieving registry entry for adding images');
  }
});

router.get('/add-data', isAdmin, (req, res) => res.render('add-data'));

// Add Registry Entry Page 
router.get('/add-registry-entry', isAdmin, async (req, res) => {
  try {
    const adminCollections = await AdminCollection.find();
    res.render('add-registry-entry', { adminCollections });
  } catch (err) {
    res.status(500).send('Error retrieving admin collections');
  }
});


router.get('/add-expense/:id', isAdmin, async (req, res) => {
  try {
    const adminCollection = await AdminCollection.findById(req.params.id);
    res.render('add-expense', {
      data: adminCollection,
      admin: req.user
    });
  } catch (err) {
    res.status(500).send('Error retrieving admin collection data for expense addition');
  }
});





// add opration start from here 

// Handle Add Images 
router.post('/add-images/:id', isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const entryId = req.params.id;
    // Handle image uploads 
    const imageUrls = req.files.map(file => file.filename);
    // Update the registry entry with the new images
    await RegistryEntry.findByIdAndUpdate(entryId, { $push: { imageUrl: { $each: imageUrls } } });
    req.flash('success_msg', 'Images added successfully');
    res.redirect('/registry-entry');
  } catch (err) {
    req.flash('error_msg', 'Error adding images');
    res.status(500).send('Error adding images');
  }
});


// Handle Add Data
router.post('/add-data', isAdmin, async (req, res) => {
  try {
    const { site, dateOfRegistration, area, rate, registryExpenses } = req.body;
    const totalAmount = area * rate;

    const newEntry = new AdminCollection({
      site,
      dateOfRegistration: new Date(dateOfRegistration),
      area: parseFloat(area),
      rate: parseFloat(rate),
      totalAmount,
      registryExpenses: parseFloat(registryExpenses)
    });

    await newEntry.save();
    req.flash('success_msg', 'Data added successfully');
    res.redirect('/admin-collection');
  } catch (err) {
    req.flash('error_msg', 'Error adding data');
    res.status(500).send('Error adding data');
  }
});



/// Handle Add Registry Entry 
router.post('/add-registry-entry', isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { gataNo, site, seller, purchaser, mobileNo, area, rate, groupCommision, mediator, mediatorCommision, dateOfRegistration, govValue, marketingValue, plotNumber } = req.body;
    const totalAmount = area * rate; const balanceAmount = totalAmount - groupCommision;
    const balanceGroupCommisionAmount = groupCommision - mediatorCommision;
    // Handle image uploads
    const imageUrls = req.files.map(file => file.filename);
    const newEntry = new RegistryEntry({
      gataNo: parseFloat(gataNo),
      site,
      seller,
      purchaser,
      mobileNo,
      area: parseFloat(area),
      rate: parseFloat(rate),
      totalAmount,
      groupCommision: parseFloat(groupCommision),
      balanceAmount,
      mediator,
      mediatorCommision: parseFloat(mediatorCommision),
      balanceGroupCommisionAmount,
      govValue: parseFloat(govValue),
      marketingValue: parseFloat(marketingValue),
      plotNumber: plotNumber ? parseFloat(plotNumber) : undefined,
      imageUrl: imageUrls,// Store image filenames
      dateOfRegistration: new Date(dateOfRegistration)
    });
    await newEntry.save();
    req.flash('success_msg', 'Registry entry added successfully');
    res.redirect('/registry-entry');
  } catch (err) {
    req.flash('error_msg', 'Error adding registry entry');
    res.status(500).send('Error adding registry entry');
    console.log(err)
  }
});



// Handle Add Expense
router.post('/add-expense/:id', isAdmin, async (req, res) => {
  const { type, date, amount } = req.body;

  try {
    const newExpense = await Expense.create({
      adminCollection: req.params.id,
      type,
      date: new Date(date),
      amount: parseFloat(amount)
    });

    const update = type === 'development'
      ? { $push: { developmentExpenses: newExpense._id } }
      : { $push: { incomeTaxExpenses: newExpense._id } };

    await AdminCollection.updateOne({ _id: req.params.id }, update);

    req.flash('success_msg', 'Expense added successfully');
    res.redirect('/admin-collection');
  } catch (err) {
    req.flash('error_msg', 'Error adding expense');
    res.redirect('/admin-collection');
  }
});






// Handle Edit Admin Collection Data 
router.post('/edit-admin-collection/:id', isAdmin, async (req, res) => {
  const { site, dateOfRegistration, area, rate, registryExpenses, developmentExpenses, incomeTaxExpenses } = req.body;
  const totalAmount = area * rate; try {
    // Update the AdminCollection document 
    const adminCollection = await AdminCollection.findByIdAndUpdate(req.params.id, {
      site,
      dateOfRegistration: new Date(dateOfRegistration),
      area: parseFloat(area),
      rate: parseFloat(rate),
      totalAmount,
      registryExpenses: parseFloat(registryExpenses)
    }, { new: true });
    // Update or create development expenses 
    if (developmentExpenses) {
      for (const [id, expense] of Object.entries(developmentExpenses)) {
        if (id === 'new') {
          // Create new development expenses 
          await Expense.create({
            adminCollection: adminCollection._id,
            type: 'development',
            date: new Date(expense.date),
            amount: parseFloat(expense.amount)
          });
        } else {
          // Update existing development expenses 
          await Expense.findByIdAndUpdate(id, {
            date: new Date(expense.date),
            amount: parseFloat(expense.amount)
          });
        }
      }
    } // Update or create income tax expenses
    if (incomeTaxExpenses) {
      for (const [id, expense] of Object.entries(incomeTaxExpenses)) {
        if (id === 'new') {
          // Create new income tax expenses 
          await Expense.create({
            adminCollection: adminCollection._id,
            type: 'incomeTax',
            date: new Date(expense.date),
            amount: parseFloat(expense.amount)
          });
        } else {
          // Update existing income tax expenses 
          await Expense.findByIdAndUpdate(id, {
            date: new Date(expense.date),
            amount: parseFloat(expense.amount)
          });
        }
      }
    } req.flash('success_msg', 'Data updated successfully');
    res.redirect('/admin-collection');
  } catch (err) {
    req.flash('error_msg', 'Error updating data');
    res.redirect('/admin-collection');
  }
});




// Handle Edit Admin 
router.post('/edit-admin/:id', isAdmin, async (req, res) => {
  const { username, fullname, password } = req.body;
  try {
    const admin = await Admin.findById(req.params.id);
    admin.username = username;
    admin.fullname = fullname;
    if (password) {
      admin.setPassword(password, function (err) {
        if (err) {
          res.status(500).send('Error updating password');
        } else {
          admin.save();
        }
      });
    } else {
      admin.save();
    } res.redirect('/settings');
  } catch (err) {
    res.status(500).send('Error updating admin data');
  }
});

// Handle Edit Registry Entry Data
router.post('/edit-registry-entry/:id', isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { gataNo, site, seller, purchaser, mobileNo, area, rate, groupCommision, mediator, mediatorCommision, dateOfRegistration, govValue, marketingValue, plotNumber } = req.body;
    const totalAmount = area * rate; const balanceAmount = totalAmount - groupCommision;
    const balanceGroupCommisionAmount = groupCommision - mediatorCommision;

    // Handle new image uploads 
    const newImageUrls = req.files.map(file => file.filename);
    const updateData = {
      gataNo: parseFloat(gataNo),
      site,
      seller,
      purchaser,
      mobileNo,
      area: parseFloat(area),
      rate: parseFloat(rate),
      totalAmount,
      groupCommision: parseFloat(groupCommision),
      balanceAmount,
      mediator,
      mediatorCommision: parseFloat(mediatorCommision),
      balanceGroupCommisionAmount,
      govValue: parseFloat(govValue),
      marketingValue: parseFloat(marketingValue),
      plotNumber: plotNumber ? parseFloat(plotNumber) : undefined,
      dateOfRegistration: new Date(dateOfRegistration)

    }; if (newImageUrls.length > 0) {
      updateData.$push = { imageUrl: { $each: newImageUrls } };
    } await RegistryEntry.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success_msg', 'Registry entry updated successfully');
    res.redirect('/registry-entry');
  } catch (err) {
    req.flash('error_msg', 'Error updating registry entry');
    res.status(500).send('Error updating registry entry');
  }
});


// Delete Admin Collection Data 
router.post('/delete-admin-collection/:id', isAdmin, async (req, res) => {
  try {
    await AdminCollection.findByIdAndDelete(req.params.id);
    res.redirect('/admin-collection');
  } catch (err) {
    res.status(500).send('Error deleting admin collection data');
  }
});


// Delete Registry Entry Data
router.post('/delete-registry-entry/:id', isAdmin, async (req, res) => {
  try {
    await RegistryEntry.findByIdAndDelete(req.params.id);
    res.redirect('/registry-entry');
  } catch (err) {
    res.status(500).send('Error deleting admin collection data');
  }
});

// Delete Admin 
router.post('/delete-admin/:id', isAdmin, async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id); res.redirect('/settings');
  } catch (err) {
    res.status(500).send('Error deleting admin data');

  }
});


// Handle Remove Image
router.post('/remove-image/:id', isAdmin, async (req, res) => {
  try {
    const { image } = req.body;
    await RegistryEntry.findByIdAndUpdate(req.params.id,
      { $pull: { imageUrl: image } });
    req.flash('success_msg', 'Image removed successfully');
    res.redirect(`/edit-registry-entry/${req.params.id}`);
  } catch (err) {
    req.flash('error_msg', 'Error removing image');
    res.status(500).send('Error removing image');
  }
});


// pdf section coding start from here  



// Route for Registry Entry Report Page
// Route for Registry Entry Report Page 
router.get('/registry-entry-report', async (req, res) => {
  try {
    const searchQuery = req.query.search;

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let filter = {};
    if (searchQuery) {
      filter["$or"] = [
        { "site": { $regex: searchQuery, $options: 'i' } },
        { "seller": { $regex: searchQuery, $options: 'i' } },
        { "purchaser": { $regex: searchQuery, $options: 'i' } },
        { "mobileNo": { $regex: searchQuery, $options: 'i' } },
      ];
    } if (startDate && endDate) {
      filter.dateOfRegistration = {
        $gte: new Date(startDate), $lte: new Date(endDate)
      };
    } const results = await RegistryEntry.find(filter).sort({ dateOfRegistration: -1 });

    // Calculate total values 
    const totalValues = results.reduce((totals, entry) => {
      totals.totalGroupCommision += entry.groupCommision;
      totals.totalArea += entry.area;
      totals.totalAmount += entry.totalAmount;
       totals.totalBalanceAmount += entry.balanceAmount;
      totals.totalGovValue += entry.govValue;
      totals.totalMarketingValue += entry.marketingValue;
       totals.totalMediatorCommision += entry.mediatorCommision; 
       totals.totalBalanceGroupCommisionAmount += entry.balanceGroupCommisionAmount; 
       return totals;
    }, {
      totalGroupCommision: 0,
      totalArea: 0,
      totalAmount: 0,
      totalBalanceAmount: 0,
      totalGovValue: 0,
      totalMarketingValue: 0,
      totalMediatorCommision: 0,
      totalBalanceGroupCommisionAmount: 0

    });
     res.render('registry-entry-report', {
      data: results,
      totalGroupCommision: totalValues.totalGroupCommision,
      totalArea: totalValues.totalArea,
      totalAmount: totalValues.totalAmount,
      totalBalanceAmount: totalValues.totalBalanceAmount,
      totalGovValue: totalValues.totalGovValue,
      totalMarketingValue: totalValues.totalMarketingValue,
      totalMediatorCommision: totalValues.totalMediatorCommision,
      totalBalanceGroupCommisionAmount: totalValues.totalBalanceGroupCommisionAmount,
      isPDF: false
    });
  } catch (err) {
    console.error(err); res.status(500).send('Server Error');
  }
});

// Route for PDF generation
router.get('/generate-report', isAdmin, report.generateReport);


// Generate Site Report

router.get('/generate-site-report', isAdmin, report.generateSiteReport);



// Registry Entry Details Page 
router.get('/registry-entry/details/:id', isAdmin, async (req, res) => {
  try {
    const entry = await RegistryEntry.findById(req.params.id);

    // Render the page with a PDF-friendly layout if isPDF=true
    res.render('registry-entry-details', {
      entry,
      isPDF: req.query.isPDF === 'true',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving registry entry details');
  }
});

// Route to generate PDF for registry entry details
router.get('/registry-entry/details/:id/download-pdf', isAdmin, report.generateDetailsPDF);


// Middleware to check admin authentication
function isAdmin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}
module.exports = router;
