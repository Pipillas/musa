const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const Product = require('./models/productModel');
const Venta = require('./models/venta');
const Operacion = require('./models/operacion');
const Turno = require('./models/turno');

const AfipService = require('./AfipService');
const afipService = new AfipService({ CUIT: 20418588897 });

const PDFDocument = require("pdfkit");
const qr = require("qr-image");
const { print } = require("pdf-to-printer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Cambia esto al origen de tu cliente
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Conectar a MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/inventario')
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// Configuración de CORS para Express
app.use(cors({
    origin: '*', // Cambia esto al origen de tu cliente
    methods: ['GET', 'POST'],
    credentials: true
}));

// Configuración de multer para almacenar los archivos en la carpeta 'uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para servir los archivos estáticos de la carpeta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Sirviendo la carpeta 'uploads' de forma estática
app.use('/uploads', express.static('uploads'));

app.use('/facturas', express.static('src/facturas'));

// Servir la aplicación principal (index.html) para cualquier ruta
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.post('/upload', upload.single('foto'), async (req, res) => {
    const formData = req.body;
    const file = req.file;
    try {
        if (formData._id) {
            // Buscar el producto existente
            const existingProduct = await Product.findById(formData._id);
            if (!existingProduct) {
                return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
            };
            const product = {
                codigo: formData.codigo,
                bodega: formData.bodega,
                cepa: formData.cepa,
                nombre: formData.nombre,
                year: formData.year,
                origen: formData.origen,
                costo: formData.costo,
                venta: formData.venta,
                cantidad: formData.cantidad,
                descripcion: formData.descripcion,
                foto: file ? file.path : existingProduct.foto,
            }
            await Product.findByIdAndUpdate(formData._id, product);
        } else {
            const newProduct = new Product({
                codigo: formData.codigo,
                bodega: formData.bodega,
                cepa: formData.cepa,
                nombre: formData.nombre,
                year: formData.year,
                origen: formData.origen,
                costo: formData.costo,
                venta: formData.venta,
                cantidad: formData.cantidad,
                descripcion: formData.descripcion,
                foto: file ? file.path : '' // Usar una cadena vacía si no hay archivo
            });
            try {
                await newProduct.save();
            } catch (error) {
                res.json({ status: 'error', message: 'Codigo ya existe' });
                return;
            }
        }
        res.json({ status: 'ok', message: 'Producto guardado y notificado a los clientes' });
        io.emit('cambios');
        // Emitir un evento a todos los clientes conectados con el nuevo producto
    } catch (error) {
        console.error('Error al guardar el producto:', error);
        res.status(500).json({ status: 'error', message: 'Error al guardar el producto' });
    }
});

async function imprimirTicket(data) {
    const doc = new PDFDocument({ size: "A7", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    let stringNumeroComprobante = `0000${data.puntoDeVenta.toString()}-` + data.numeroComprobante.toString().padStart(8, "0");
    if (data.notaCredito) {
        doc.pipe(fs.createWriteStream(path.join(__dirname, 'notas_de_credito', `${stringNumeroComprobante}.pdf`)));
    } else {
        doc.pipe(fs.createWriteStream(path.join(__dirname, 'facturas', `${stringNumeroComprobante}.pdf`)));
    }
    doc.fontSize(12);
    doc.font("Courier-Bold");
    doc.fontSize(25);
    doc.text("MUSA PALERMO", { align: "center" });
    doc.fontSize(12);
    doc.font("Courier");
    doc.text("---------------------------", { align: "center" });
    doc.text("Valentin Greco", { align: "center" });
    doc.text("CUIT e IIBB: 20-41858889-7", { align: "center" });
    doc.text("DIRECCIÓN: ARAOZ 2785", { align: "center" });
    doc.text("IVA RESP. INSCRIPTO", { align: "center" });
    doc.text("---------------------------", { align: "center" });
    if (data.factura === 'A') {
        if (data.notaCredito) {
            doc.text("NOTA DE CREDITO A", { align: "center" });
        } else {
            doc.text("FACTURA A", { align: "center" });
        }
        doc.text("---------------------------", { align: "center" });
        doc.text(`NRO. COMP: ${stringNumeroComprobante}`, { align: "center" });
        doc.text(
            `FECHA: ${new Date().toLocaleDateString()} ${new Date().getHours().toString().padStart(2, "0")}:${new Date()
                .getMinutes()
                .toString()
                .padStart(2, "0")}:${new Date().getSeconds().toString().padStart(2, "0")}`
            , { align: 'center' });
        doc.text("---------------------------", { align: "center" });
        doc.text(data.razonSocial, { align: "left" });
        doc.text(`CUIT: ${data.cuit}`, { align: "left" });
        doc.text(`RESPONSABLE INSCRIPTO`, { align: "left" });
        doc.text(`${data.direccion}`, { align: "left" });
        doc.text(`${data.localidad}`, { align: "left" });
        doc.text(`${data.provincia}`, { align: "left" });
    }
    if (data.factura === 'B') {
        if (data.notaCredito) {
            doc.text("NOTA DE CREDITO B", { align: "center" });
        } else {
            doc.text("FACTURA B", { align: "center" });
        }
        doc.text("---------------------------", { align: "center" });
        doc.text(`NRO. COMP: ${stringNumeroComprobante}`, { align: "center" });
        doc.text(
            `FECHA: ${new Date().toLocaleDateString()} ${new Date().getHours().toString().padStart(2, "0")}:${new Date()
                .getMinutes()
                .toString()
                .padStart(2, "0")}:${new Date().getSeconds().toString().padStart(2, "0")}`
            , { align: 'center' });
        doc.text("---------------------------", { align: "center" });
        if (data.dni && data.nombre && data.domicilio) {
            doc.text(data.nombre, { align: "left" });
            doc.text(`DNI: ${data.dni}`, { align: "left" });
            doc.text(data.domicilio, { align: "left" });
        } else {
            doc.text(`A CONSUMIDOR FINAL`, { align: "center" });
        }
    }
    doc.text("---------------------------", { align: "center" });
    doc.addPage();
    doc.moveDown();
    doc.fontSize(10);
    let currentY = doc.y;
    doc.text("CANTIDAD/P. UNIT", 0, currentY, { align: "left" });
    doc.text("IMPORTE", 165, currentY);
    doc.x = 0;
    currentY = doc.y;
    doc.text("DESCRIPCION", 0, currentY, { align: "left" });
    doc.text('IVA%', 135, currentY);
    data.productosCarrito.forEach(producto => {
        doc.x = 0;
        currentY = doc.y;
        if (data.factura === 'A') {
            doc.text(((producto.carritoCantidad * producto.venta) / 1.21).toFixed(2), 0, currentY, { align: 'right' });
        } else {
            doc.text((producto.carritoCantidad * producto.venta).toFixed(2), 0, currentY, { align: 'right' });
        }
        doc.text(`${producto.carritoCantidad}/$${producto.venta}`, 0, currentY);
        currentY = doc.y;
        let maxWidth = 135;
        let nombreProducto = producto.nombre;
        while (doc.widthOfString(nombreProducto) > maxWidth) {
            nombreProducto = nombreProducto.slice(0, -1);
        }
        doc.text(nombreProducto, 0, currentY);
        doc.text(`(21%)`, 135, currentY);
        doc.x = 0;
    });
    doc.addPage();
    if (data.factura === 'A') {
        doc.text(`SUBTOTAL: ${(data.precio / 1.21).toFixed(2)}`, { align: 'right' });
        doc.moveDown();
        doc.text(`NETO GRAVADO: ${(data.precio / 1.21).toFixed(2)}`, { align: 'right' });
        doc.text(`IVA 21%: ${(data.precio - (data.precio / 1.21)).toFixed(2)}`, { align: 'right' });
    }
    doc.moveDown();
    doc.fontSize(19);
    currentY = doc.y;
    const precioFormateado = data.precio.toLocaleString('es-AR');
    doc.text(`TOTAL:`, 0, currentY, { align: "left" });
    doc.text(`$${precioFormateado}`, 0, currentY, { align: "right" });
    doc.fontSize(12);
    doc.moveDown();
    doc.text("---------------------------", { align: "center" });
    doc.text("REFERENCIA ELECTRONICA", { align: "center" });
    doc.text("DEL COMPROBANTE", { align: "center" });
    doc.moveDown();
    doc.text(`C.A.E: ${data.CAE}`, { align: "center" });
    doc.text(`Vto.: ${data.vtoCAE}`, { align: "center" });

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");

    let formattedDateString = year + "-" + month + "-" + day;

    let importe_total = parseFloat(data.precio).toFixed(2);

    let object = {
        ver: 1,
        fecha: formattedDateString,
        cuit: data.cuit_afip,
        ptoVta: data.puntoDeVenta,
        tipoCmp: 6,
        nroCmp: data.numeroComprobante,
        importe: parseFloat(importe_total),
        moneda: "PES",
        ctz: 1,
        tipoDocRec: data.tipoDoc,
        nroDocRec: data.cuit,
        tipoCodAut: "E",
        codAut: parseInt(data.CAE),
    };

    const jsonString = JSON.stringify(object);
    const buffer = Buffer.from(jsonString, "utf-8");
    const base64String = buffer.toString("base64");
    let qr_svg = qr.image(`https://serviciosweb.afip.gob.ar/genericos/comprobantes/cae.aspx?p=${base64String}`, { type: "png" });
    qr_svg.pipe(fs.createWriteStream("qr-afip.png"));
    await new Promise(res => setTimeout(res, 250));
    doc.image("qr-afip.png", {
        x: 55,
        fit: [100, 100], // Ajusta el tamaño de la imagen para que se ajuste al tamaño de la página
        align: "center", // Centra la imagen horizontalmente en la página
    });
    doc.end();
    await new Promise(res => setTimeout(res, 250));
    if (data.notaCredito) {
        print(path.join(__dirname, 'notas_de_credito', `${stringNumeroComprobante}.pdf`));
    } else {
        print(path.join(__dirname, 'facturas', `${stringNumeroComprobante}.pdf`));
    }
};

io.on('connection', (socket) => {
    socket.on('request-productos', async ({ page = 1, search = '', isCarrito = false, isFavorito = false }) => {
        const pageSize = 50;
        try {
            const query = {
                ...(
                    search
                        ? {
                            $or: [
                                { codigo: new RegExp(search, 'i') },
                                { nombre: new RegExp(search, 'i') },
                                { bodega: new RegExp(search, 'i') },
                                { cepa: new RegExp(search, 'i') },
                                { origen: new RegExp(search, 'i') },
                            ]
                        }
                        : {}
                ),
                ...(
                    isCarrito
                        ? { carrito: true }
                        : {}
                ),
                ...(
                    isFavorito
                        ? { favorito: true }
                        : {}
                ),
            };
            const productos = await Product.find(query)
                .sort({ _id: -1 }) // Ordena por el más reciente
                .skip((page - 1) * pageSize)
                .limit(pageSize);

            const totalProductos = await Product.countDocuments(query);
            let totalPages = Math.ceil(totalProductos / pageSize);
            if (totalPages === 0) {
                totalPages = 1;
            }
            socket.emit('response-productos', {
                productos,
                totalProductos,
                totalPages,
            });
        } catch (error) {
            console.error('Error al obtener productos:', error);
            socket.emit('response-productos', {
                status: 'error',
                message: 'Error al obtener productos',
            });
        }
    });
    socket.on('agregar-stock', async (id, cantidad) => {
        const producto = await Product.findById(id);
        const nuevaCantidad = parseInt(producto.cantidad) + parseInt(cantidad);
        producto.cantidad = nuevaCantidad.toString();
        await producto.save();
        io.emit('cambios');
    });
    socket.on('delete-producto', async (id) => {
        await Product.findByIdAndDelete(id);
        io.emit('cambios');
    });
    socket.on('scan-code', async (codigo) => {
        let producto = await Product.findOne({ codigo });
        if (!producto) {
            producto = 'error';
        }
        socket.emit('producto-encontrado', producto);
    });
    socket.on('toggle-favorito', async (id) => {
        try {
            const product = await Product.findById(id);
            if (product) {
                const newFavorito = product.favorito === true ? false : true;
                product.favorito = newFavorito;
                await product.save();
                io.emit('cambios');
            } else {
                console.error('Producto no encontrado');
            }
        } catch (error) {
            console.error('Error al actualizar el favorito:', error);
        }
    });
    socket.on('toggle-carrito', async (id) => {
        try {
            const product = await Product.findById(id);
            if (product) {
                const newCarrito = product.carrito === true ? false : true;
                product.carrito = newCarrito;
                product.carritoCantidad = 1;
                await product.save();
                io.emit('cambios');
            } else {
                console.error('Producto no encontrado');
            }
        } catch (error) {
            console.error('Error al actualizar el carrito:', error);
        }
    });
    socket.on('reset-fav-carrito', async () => {
        await Product.updateMany(
            { $or: [{ favorito: true }, { carrito: true }] },
            { $set: { favorito: false, carrito: false } }
        );
        io.emit('cambios');
    });
    socket.on('productos-carrito', async () => {
        const productosCarrito = await Product.find({ carrito: true });
        socket.emit('productos-carrito', productosCarrito);
    });
    socket.on('actualizar-cantidad-carrito', async ({ id, cantidad }) => {
        try {
            const product = await Product.findById(id);
            if (product) {
                product.carritoCantidad = cantidad;
                await product.save();
                io.emit('cambios');
            } else {
                console.error('Producto no encontrado');
            }
        } catch (error) {
            console.error('Error al actualizar carritoCantidad:', error);
        }
    });
    socket.on('finalizar-compra', async (datosCompra) => {
        try {
            const productosCarrito = await Product.find({ carrito: true });
            let totalVenta = 0;
            productosCarrito.forEach(producto => {
                totalVenta += producto.carritoCantidad * parseFloat(producto.venta);
            });
            if (datosCompra.factura === 'A') {
                const data_factura = await afipService.facturaA(totalVenta, datosCompra.cuit);
                let data = {};
                let persona;
                try {
                    //persona = await afipService.getPersona(datosCompra.cuit);
                } catch (error) {
                    socket.emit('error-cuit-invalido');
                    return;
                }
                /*
                if (persona.personaReturn.errorConstancia) {
                    socket.emit('error-no-cuit');
                    return;
                }
                */
                persona = {
                    personaReturn: {
                        datosGenerales: {
                            razonSocial: 'ROBERTO CARLOS',
                            domicilioFiscal: {
                                localidad: 'BAHIA BLANCA',
                                direccion: 'CASTELLI 200',
                                descripcionProvincia: 'BUENOS AIRES'
                            }
                        },
                    }
                }
                data.cuit = datosCompra.cuit;
                data.factura = datosCompra.factura;
                data.razonSocial = persona.personaReturn.datosGenerales.razonSocial;
                data.localidad = persona.personaReturn.datosGenerales.domicilioFiscal.localidad;
                data.direccion = persona.personaReturn.datosGenerales.domicilioFiscal.direccion;
                data.provincia = persona.personaReturn.datosGenerales.domicilioFiscal.descripcionProvincia;
                data.numeroComprobante = data_factura.numeroComprobante;
                data.puntoDeVenta = afipService.ptoVta;
                data.cuit_afip = afipService.CUIT;
                data.precio = totalVenta;
                data.CAE = data_factura.CAE;
                data.vtoCAE = data_factura.vtoCAE;
                data.tipoDoc = data_factura.docTipo;
                data.productosCarrito = productosCarrito;
                await imprimirTicket(data);
                const venta = {
                    productos: productosCarrito,
                    tipoFactura: datosCompra.factura,
                    stringNumeroFactura: `0000${data.puntoDeVenta.toString()}-` + data.numeroComprobante.toString().padStart(8, "0"),
                    numeroFactura: data.numeroComprobante,
                    cuit: datosCompra.cuit,
                    monto: totalVenta,
                    formaPago: datosCompra.formaPago,
                    domicilio: data.direccion,
                    provincia: data.provincia,
                    localidad: data.localidad,
                    razonSocial: data.razonSocial,
                    fecha: moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD')
                };
                await Venta.create(venta);
            } else if (datosCompra.factura === 'B') {
                let data_factura;
                if (datosCompra.dni) {
                    data_factura = await afipService.facturaB(totalVenta, datosCompra.dni);
                } else {
                    data_factura = await afipService.facturaB(totalVenta, 0);
                };
                let data = {};
                data.dni = datosCompra.dni;
                data.nombre = datosCompra.nombre;
                data.domicilio = datosCompra.domicilio;
                data.factura = datosCompra.factura;
                data.numeroComprobante = data_factura.numeroComprobante;
                data.puntoDeVenta = afipService.ptoVta;
                data.cuit_afip = afipService.CUIT;
                data.precio = totalVenta;
                data.CAE = data_factura.CAE;
                data.vtoCAE = data_factura.vtoCAE;
                data.tipoDoc = data_factura.docTipo;
                data.productosCarrito = productosCarrito;
                await imprimirTicket(data);
                const venta = {
                    productos: productosCarrito,
                    tipoFactura: datosCompra.factura,
                    stringNumeroFactura: `0000${data.puntoDeVenta.toString()}-` + data.numeroComprobante.toString().padStart(8, "0"),
                    numeroFactura: data.numeroComprobante,
                    cuit: datosCompra.dni,
                    monto: totalVenta,
                    formaPago: datosCompra.formaPago,
                    domicilio: datosCompra.domicilio,
                    nombre: datosCompra.nombre,
                    fecha: moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD')
                };
                await Venta.create(venta);
            } else {
                const venta = {
                    productos: productosCarrito,
                    monto: totalVenta,
                    formaPago: datosCompra.formaPago,
                    fecha: moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD')
                };
                await Venta.create(venta);
            }
            productosCarrito.forEach(async (producto) => {
                await Product.findByIdAndUpdate(
                    producto._id,
                    { $inc: { cantidad: -producto.carritoCantidad } }
                );
            });
            await Product.updateMany(
                { $or: [{ carrito: true }, { favorito: true }] },
                { carrito: false, favorito: false }
            );
            io.emit('cambios');
            socket.emit('compra-finalizada');
        } catch (error) {
            console.error("Error al finalizar la compra:", error);
            socket.emit('error-finalizar-compra', { message: "Hubo un error al finalizar la compra." });
        }
    });
    socket.on('request-ventas', async ({ fecha, page }) => {
        const pageSize = 50;
        try {
            const query = {
                ...(fecha ? { fecha: fecha } : {})
            };

            const ventas = await Venta.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize);
            const totalVentas = await Venta.countDocuments(query);
            let totalPages = Math.ceil(totalVentas / pageSize);
            if (totalPages === 0) {
                totalPages = 1;
            };
            socket.emit('response-ventas', {
                ventas,
                totalVentas,
                totalPages
            });
        } catch (error) {
            console.error('Error fetching ventas:', error);
            socket.emit('response-ventas', { error: 'Error fetching ventas' });
        }
    });
    socket.on('nota-credito', async (venta) => {
        let data;

        if (venta.tipoFactura === 'A') {
            // Nota de crédito tipo A
            data = await afipService.notaCreditoA(venta.monto, venta.cuit, venta.numeroFactura);
            data = {
                ...data,
                cuit: venta.cuit,
                numeroComprobante: data.numeroComprobante,
                puntoDeVenta: afipService.ptoVta,
                factura: venta.tipoFactura,
                precio: venta.monto,
                tipoDoc: data.docTipo,
                cuit_afip: afipService.CUIT,
                productosCarrito: venta.productos,
                razonSocial: venta.razonSocial,
                localidad: venta.localidad,
                direccion: venta.domicilio,
                provincia: venta.provincia,
                notaCredito: true
            };
        } else if (venta.tipoFactura === 'B') {
            // Nota de crédito tipo B
            data = await afipService.notaCreditoB(venta.monto, venta.cuit, venta.numeroFactura);
            data = {
                ...data,
                dni: venta.cuit,
                nombre: venta.nombre,
                domicilio: venta.domicilio,
                factura: venta.tipoFactura,
                numeroComprobante: data.numeroComprobante,
                puntoDeVenta: afipService.ptoVta,
                cuit_afip: afipService.CUIT,
                precio: venta.monto,
                tipoDoc: data.docTipo,
                productosCarrito: venta.productos,
                notaCredito: true
            };
        }

        // Imprimir ticket y actualizar la venta
        await imprimirTicket(data);
        await Venta.findByIdAndUpdate(venta._id, { notaCredito: true });
        data.productosCarrito.forEach(async (producto) => {
            await Product.findByIdAndUpdate(
                producto._id,
                { $inc: { cantidad: producto.carritoCantidad } }
            );
        });
        // Emitir cambios
        io.emit('cambios');
    });
    socket.on('devolucion', async (venta) => {
        await Venta.findByIdAndUpdate(venta._id, { notaCredito: true });
        venta.productos.forEach(async (producto) => {
            await Product.findByIdAndUpdate(
                producto._id,
                { $inc: { cantidad: producto.carritoCantidad } }
            );
        });
        io.emit('cambios');
    });
    socket.on('request-totales', async () => {
        const totalEfectivoResult = await Venta.aggregate([
            {
                $match: {
                    formaPago: 'EFECTIVO',
                    notaCredito: { $ne: true } // Excluir ventas con notaCredito en true
                }
            },
            {
                $group: {
                    _id: null, // No necesitamos agrupar por formaPago, solo queremos el total
                    total: { $sum: "$monto" }
                }
            }
        ]);

        const totalDigitalResult = await Venta.aggregate([
            {
                $match: {
                    formaPago: 'DIGITAL',
                    notaCredito: { $ne: true } // Excluir ventas con notaCredito en true
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$monto" }
                }
            }
        ]);

        let efectivo = totalEfectivoResult.length > 0 ? totalEfectivoResult[0].total : 0;
        let digital = totalDigitalResult.length > 0 ? totalDigitalResult[0].total : 0;

        const operaciones = await Operacion.find();
        operaciones.map(operacion => {
            if (operacion.formaPago === 'EFECTIVO') {
                efectivo += operacion.monto;
            } else {
                digital += operacion.monto;
            }
        });

        const totales = {
            efectivo,
            digital
        };

        socket.emit('response-totales', totales);
    });
    socket.on('request-nombres', async () => {
        let nombres = await Operacion.find();
        nombres = [...new Set(nombres.map(operacion => operacion.nombre))];
        socket.emit('response-nombres', nombres);
    });
    socket.on('guardar-operacion', async (operacion) => {
        if (operacion._id) {
            await Operacion.findByIdAndUpdate(operacion._id, operacion);
        } else {
            operacion.fecha = moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD');
            await Operacion.create(operacion);
        };
        io.emit('cambios');
    });
    socket.on('request-operaciones', async ({ fecha, search, page }) => {
        const pageSize = 50;
        const pageNumber = page || 1;
        let filter = {};
        if (fecha) {
            filter.fecha = fecha;
        }
        const searchRegex = { $regex: search, $options: 'i' };
        filter.$or = [
            { descripcion: searchRegex },
            { tipoOperacion: searchRegex },
            { nombre: searchRegex }
        ];
        try {
            const operaciones = await Operacion
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize);
            const totalOperaciones = await Operacion.countDocuments(filter);
            let totalPages = Math.ceil(totalOperaciones / pageSize);
            if (totalPages === 0) {
                totalPages = 1;
            }
            socket.emit('response-operaciones', {
                operaciones,
                totalOperaciones,
                totalPages
            });
        } catch (error) {
            socket.emit('error', { message: 'Error retrieving operations', error });
        }
    });
    socket.on('request-tipo-operacion', async (tipo) => {
        const operaciones = await Operacion.find({ tipoOperacion: tipo }).sort({ createdAt: -1 });
        socket.emit('response-tipo-operacion', operaciones);
    });
    socket.on('request-facturado', async (mes) => {
        try {
            // Filtrar las ventas por el mes exacto (comparando las primeras 7 posiciones de la fecha)
            const ventas = await Venta.find({
                fecha: {
                    $regex: `^${mes}` // Filtrar donde la fecha empiece con el valor de 'mes' (YYYY-MM)
                }
            });

            let totalFacturado = 0;
            let totalNoFacturado = 0;

            ventas.forEach((venta) => {
                if (venta.notaCredito) {
                    return; // Si es nota de crédito, se salta a la siguiente iteración
                }
                if (venta.tipoFactura === 'A' || venta.tipoFactura === 'B') {
                    totalFacturado += venta.monto;
                } else {
                    totalNoFacturado += venta.monto;
                }
            });
            socket.emit('response-facturado', { totalFacturado, totalNoFacturado });
        } catch (error) {
            console.error('Error al obtener las ventas y sumar los montos:', error);
            socket.emit('error', { message: 'Error al obtener las ventas y sumar los montos.' });
        }
    });
    socket.on('request-inicio', (code) => {
        if (code === '0510') {
            socket.emit('response-inicio', true);
        } else {
            socket.emit('response-inicio', false);
        }
    });
    socket.on('guardar-turno', async (turno) => {
        turno.fecha = turno.fecha.split('T')[0];
        if (turno._id) {
            await Turno.findByIdAndUpdate(turno._id, turno);
        } else {
            await Turno.create(turno);
        }
        io.emit('cambios');
    });
    socket.on('request-turnos', async () => {
        const turnos = await Turno.find().sort({ createdAt: -1 });
        socket.emit('response-turnos', turnos);
    });
    socket.on('request-fechas-turnos', async (turno) => {
        const turnosOcupados = await Turno.find({ turno });
        socket.emit('response-fechas-turnos', turnosOcupados);
    });
    socket.on('request-cantidad', () => {
        let cantidades = JSON.parse(fs.readFileSync(path.join(__dirname, 'cantidad_colores.json'), { encoding: 'utf-8' }));
        socket.emit('response-cantidad', cantidades);
    });
    socket.on('borrar-turno', async (id) => {
        await Turno.findByIdAndDelete(id);
        io.emit('cambios');
    });
    socket.on('cobrar-turno', async (id, turnoData) => {
        let turno = await Turno.findById(id);
        turno.cobrado = (turno.cobrado || 0) + parseFloat(turnoData.cobrado);
        turno.facturado = turnoData.facturado;
        turno.formaDeCobro = turnoData.formaDeCobro;
        await turno.save();
        let data_factura = '';
        if (turnoData.facturado) {
            data_factura = await afipService.facturaB(totalVenta, 0);
        }
        let data = {};
        data.factura = 'B';
        data.numeroComprobante = data_factura.numeroComprobante;
        data.puntoDeVenta = afipService.ptoVta;
        data.cuit_afip = afipService.CUIT;
        data.precio = turnoData.cobrado;
        data.CAE = data_factura.CAE;
        data.vtoCAE = data_factura.vtoCAE;
        data.tipoDoc = data_factura.docTipo;
        data.productosCarrito = [{ nombre: "CATA" }];
        await imprimirTicket(data);
        await Venta.create({
            formaPago: turnoData.formaDeCobro,

        });
        io.emit('cambios');
    });
    socket.on('cambiar-cantidad-color', (color, cantidad) => {
        let cantidades = JSON.parse(fs.readFileSync(path.join(__dirname, 'cantidad_colores.json'), { encoding: 'utf-8' }));
        cantidades[color] = parseFloat(cantidad);
        fs.writeFileSync(path.join(__dirname, 'cantidad_colores.json'), JSON.stringify(cantidades));
        io.emit('cambios');
    });
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});