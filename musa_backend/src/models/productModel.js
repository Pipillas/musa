const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    codigo: { type: String, unique: true },
    bodega: { type: String },
    cepa: { type: String },
    nombre: { type: String },
    year: { type: String },
    origen: { type: String },
    venta: { type: String },
    cantidad: { type: Number },
    descripcion: { type: String },
    foto: { type: String },
    favorito: { type: Boolean },
    carrito: { type: Boolean },
    carritoCantidad: { type: Number, default: 1 },
    fecha: { type: String }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;