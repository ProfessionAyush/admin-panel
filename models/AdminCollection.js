const mongoose = require('mongoose');

// Define the main schema
const adminCollectionSchema = new mongoose.Schema({
  site: { type: String, required: true },
  dateOfRegistration: { type: Date, required: true },
  area: { type: Number, required: true },
  rate: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  registryExpenses: { type: Number, required: true },
  developmentExpenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }], // Reference to Expense documents
  incomeTaxExpenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }]    // Reference to Expense documents
});
const AdminCollection = mongoose.model('AdminCollection', adminCollectionSchema);

module.exports = AdminCollection;
