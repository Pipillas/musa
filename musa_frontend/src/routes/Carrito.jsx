import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { IP, socket } from '../main';
import { NumericFormat, PatternFormat } from 'react-number-format';

const LIMITE_EFECTIVO = 172244;
const LIMITE_DIGITAL = 344488;

const Carrito = () => {
    const [productos, setProductos] = useState([]);
    const [total, setTotal] = useState(0);

    const [inputBuffer, setInputBuffer] = useState('');

    const [formaPago, setFormaPago] = useState(null);
    const [factura, setFactura] = useState(null);

    const [pedirData, setPedirData] = useState(false);
    const [pedirCuit, setPedirCuit] = useState(false);

    const [cuit, setCUIT] = useState('');
    const [dni, setDNI] = useState('');
    const [nombre, setNombre] = useState('');
    const [domicilio, setDomicilio] = useState('');

    const [todoOK, setTodoOK] = useState(false);

    const fetchProductosCarrito = useCallback(() => socket.emit('productos-carrito'), []);

    const calcularTotal = useCallback(() => {
        return productos.reduce((total, producto) => total + (producto.venta * producto.carritoCantidad), 0);
    }, [productos]);

    const handleInputChange = useCallback((id, value, maxCantidad) => {
        const cantidadNumerica = parseInt(value.replace(/\D/g, ''));
        const cantidad = isNaN(cantidadNumerica) ? 1 : Math.min(Math.max(1, cantidadNumerica), maxCantidad);
        socket.emit('actualizar-cantidad-carrito', { id, cantidad });
    }, []);

    const handleFormaPagoClick = useCallback((tipo) => {
        setFormaPago(tipo);
        setFactura(tipo === 'DIGITAL' ? 'B' : null);
    }, []);

    const handleFacturaClick = useCallback((tipo) => {
        setFactura(factura === tipo && formaPago !== 'DIGITAL' ? null : tipo);
    }, [factura, formaPago]);

    const handleCantidad = useCallback((id, delta, maxCantidad) => {
        const producto = productos.find(prod => prod._id === id);
        const nuevaCantidad = Math.min(Math.max(1, producto.carritoCantidad + delta), maxCantidad);
        socket.emit('actualizar-cantidad-carrito', { id, cantidad: nuevaCantidad });
    }, [productos]);

    const finalizar = useCallback(() => {
        const datosCompra = {
            formaPago,
            factura,
            ...(pedirCuit && { cuit }),
            ...(pedirData && { dni, nombre, domicilio })
        };
        socket.emit('finalizar-compra', datosCompra);
    }, [formaPago, factura, cuit, dni, nombre, domicilio, pedirCuit, pedirData]);

    const isDataComplete = useMemo(() => {
        if (!productos.length) return false; // Verifica que haya productos en el carrito
        if (pedirCuit && (!cuit || cuit.length !== 11)) return false;
        if (pedirData && (!dni || !nombre || !domicilio)) return false;
        return true;
    }, [productos, pedirCuit, cuit, pedirData, dni, nombre, domicilio]);

    const handleGlobalKeyDown = (e) => {
        setInputBuffer(prevBuffer => {
            if (e.key === 'Enter') {
                console.log('Enviando código al backend:', prevBuffer);
                socket.emit('add-carrito', prevBuffer);
                return '';
            }
            const newBuffer = prevBuffer + e.key;
            console.log(newBuffer);
            return newBuffer;
        });
        /*
        setTimeout(() => {
            setInputBuffer('');
        }, 3000);
        */
    };

    useEffect(() => {
        if (formaPago) {
            const limite = formaPago === 'EFECTIVO' ? LIMITE_EFECTIVO : LIMITE_DIGITAL;
            setPedirCuit(factura === 'A');
            setPedirData(factura === 'B' && total >= limite);
            setTodoOK(isDataComplete);
        }
    }, [factura, formaPago, total, isDataComplete]);

    useEffect(() => {
        setTotal(calcularTotal());
    }, [productos, calcularTotal]);

    useEffect(() => {
        socket.on('cambios', fetchProductosCarrito);
        socket.on('productos-carrito', setProductos);
        socket.on('error-cuit-invalido', () => alert('PROBABLEMENTE EL CUIT INGRESADO ESTA MAL ESCRITO'));
        socket.on('error-no-cuit', () => alert('PROBABLEMENTE NO ES CUIT'));
        socket.on('compra-finalizada', () => {
            setFormaPago(null);
            setFactura(null);
            setPedirData(false);
            setPedirCuit(false);
            setCUIT('');
            setDNI('');
            setNombre('');
            setDomicilio('');
        });
        fetchProductosCarrito();
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            socket.off('cambios', fetchProductosCarrito);
            socket.off('error-cuit-invalido');
            socket.off('error-no-cuit');
            socket.off('compra-finalizada')
            socket.off('productos-carrito', setProductos);
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [fetchProductosCarrito]);

    return (
        <div className="ventas-container">
            <div className="productos-section">
                <div className="productos-list">
                    {productos.map(producto => (
                        <ProductoItem
                            key={producto._id}
                            producto={producto}
                            borrarCarrito={() => socket.emit('toggle-carrito', producto._id)}
                            handleCantidad={(delta) => handleCantidad(producto._id, delta, producto.cantidad)}
                            handleInputChange={(value) => handleInputChange(producto._id, value, producto.cantidad)}
                        />
                    ))}
                </div>
            </div>
            <ResumenCompra
                total={total}
                formaPago={formaPago}
                handleFormaPagoClick={handleFormaPagoClick}
                factura={factura}
                handleFacturaClick={handleFacturaClick}
                pedirCuit={pedirCuit}
                cuit={cuit}
                setCUIT={setCUIT}
                pedirData={pedirData}
                dni={dni}
                setDNI={setDNI}
                nombre={nombre}
                setNombre={setNombre}
                domicilio={domicilio}
                setDomicilio={setDomicilio}
                todoOK={todoOK}
                finalizar={finalizar}
            />
        </div>
    );
};

// Componentes separados para ProductoItem y ResumenCompra

const ProductoItem = ({ producto, borrarCarrito, handleCantidad, handleInputChange }) => (
    <div className="div-eliminar">
        <div className="producto-acciones div-boton-venta">
            <button onClick={borrarCarrito} className="boton-venta"><i className="bi bi-x-circle-fill"></i></button>
        </div>
        <div className="producto-item">
            <div className="producto-imagen">
                <img src={`${IP}/${producto.foto}`} alt={producto.nombre} />
            </div>
            <div className="producto-detalle">
                <div className="producto-detalle-div">
                    <div className='titulo-precio'>
                        <p className="producto-nombre">{producto.nombre}</p>
                    </div>
                    <p className="producto-cantidad">
                        <button onClick={() => handleCantidad(-1)} className='boton-venta boton-cantidad'><i className="bi bi-dash-circle"></i></button>
                        <input
                            type="text"
                            value={producto.carritoCantidad}
                            onChange={(e) => handleInputChange(e.target.value)}
                            pattern="[0-9]*"
                        />
                        <button onClick={() => handleCantidad(1)} className='boton-venta boton-cantidad'><i className="bi bi-plus-circle"></i></button>
                    </p>
                    <p className="producto-cantidad disponibles">{producto.cantidad} disponibles</p>
                </div>
                <div>
                    <div className="producto-precio subtotal-carrito">
                        <NumericFormat displayType='text' prefix='$' value={producto.venta} thousandSeparator="." decimalSeparator=',' />
                        <p className="negrita">x {producto.carritoCantidad} = </p>
                        <NumericFormat displayType='text' prefix='$' value={producto.venta * producto.carritoCantidad} thousandSeparator="." decimalSeparator=',' />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ResumenCompra = ({ total, formaPago, handleFormaPagoClick, factura, handleFacturaClick, pedirCuit, cuit, setCUIT, pedirData, dni, setDNI, nombre, setNombre, domicilio, setDomicilio, todoOK, finalizar }) => (
    <div className="resumen-section">
        <div>
            <h2>RESUMEN DE COMPRA</h2>
            <div>
                <NumericFormat
                    displayType="text"
                    prefix="TOTAL: $"
                    value={total}
                    thousandSeparator="."
                    decimalSeparator=","
                />
            </div>
        </div>
        <div>
            <h2>FORMA DE PAGO</h2>
            <div className="formapago-buttons">
                <button
                    className={`button-formpago ${formaPago === 'EFECTIVO' ? 'active' : ''}`}
                    onClick={() => handleFormaPagoClick('EFECTIVO')}
                >
                    EFECTIVO
                </button>
                <button
                    className={`button-formpago ${formaPago === 'DIGITAL' ? 'active' : ''}`}
                    onClick={() => handleFormaPagoClick('DIGITAL')}
                >
                    DIGITAL
                </button>
            </div>
        </div>
        <div>
            <h2>FACTURA</h2>
            <div className="formapago-buttons">
                <button
                    className={`button-formpago ${factura === 'A' ? 'active' : ''}`}
                    onClick={() => handleFacturaClick('A')}
                >
                    A
                </button>
                <button
                    className={`button-formpago ${factura === 'B' ? 'active' : ''}`}
                    onClick={() => handleFacturaClick('B')}
                >
                    B
                </button>
            </div>
        </div>
        {pedirData && <DatosCompra dni={dni} setDNI={setDNI} nombre={nombre} setNombre={setNombre} domicilio={domicilio} setDomicilio={setDomicilio} />}
        {pedirCuit && <CUITInput cuit={cuit} setCUIT={setCUIT} />}
        {todoOK && <div className="div-boton-finalizar"><button onClick={finalizar} className="boton-finalizar">FINALIZAR</button></div>}
    </div>
);

const DatosCompra = ({ dni, setDNI, nombre, setNombre, domicilio, setDomicilio }) => {
    return (
        <>
            <div className='div-cuit'>
                <span>DNI</span>
                <NumericFormat className="input-cuit" value={dni} thousandSeparator="." decimalSeparator=',' onValueChange={(e) => setDNI(e.floatValue)} />
            </div>
            <div className='div-cuit'>
                <span>NOMBRE</span>
                <input
                    className="input-cuit"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.toUpperCase())}
                />
            </div>
            <div className='div-cuit'>
                <span>DOMICILIO</span>
                <input
                    className="input-cuit"
                    type="text"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value.toUpperCase())}
                />
            </div>
        </>
    );
};

const CUITInput = ({ cuit, setCUIT }) => (
    <div className="div-cuit">
        <span>CUIT</span>
        <PatternFormat className="input-cuit" format="##-##.###.###-#" mask="_" allowEmptyFormatting value={cuit} onValueChange={(e) => setCUIT(e.value)} />
    </div>
);

export default Carrito;