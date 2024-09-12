import React, { useState, useEffect } from 'react';
import { socket } from '../main';
import { NumericFormat } from 'react-number-format';

function Estadisticas() {
    const [tipoOperacion, setTipoOperacion] = useState('APORTE');
    const [operaciones, setOperaciones] = useState([]);
    const [totalFacturado, setTotalFacturado] = useState(0);
    const [totalNoFacturado, setTotalNoFacturado] = useState(0);

    const [mes, setMes] = useState('');

    const getOperaciones = (tipo) => socket.emit('request-tipo-operacion', tipo);
    const getTotalFacturado = (m) => socket.emit('request-facturado', m);

    useEffect(() => {
        socket.on('response-tipo-operacion', (ap) => {
            setOperaciones(ap);
        });
        socket.on('response-facturado', (total) => {
            setTotalFacturado(total.totalFacturado);
            setTotalNoFacturado(total.totalNoFacturado);
        });
        socket.on('cambios', () => {
            getOperaciones(tipoOperacion)
            getTotalFacturado(mes);
        });
        getOperaciones(tipoOperacion);
        getTotalFacturado(mes);
        return () => {
            socket.off('response-tipo-operacion');
            socket.off('response-facturado');
            socket.off('cambios');
        };
    }, [tipoOperacion, mes]);

    // Calcular la suma de los montos
    const totalMonto = operaciones.reduce((total, ap) => total + ap.monto, 0);

    return (
        <div className="table-estadisticas">
            <div>
                <input
                    type="month"
                    id="mes"
                    value={mes}
                    onChange={e => setMes(e.target.value)}
                />
                {totalFacturado}
                -
                {totalNoFacturado}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>
                            <NumericFormat
                                prefix=''
                                displayType='text'
                                value={operaciones.length}
                                thousandSeparator="."
                                decimalSeparator=','
                            />
                        </th>
                        <th>
                            <div className="div-select-estadisticas">
                                <select className="select-estadisticas" onChange={e => setTipoOperacion(e.target.value)} value={tipoOperacion} name="" id="">
                                    <option value="APORTE">APORTE</option>
                                    <option value="RETIRO">RETIRO</option>
                                    <option value="GASTO">GASTO</option>
                                    <option value="INGRESO">INGRESO</option>
                                    <option value="CIERRE DE CAJA">CIERRE DE CAJA</option>
                                </select>
                            </div>
                        </th>
                        <th>
                            <NumericFormat
                                prefix='$'
                                displayType='text'
                                value={totalMonto}
                                thousandSeparator="."
                                decimalSeparator=','
                            />
                        </th>
                    </tr>
                    <tr>
                        <th>NOMBRE</th>
                        <th></th>
                        <th>MONTO</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        operaciones?.map((ap, index) => (
                            <tr key={index}>
                                <td>{ap.nombre}</td>
                                <td></td>
                                <td>
                                    <NumericFormat
                                        prefix='$'
                                        displayType='text'
                                        value={ap.monto}
                                        thousandSeparator="."
                                        decimalSeparator=','
                                    />
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Estadisticas;