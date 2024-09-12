import React, { useEffect, useState } from 'react'
import { IP, socket } from '../main';
import { NumericFormat } from 'react-number-format';
import moment from 'moment-timezone';

function Ventas() {

    const [ventas, setVentas] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [fecha, setFecha] = useState(moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD'));
    const [alreadyClicked, setAlreadyClicked] = useState(false);

    const fetchVentas = (fecha, page) => {
        setAlreadyClicked(false);
        socket.emit('request-ventas', { fecha, page })
    };

    const notaCredito = (venta) => {
        if (!venta.tipoFactura) {
            if (window.confirm('NO HAY FACTURA PARA HACER NOTA DE CREDITO\n\n¿Desea cancelar la compra?')) {
                socket.emit('devolucion', venta);
            }
            return;
        }
        if (alreadyClicked) {
            alert('NOTA DE CREDITO EN PROCESO');
            return;
        }
        setAlreadyClicked(true);
        socket.emit('nota-credito', venta);
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const handleDateChange = (e) => setFecha(e.target.value);

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
                        <th>Monto</th>
                        <th>Forma de Pago</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {
                        ventas?.length > 0 ? (
                            ventas.map((venta, index) => (
                                <tr onClick={() => { if (venta.numeroFactura) { window.open(`${IP}/facturas/${venta.stringNumeroFactura}.pdf`) } }} key={index}>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{new Date(venta.createdAt).toLocaleString('es-AR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.tipoFactura ? venta.tipoFactura : '-'}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.numeroFactura ? venta.numeroFactura : '-'}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.cuit ? venta.cuit : "FINAL"}</td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}><NumericFormat prefix='$' displayType='text' value={venta.monto.toFixed(2)} thousandSeparator="." decimalSeparator=',' /></td>
                                    <td style={{ backgroundColor: venta.notaCredito && '#e55959' }}>{venta.formaPago}</td>
                                    <td className='editar nafta' onClick={(e) => {
                                        e.stopPropagation();
                                        if (venta.notaCredito) {
                                            alert('YA SE HIZO UNA NOTA DE CREDITO DE ESA FACTURA');
                                            return;
                                        };
                                        notaCredito(venta)
                                    }}><i className="bi bi-file-earmark-break-fill"></i></td>
                                </tr >
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7">No hay ventas disponibles</td>
                            </tr>
                        )
                    }
                </tbody >
            </table >
        </div >
    )
}

export default Ventas;