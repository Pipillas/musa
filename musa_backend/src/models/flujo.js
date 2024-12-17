const mongoose = require("mongoose");

const Flujo = new mongoose.Schema(
  {
    fecha: { type: String },
    fechaPago: { type: String },
    nombre: { type: String },
    importe: { type: String },
    beneficiario: { type: String },
    descripcion: { type: String },
    filePath: { type: String },
  },
  { timestamps: true }
);

const Product = mongoose.model("Flujo", Flujo);

module.exports = Product;
