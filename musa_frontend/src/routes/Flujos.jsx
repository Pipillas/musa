import React, { useState, useRef } from 'react'
import moment from 'moment-timezone';
import { NumericFormat } from 'react-number-format';

function Flujos() {

    const [fecha, setFecha] = useState(moment(new Date()).tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD'));
    const fileInputRef = useRef(null);

    const [operacion, setOperacion] = useState({
        fecha,
        nombre: '',
        monto: '',
        beneficiario: '',
        descripcion: '',
        tipoOperacion: 'FLUJO',
        formaPago: 'DIGITAL'
    });
    const [file, setFile] = useState(null);

    const handleDateChange = (e) => setFecha(e.target.value);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const borrarFile = (id) => {
        if (id) {
            socket.emit('borrar-file-operacion', id);
        }
    };

    const handleChangeNumber = (value) => {
        setOperacion(prev => ({ ...prev, monto: value }));
    };

    const enviar = async () => {
        const formDataToSend = new FormData();
        for (const key in operacion) {
            formDataToSend.append(key, operacion[key]);
        }
        if (file) {
            formDataToSend.append('file', file);
        }
        try {
            const response = await fetch(`${IP()}/upload_operacion`, {
                method: 'POST',
                body: formDataToSend,
            });
            const result = await response.json();
            console.log('Resultado del servidor:', result);

            if (result.status === 'error') {
                alert(result.message);
                return;
            }
            setOperacion({
                fecha,
                nombre: '',
                monto: '',
                beneficiario: '',
                descripcion: '',
                tipoOperacion: 'FLUJO',
                formaPago: 'DIGITAL'
            });
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error al enviar los datos:', error);
        }
    };

    return (
        <div className="container-flujos">
            <div className="formulario-fujos">
                <div className="input-flujos">
                    <span>FECHA DE PAGO</span>
                    <input
                        value={fecha}
                        type="date"
                        onChange={handleDateChange}
                    />
                </div>
                <div className="input-flujos">
                    <span>NOMBRE</span>
                    <input value={operacion.nombre} onChange={e => setOperacion(prev => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div className="input-flujos">
                    <span>IMPORTE</span>
                    <NumericFormat
                        prefix='$'
                        value={operacion.monto}
                        thousandSeparator="."
                        decimalSeparator=','
                        onValueChange={(e) => handleChangeNumber(e.floatValue)}
                    />
                </div>
                <div className="input-flujos">
                    <span>BENEFICIARIO</span>
                    <input value={operacion.nombre} onChange={e => setOperacion(prev => ({ ...prev, beneficiario: e.target.value }))} />
                </div>
                <div className="input-flujos">
                    <span>DESCRIPCION</span>
                    <input value={operacion.nombre} onChange={e => setOperacion(prev => ({ ...prev, descripcion: e.target.value }))} />
                </div>
                <div className="input-flujos">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} />
                </div>
                <div className="input-flujos">
                    <button onClick={enviar} className="boton-flujos">ENVIAR</button>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>FECHA DE PAGO</th>
                        <th>IMPORTE</th>
                        <th>BENEFICIARIO</th>
                        <th>DESCRIPCION</th>
                    </tr>
                </thead>
                <tbody>

                </tbody>
            </table>
        </div>
    )
}

export default Flujos