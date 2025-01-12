const mongoose = require('mongoose');

// Define the expense schema
const expenseSchema = new mongoose.Schema({
  adminCollection: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminCollection', required: true },
  type: { type: String, enum: ['development', 'incomeTax'], required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true }
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
