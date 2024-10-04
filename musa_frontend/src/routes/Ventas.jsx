import React, { useEffect, useState } from 'react';
import { IP, socket } from '../main';
import { NumericFormat } from 'react-number-format';
import moment from 'moment-timezone';

function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [fecha, setFecha] = useState(moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD'));
    const [alreadyClicked, setAlreadyClicked] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [venta, setVenta] = useState({});
    
    // Nuevo estado para almacenar la suma de los montos
    const [totalMonto, setTotalMonto] = useState(0);

    const fetchVentas = (fecha, page) => {
        setAlreadyClicked(false);
        socket.emit('request-ventas', { fecha, page });
    };

    const notaCredito = (venta) => {
        if (!venta.tipoFactura) {
            if (window.confirm('NO HAY FACTURA PARA HACER NOTA DE CREDITO\n\n¿Desea cancelar la compra?')) {
                socket.emit('devolucion', venta);
            }
            return;
        }
        if (window.confirm('¿ESTAS SEGURO QUE QUIERES HACER UNA NOTA DE CREDITO?')) {
            if (alreadyClicked) {
                alert('NOTA DE CREDITO EN PROCESO');
                return;
            }
            setAlreadyClicked(true);
            socket.emit('nota-credito', venta);
        };
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const handleDateChange = (e) => setFecha(e.target.value);

    const ventaClick = (venta) => {
        setVenta(venta);
        setOpenModal(true);
    };

    // Calcular la suma de los montos, excluyendo las notas de crédito
    useEffect(() => {
        const total = ventas.reduce((acc, venta) => {
            return venta.notaCredito ? acc : acc + venta.monto; // Solo sumar si no es nota de crédito
        }, 0);
        setTotalMonto(total);
    }, [ventas]);

    useEffect(() => {
        socket.on('cambios', () => fetchVentas(fecha, page));
        socket.on('response-ventas', (data) => {
            if (data.status === 'error') {
                console.error(data.message);
                return;
            }
            setVentas(data.ventas);
            setTotalPages(data.totalPages);
        });
        fetchVentas(fecha, page);
        return () => {
            socket.off('cambios');
            socket.off('response-ventas');
        };
    }, [fecha, page]);

    return (
        <div>
            <div className="buscador-ventas">
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
                        <th>Fecha de Creación</th>
                        <th>Tipo de Factura</th>
                        <th>Número de Factura</th>
                        <th>CUIT/DNI</th>
                        <th>Monto<br /><NumericFormat prefix='$' displayType='text' value={totalMonto.toFixed(2)} thousandSeparator="." decimalSeparator=',' /></th>
                        <th>Forma de Pago</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {
                        ventas?.length > 0 ? (
                            ventas.map((venta, index) => (
                                <tr onClick={() => {
                                    console.log('asd');
                                    if (venta.numeroFactura) {
                                        window.open(`${IP()}/facturas/${venta.stringNumeroFactura}.pdf`);
                                    } else {
                                        ventaClick(venta);
                                    }
                                }} key={index}>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>
                                        {new Date(venta.createdAt).toLocaleString('es-AR', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })}
                                    </td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.tipoFactura ? venta.tipoFactura : '-'}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.numeroFactura ? venta.numeroFactura : '-'}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.cuit ? venta.cuit : "FINAL"}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>
                                        <NumericFormat prefix='$' displayType='text' value={venta.monto.toFixed(2)} thousandSeparator="." decimalSeparator=',' />
                                    </td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.formaPago}</td>
                                    <td className='editar nafta' onClick={(e) => {
                                        e.stopPropagation();
                                        if (venta.notaCredito) {
                                            alert('YA SE HIZO UNA NOTA DE CREDITO DE ESA FACTURA');
                                            return;
                                        };
                                        notaCredito(venta);
                                    }}>
                                        <i className="bi bi-file-earmark-break-fill"></i>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7">No hay ventas disponibles</td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
            {
                openModal && <div className="modal" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">VENTA - ${venta.monto}</h5>
                            </div>
                            <div>DESCUENTO: ${venta.descuento}</div>
                            {
                                venta.productos.map((prod, index) => <div key={index}> {prod.carritoCantidad} x {prod.nombre}</div>)
                            }
                            <div className="modal-footer">
                                <button onClick={() => setOpenModal(false)} type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default Ventas;