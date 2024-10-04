import React, { useState, useEffect } from 'react'
import { socket } from '../main';
import { NumericFormat } from 'react-number-format';
import DatalistInput from 'react-datalist-input';
import moment from 'moment-timezone';

function Caja() {

    const [operacion, setOperacion] = useState({
        descripcion: '',
        monto: 0,
        nombre: '',
        formaPago: null,
        tipoOperacion: null
    });
    const [nombres, setNombres] = useState([]);
    const [totales, setTotales] = useState({});
    const [operaciones, setOperaciones] = useState([]);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [fecha, setFecha] = useState(moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD'));
    const [search, setSearch] = useState("");

    const fetchTotales = () => socket.emit('request-totales');

    const fetchNombres = () => socket.emit('request-nombres');

    const fetchOperaciones = (fecha, search, page) => socket.emit('request-operaciones', { fecha, search, page });

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const handleDateChange = (e) => setFecha(e.target.value);

    useEffect(() => {
        socket.on('cambios', () => {
            fetchNombres();
            fetchTotales();
            fetchOperaciones(fecha, search, page);
        });
        socket.on('response-totales', (data) => {
            if (data.status === 'error') {
                console.error(data.message);
                return;
            }
            setTotales(data);
        });
        socket.on('response-nombres', data => {
            let arr = [];
            for (let i = 0; i < data.length; i++) {
                arr.push(data[i]);
                arr = [...new Set(arr)];
            };
            for (let i = 0; i < arr.length; i++) {
                arr[i] = {
                    id: i,
                    value: arr[i]
                }
            }
            setNombres(arr);
        });
        socket.on('response-operaciones', data => {
            setOperaciones(data.operaciones);
            setTotalPages(data.totalPages);
        })
        fetchNombres();
        fetchTotales();
        fetchOperaciones(fecha, search, page);
        return () => {
            socket.off('cambios');
            socket.off('response-totales');
            socket.off('response-nombres');
        };
    }, [fecha, search, page]);

    const handlePaymentButtonClick = (button) => {
        setOperacion(prev => ({ ...prev, formaPago: button }));
    };

    const handleTransactionButtonClick = (button) => {
        setOperacion(prev => ({ ...prev, tipoOperacion: button }));
    };

    const enviar = () => {
        if (!operacion.monto || operacion.monto === 0) {
            alert('FALTA MONTO')
            return;
        }
        if (!operacion.formaPago) {
            alert('FALTA FORMA DE PAGO')
            return;
        }
        if (!operacion.tipoOperacion) {
            alert('FALTA TIPO DE OPERACION')
            return;
        }
        socket.emit('guardar-operacion', operacion);
        setOperacion({
            descripcion: '',
            monto: 0,
            nombre: '',
            formaPago: null,
            tipoOperacion: null
        });
    };

    const handleChangeNumber = (value) => {
        setOperacion(prev => ({ ...prev, monto: value }));
    };

    const editar = async (op) => {
        try {
            // Intentamos obtener la hora desde la API
            const response = await fetch('http://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires');
            if (!response.ok) {
                throw new Error('Fallo la API, usando la hora local');
            }
            const data = await response.json();
            const fechaArgentina = moment(data.datetime).format('YYYY-MM-DD');
            // Comparamos la fecha de la operación con la fecha obtenida
            if (op.fecha === fechaArgentina) {
                setOperacion(op);
            } else {
                alert('NO SE PUEDE EDITAR OPERACIONES DE OTROS DIAS');
            }
        } catch (error) {
            // Si la API falla, utilizamos la hora local
            const fechaLocal = moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD');
            // Comparamos la fecha de la operación con la fecha local
            if (op.fecha === fechaLocal) {
                setOperacion(op);
            } else {
                alert('NO SE PUEDE EDITAR OPERACIONES DE OTROS DIAS');
            }
        }
    };

    return (
        <div className="div-caja">
            <div className="inputs-caja">
                <NumericFormat placeholder='MONTO' prefix='$' value={operacion.monto} thousandSeparator="." decimalSeparator=',' onValueChange={(e) => handleChangeNumber(e.floatValue)} />
                <div className="botones-caja">
                    <button
                        onClick={() => handlePaymentButtonClick('EFECTIVO')}
                        className={operacion.formaPago === 'EFECTIVO' ? 'boton-activo' : ''}
                    >
                        EFECTIVO
                    </button>
                    <button
                        onClick={() => handlePaymentButtonClick('DIGITAL')}
                        className={operacion.formaPago === 'DIGITAL' ? 'boton-activo' : ''}
                    >
                        DIGITAL
                    </button>
                </div>
                <textarea value={operacion.descripcion} placeholder='DESCRIPCION' onChange={e => setOperacion(prev => ({ ...prev, descripcion: e.target.value }))}></textarea>
                <div className="botones-caja">
                    <button
                        onClick={() => handleTransactionButtonClick('APORTE')}
                        className={operacion.tipoOperacion === 'APORTE' ? 'boton-activo' : ''}
                    >
                        APORTE
                    </button>
                    <button
                        onClick={() => handleTransactionButtonClick('RETIRO')}
                        className={operacion.tipoOperacion === 'RETIRO' ? 'boton-activo' : ''}
                    >
                        RETIRO
                    </button>
                    <button
                        onClick={() => handleTransactionButtonClick('GASTO')}
                        className={operacion.tipoOperacion === 'GASTO' ? 'boton-activo' : ''}
                    >
                        GASTO
                    </button>
                    <button
                        onClick={() => handleTransactionButtonClick('INGRESO')}
                        className={operacion.tipoOperacion === 'INGRESO' ? 'boton-activo' : ''}
                    >
                        INGRESO
                    </button>
                </div>
                <div className="boton-cierre-caja">
                    <button
                        onClick={() => handleTransactionButtonClick('CIERRE DE CAJA')}
                        className={operacion.tipoOperacion === 'CIERRE DE CAJA' ? 'boton-activo' : ''}
                    >
                        CIERRE DE CAJA
                    </button>
                </div>
                <DatalistInput placeholder='NOMBRE' value={operacion.nombre} inputProps={{ value: operacion.nombre, onChange: e => setOperacion(prev => ({ ...prev, nombre: e.target.value })) }} onSelect={e => setOperacion(prev => ({ ...prev, nombre: e.value }))} items={nombres} />
                <div className="botones-caja">
                    <button onClick={() => enviar()}>ENVIAR</button>
                </div>
            </div>
            <div className="div-tablas-caja">
                <table>
                    <thead>
                        <tr>
                            <th>TOTAL EFECTIVO</th>
                            <th>TOTAL DIGITAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><NumericFormat prefix='$' displayType='text' value={parseFloat(totales.efectivo).toFixed(2)} thousandSeparator="." decimalSeparator=',' /></td>
                            <td><NumericFormat prefix='$' displayType='text' value={parseFloat(totales.digital).toFixed(2)} thousandSeparator="." decimalSeparator=',' /></td>
                        </tr>
                    </tbody>
                </table>
                <div className="buscador-ventas">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} />
                    <input
                        value={fecha}
                        type="date"
                        onChange={handleDateChange}
                    />
                    <div className="paginacion">
                        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <span>{page} de {totalPages}</span>
                        <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                            <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th >FECHA</th>
                            <th>NOMBRE</th>
                            <th>TIPO OPERACION</th>
                            <th>FORMA DE PAGO</th>
                            <th>MONTO</th>
                            <th>DESCRIPCION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            operaciones?.map((operacion, index) => <tr key={index}>
                                <td onClick={() => editar(operacion)} className='editar caja-editar'><i className="bi bi-pencil-square"></i></td>
                                <td>{new Date(operacion.createdAt).toLocaleString('es-AR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}</td>
                                <td>{operacion.nombre}</td>
                                <td>{operacion.tipoOperacion}</td>
                                <td>{operacion.formaPago}</td>
                                <td style={{ color: operacion.monto < 0 ? 'red' : '' }}><NumericFormat prefix='$' displayType='text' value={operacion.monto} thousandSeparator="." decimalSeparator=',' /></td>
                                <td>{operacion.descripcion}</td>
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>
        </div >
    )
}

export default Caja;
