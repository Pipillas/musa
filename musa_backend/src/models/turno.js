const mongoose = require('mongoose');

const turno = new mongoose.Schema({
    fecha: { type: String },
    turno: { type: String },
    nombre: { type: String },
    cantidad: { type: Number },
    observaciones: { type: String },
}, { timestamps: true });

const Turno = mongoose.model('Turno', turno);

module.exports = Turno;