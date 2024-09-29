const mongoose = require('mongoose');

const venta = new mongoose.Schema({
    productos: { type: Array },
    tipoFactura: { type: String },
    numeroFactura: { type: String },
    stringNumeroFactura: { type: String },
    cuit: { type: String },
    monto: { type: Number },
    formaPago: { type: String },
    domicilio: { type: String },
    nombre: { type: String },
    razonSocial: { type: String },
    localidad: { type: String },
    provincia: { type: String },
    notaCredito: { type: Boolean },
    fecha: { type: String },
    idTurno: { type: String },
    descuento: { type: Number }
}, { timestamps: true });

const Product = mongoose.model('Venta', venta);

module.exports = Product;