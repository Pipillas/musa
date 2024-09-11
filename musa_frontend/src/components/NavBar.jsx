import React from 'react';

import logo from '../assets/musa.jpg'; // Ajusta la ruta según la ubicación de tu archivo

const NavBar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-left">
                <div onClick={() => window.location.href = "/info"} className="navbar-logo">
                    <img className='logo-nav' src={logo} alt="MUSA Logo" />
                </div>
                <ul className="navbar-links navbar-ventas">
                    <li><a href="/info">INFO</a></li>
                    <li><a href="/carrito">CARRITO</a></li>
                    <li><a href="/ventas">VENTAS</a></li>
                </ul>
            </div>
            <div className="navbar-right">
                <ul className="navbar-links navbar-admin">
                    <li><a href="/">INVENTARIO</a></li>
                    <li><a href="/caja">CAJA</a></li>
                    <li><a href="/estadisticas">ESTADISTICAS</a></li>
                    <li><a href="/estadisticas">DEGUSTACION</a></li>
                </ul>
            </div>
        </nav>
    );
}

export default NavBar;