const mongoose = require('mongoose');

const registryEntrySchema = new mongoose.Schema({
  gataNo: { type: Number, required: true },
  site: { type: String, required: true }, // Store site name directly
  dateOfRegistration: { type: Date, required: true },
  seller: { type: String, required: true },
  purchaser: { type: String, required: true },
  mobileNo: { type: String, required: true },
  area: { type: Number, required: true },
  rate: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
 
  groupCommision: { type: Number, required: true },
  balanceAmount: { type: Number, required: true }, // totalAmount - groupCommision
  mediator: { type: String, required: true },
  mediatorCommision: { type: Number, required: true },
  balanceGroupCommisionAmount: { type: Number, required: true }, // groupCommision - mediatorCommision
  imageUrl: [{ type: String }], // Array to store image URLs
  govValue: { type: Number, required: true },
   marketingValue: { type: Number, required: true }, 
   plotNumber: { type: Number } // Optional


});

const RegistryEntry = mongoose.model('RegistryEntry', registryEntrySchema);

module.exports = RegistryEntry;
