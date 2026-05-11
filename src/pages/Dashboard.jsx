// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, PlusCircle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { invoke } from '@tauri-apps/api/tauri';
import RoomCard from '../components/RoomCard';

// ---- CORRECCIÓN: Se mueve la habitación 6 de Dobles a King Size ----
const KING_SIZE_ROOMS = [1, 6, 7, 12];
const DOUBLE_ROOMS = [2, 3, 4, 5, 8, 9, 10, 11];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeGuests, setActiveGuests] = useState(0);

  // ---- CORRECCIÓN 3: Estado para el selector de fecha ----
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function fetchData() {
      let reservationData = []; 

      try {
        reservationData = await invoke('get_reservations');
      } catch (e) {
        toast.info("No se encontraron reservaciones. Mostrando estado por defecto.");
        console.error('Error cargando reservaciones, se asume BD nueva:', e);
      }

      // ---- CORRECCIÓN 1 y 3: Lógica para encontrar reservación activa en la fecha seleccionada ----
      const checkDate = new Date(selectedDate + 'T00:00:00');

      const allRooms = Array.from({ length: 12 }, (_, i) => {
        const roomNumber = i + 1;
        
        const reservation = reservationData.find(r => {
          if (Number(r.room_id) !== roomNumber) return false;
          // Ignora si ya fue cancelada o ya salió
          if (r.status === 'cancelada' || r.status === 'checkedOut') return false;

          const checkIn = new Date(r.checkin_date + 'T00:00:00');
          const checkOut = new Date(r.checkout_date + 'T00:00:00');
          
          // La habitación está ocupada/reservada si la fecha seleccionada:
          // es igual o mayor que el check-in Y es menor que el check-out
          return checkDate >= checkIn && checkDate < checkOut;
        });
        // ---- FIN DE CORRECCIÓN 1 y 3 ----

        return {
          id: roomNumber,
          isOccupied: !!reservation, // 'isOccupied' ahora significa "No Disponible"
          reservation: reservation || null,
        };
      });

      setRooms(allRooms);
      
      // Esta lógica de "activeGuests" sigue contando solo los 'checkedIn' de *hoy*
      const todayString = new Date().toISOString().slice(0, 10);
      const occupiedCount = reservationData.filter(
        r => r.status === 'checkedIn'
      ).length;
      setActiveGuests(occupiedCount);


      // Lógica de notificación de checkouts (Solo se ejecuta si la fecha seleccionada es hoy)
      if (selectedDate === todayString) {
        const pendingCheckouts = reservationData.filter(r =>
          r.status === 'checkedIn' && r.checkout_date === todayString
        );

        if (pendingCheckouts.length > 0) {
          const toastId = 'pending-checkouts-toast';
          const message = `Hay ${pendingCheckouts.length} salida(s) para hoy. ¡Clic para ver!`;

          if (!toast.isActive(toastId)) {
            toast.info(message, {
              toastId: toastId,
              onClick: () => navigate('/salidas'),
              autoClose: 10000,
            });
          }
        }
      }
    }
    
    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  // ---- CORRECCIÓN 3: Se añade selectedDate a las dependencias del useEffect ----
  }, [navigate, selectedDate]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* ---- INICIO DE CORRECCIÓN 3: Buscador por fecha ---- */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <label htmlFor="availabilityDate" className="block text-sm font-medium text-gray-700 mb-2">
          Verificar disponibilidad para la fecha:
        </label>
        <input
          type="date"
          id="availabilityDate"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>
      {/* ---- FIN DE CORRECCIÓN 3 ---- */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6 flex items-center">
          <Users className="w-8 h-8 text-blue-600 mr-4" />
          <div>
            <p className="text-sm font-medium text-gray-500">Huéspedes Activos (Hoy)</p>
            <p className="text-2xl font-bold">{activeGuests}</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6 flex items-center">
          <PlusCircle className="w-8 h-8 text-green-600 mr-4" />
          <div>
            <p className="text-sm font-medium text-gray-500">Habitaciones Ocupadas (Hoy)</p>
            <p className="text-2xl font-bold">{activeGuests}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">King Size</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          {rooms
            .filter(room => KING_SIZE_ROOMS.includes(room.id))
            .map((room) => (
              <RoomCard
                key={room.id}
                number={room.id}
                isOccupied={room.isOccupied}
                reservation={room.reservation}
              />
            ))}
        </div>

        <h2 className="text-xl font-semibold mb-3 border-b pb-2">Dobles Matrimoniales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {rooms
            .filter(room => DOUBLE_ROOMS.includes(room.id))
            .map((room) => (
              <RoomCard
                key={room.id}
                number={room.id}
                isOccupied={room.isOccupied}
                reservation={room.reservation}
              />
            ))}
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}