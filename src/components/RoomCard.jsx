// src/components/RoomCard.jsx
import React from 'react';
import { Bell } from 'lucide-react';

// CORRECCIÓN: Se elimina el hook useMemo y la lógica de fechas.
// El componente ahora es más simple y solo se encarga de mostrar datos.
export default function RoomCard({ number, isOccupied, reservation, isCheckoutToday }) {

  const statusText = isOccupied ? 'Ocupada' : 'Libre';

  return (
    <div
      className={`relative rounded-lg shadow-lg p-4 text-center font-semibold ${
        isOccupied
          ? 'bg-red-100 border-red-300 text-red-800'
          : 'bg-green-100 border-green-300 text-green-800'
      } border-2`}
    >
      {/* La lógica no cambia, solo depende de la nueva prop */}
      {isCheckoutToday && (
        <Bell className="absolute top-2 right-2 h-5 w-5 text-orange-600 animate-pulse" />
      )}
      <span className="text-lg">Habitación {number}</span>
      <span className="block mt-1 text-sm font-normal">{statusText}</span>
      {isOccupied && reservation && (
        <span className="block mt-1 text-xs font-bold">
          Sale: {reservation.checkout_date}
        </span>
      )}
    </div>
  );
}