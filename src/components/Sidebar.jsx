import React from 'react';
import { NavLink } from 'react-router-dom';
import { DollarSign, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { user } = useAuth();

  return (
    <div className="w-64 h-screen bg-gray-100 p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-8">Menú Principal</h2>
      <nav className="flex flex-col gap-4 text-gray-700 flex-grow">
        <NavLink to="/reservations" className="hover:text-blue-600 transition">
          Reservaciones
        </NavLink>
        <NavLink to="/entradas" className="hover:text-blue-600 transition">
          Entradas
        </NavLink>
        <NavLink to="/salidas" className="hover:text-blue-600 transition">
          Salidas
        </NavLink>
        <NavLink to="/habitaciones" className="hover:text-blue-600 transition">
          Habitaciones
        </NavLink>
        {user?.role !== 'recepcionista' && (
          <NavLink to="/reports" className="hover:text-blue-600 transition">
            Reportes
          </NavLink>
        )}
        {user?.role !== 'recepcionista' && (
          <NavLink to="/precios" className="hover:text-blue-600 transition flex items-center gap-2">
            <DollarSign size={16} /> Precios
          </NavLink>
        )}
        {user?.role !== 'recepcionista' && (
          <NavLink to="/consultas" className="hover:text-blue-600 transition">
            Consultas
          </NavLink>
        )}
      </nav>
      <NavLink
        to="/login"
        className="mt-auto text-red-600 hover:text-red-800 transition flex items-center gap-2"
      >
        <LogOut size={16} /> Cambiar Usuario
      </NavLink>
    </div>
  );
}

export default Sidebar;