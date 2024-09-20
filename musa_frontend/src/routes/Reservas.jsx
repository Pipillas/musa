import React, { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import { socket } from '../main';

import "react-datepicker/dist/react-datepicker.css";


function Reservas() {

    const [turno, setTurno] = useState({
        fecha: null,
        turno: 'AFTER OFFICE',
        nombre: '',
        cantidad: '',
        observaciones: ''
    });
    const [turnos, setTurnos] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    const [turnosOcupados, setTurnosOcupados] = useState([]);

    const [cantidad, setCantidad] = useState(12);

    const handleKeyDown = (e) => {
        if (e.target.name !== 'observaciones') {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.select();
            }
        }
    };

    const handleChange = (e) => {
        if (e.target.name === 'cantidad') {
            const numericValue = e.target.value.replace(/[^0-9]/g, "");
            setTurno(prev => ({
                ...prev,
                [e.target.name]: numericValue,
            }));
        } else if (e.target.name === 'nombre') {
            const capitalizedValue = e.target.value.replace(/\b\w+/g, (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            );
            setTurno(prev => ({
                ...prev,
                [e.target.name]: capitalizedValue,
            }));
        } else {
            setTurno(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleFecha = (e) => {
        setTurno(prev => ({ ...prev, fecha: e }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        socket.emit('guardar-turno', turno);
        setTurno({
            fecha: null,
            turno: 'AFTER OFFICE',
            nombre: '',
            cantidad: '',
            observaciones: ''
        });
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const cambiarCantidadColor = (color) => {
        const cantidad = window.prompt(`Nueva cantidad para el color ${color}`);
        socket.emit('cambiar-cantidad-color', color, cantidad);
    };

    const fetchTurnos = (t) => {
        socket.emit('request-turnos');
        socket.emit('request-fechas-turnos', t);
        socket.emit('request-cantidad');
    };

    const editar = (t) => {
        const fecha = new Date(`${t.fecha}T00:00:00-03:00`);
        setTurno({
            ...t,
            fecha,
        });
    };

    const deleteTurno = (t) => {
        if (window.confirm(`¿Estas seguro que quieres borrar el turno de ${t.nombre}?`)) {
            socket.emit('borrar-turno', t._id);
        };
    };

    useEffect(() => {
        socket.on('cambios', () => fetchTurnos(turno.turno));
        socket.on('response-fechas-turnos', to => {
            setTurnosOcupados(to);
        });
        socket.on('response-turnos', (turn) => {
            setTurnos(turn);
        });
        socket.on('response-cantidad', cant => {
            setCantidad(cant);
        });
        fetchTurnos(turno.turno);
        return () => {
            socket.off('cambios');
            socket.off('response-fechas-turnos')
            socket.off('response-turnos');
            socket.off('response-cantidad');
        };
    }, [turno]);

    return (
        <div className="inventario-container">
            <div onClick={() => cambiarCantidadColor('rojo')} className="cuadrado-rojo">{cantidad.rojo}</div>
            <div onClick={() => cambiarCantidadColor('amarillo')} className="cuadrado-amarillo">{cantidad.amarillo}</div>
            <div className="formulario-container">
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="formulario">
                    <div className="form-group">
                        <label >Turno</label>
                        <select value={turno.turno} onChange={handleChange} name="turno" id="turno">
                            <option value="AFTER OFFICE">AFTER OFFICE</option>
                            <option value="CENA">CENA</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Fecha</label>
                        <DatePicker
                            placeholderText="DD-MM-YYYY"
                            dateFormat="dd-MM-yyyy"
                            selected={turno.fecha}
                            onChange={(date) => handleFecha(date)}
                            dayClassName={(date) => {
                                const turnoEncontrado = turnosOcupados.find((t) => {
                                    return new Date(`${t.fecha}T03:00:00.000Z`).toLocaleDateString() === date.toLocaleDateString();
                                });
                                if (turnoEncontrado) {
                                    // Aplicar la lógica de cantidad
                                    if (turnoEncontrado.cantidad >= cantidad.rojo) {
                                        return 'rojo';
                                    } else if (turnoEncontrado.cantidad >= cantidad.amarillo) {
                                        return 'amarillo';
                                    } else {
                                        return 'verde';
                                    }
                                }
                                return ''; // Si no se encuentra ningún turno coincidente
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label >Nombre</label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value={turno.nombre}
                            onChange={handleChange}
                            autoCapitalize='words'
                            autoComplete='off'
                        />
                    </div>
                    <div className="form-group">
                        <label >Cantidad</label>
                        <input
                            type="text"
                            id="cantidad"
                            name="cantidad"
                            value={turno.cantidad}
                            onChange={handleChange}
                            autoComplete='off'
                        />
                    </div>
                    <div className="form-group">
                        <label >Observaciones</label>
                        <textarea
                            id="observaciones"
                            name="observaciones"
                            value={turno.observaciones}
                            onChange={handleChange}
                            autoComplete='off'
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <button className="generar-codigo" type="submit">Guardar</button>
                    </div>
                </form>
            </div>
            <div className='tabla-container'>
                <div className="buscador">
                    <input
                        type="text"
                        placeholder="Buscar reserva..."
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
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
                <div className="tabla-productos">
                    <table>
                        <thead>
                            <tr className='titulos-tabla'>
                                <th>Fecha</th>
                                <th>Turno</th>
                                <th>Nombre</th>
                                <th>Cantidad</th>
                                <th>Observaciones</th>
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {turnos?.map((turno) => (
                                <tr key={turno._id}>
                                    <td>{turno.fecha}</td>
                                    <td>{turno.turno}</td>
                                    <td>{turno.nombre}</td>
                                    <td>{turno.cantidad}</td>
                                    <td>{turno.observaciones}</td>
                                    <td onClick={() => editar(turno)} className='editar'>
                                        <i className="bi bi-pencil-square"></i>
                                    </td>
                                    <td className="editar">
                                        <i className="bi bi-cash-coin"></i>
                                    </td>
                                    <td onClick={() => deleteTurno(turno)} className="editar">
                                        <i className="bi bi-trash3-fill"></i>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Reservas;