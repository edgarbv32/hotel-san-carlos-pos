import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Edit, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

const servicesList = [
  'Control TV',
  'Control Mini split',
  'Plancha',
  'Secadora de cabello',
  'Llave caja fuerte',
];

// ---- NUEVO: Constantes para los números de habitación por tipo ----
const KING_SIZE_ROOMS = [1, 6, 7, 12];
const DOUBLE_ROOMS = [2, 3, 4, 5, 8, 9, 10, 11];

export default function Habitaciones() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [services, setServices] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  
  // ---- NUEVO: Estado para guardar las tarifas de precios ----
  const [prices, setPrices] = useState(null);

  const fetchCheckedInGuests = async () => {
    try {
      // ---- NUEVO: Cargar los precios al iniciar ----
      const priceData = await invoke('get_prices');
      setPrices(priceData);

      const data = await invoke('get_reservations');
      const checkedIn = data.filter(r => r.status === 'checkedIn');
      setGuests(checkedIn);

      const initServices = {};
      checkedIn.forEach(r => {
        try {
          initServices[r.id] = r.services ? JSON.parse(r.services) : [];
        } catch {
          initServices[r.id] = [];
        }
      });
      setServices(initServices);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('No se pudieron cargar los datos de las habitaciones.');
    }
  };

  useEffect(() => {
    fetchCheckedInGuests();
  }, []);

  const handleToggle = (id, service) => {
    setServices(prev => {
      const current = prev[id] || [];
      const updated = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, [id]: updated };
    });
  };

  const handleSaveServices = async (id) => {
    try {
      const toSave = services[id] || [];
      await invoke('update_reservation_services', { id, services: toSave });
      toast.success('Servicios guardados correctamente.');
    } catch (error) {
      console.error('Error al guardar servicios:', error);
      toast.error('Error al guardar los servicios.');
    }
  };

  const handleOpenEditModal = (reservation) => {
    setEditingReservation(reservation);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingReservation(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingReservation(prev => ({ ...prev, [name]: value }));
  };

  // ---- CORRECCIÓN: Lógica para recalcular el total al cambiar la fecha de salida ----
  useEffect(() => {
    if (editingReservation && editingReservation.checkin_date && editingReservation.checkout_date && prices) {
      const checkInDate = new Date(`${editingReservation.checkin_date}T00:00:00`);
      const checkOutDate = new Date(`${editingReservation.checkout_date}T00:00:00`);
      const nights = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);

      if (nights > 0) {
        // Determinar el tipo de habitación y cliente para obtener el precio correcto
        const roomType = KING_SIZE_ROOMS.includes(editingReservation.room_id) ? 'king' : 'doble';
        const clientType = editingReservation.client_type.toLowerCase();
        const priceKey = `${clientType}_${roomType}`;
        
        const pricePerNight = prices[priceKey] || 0;
        const newTotalAmount = pricePerNight * nights;
        const newRemainingAmount = Math.max(0, newTotalAmount - editingReservation.amount_paid);

        setEditingReservation(prev => ({
          ...prev,
          total_amount: newTotalAmount,
          remaining_amount: newRemainingAmount,
        }));
      }
    }
  }, [editingReservation?.checkout_date, prices]); // Se ejecuta cada vez que cambia la fecha de salida


  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    if (!editingReservation) return;
    
    try {
      await invoke('update_reservation', { res: editingReservation });
      toast.success('Reservación actualizada con éxito');
      handleCloseEditModal();
      fetchCheckedInGuests();
    } catch (error) {
      console.error('Error al actualizar la reservación:', error);
      toast.error(`No se pudo actualizar la reservación: ${error}`);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center mb-4 text-blue-600 hover:underline"
      >
        <ArrowLeft className="mr-2" size={24} /> Volver
      </button>

      <h1 className="text-2xl font-bold mb-4">Habitaciones Ocupadas</h1>

      {guests.length === 0 ? (
        <p>No hay huéspedes hospedados actualmente.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {guests.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4 flex flex-col h-full">
              <div className="flex items-center mb-4 space-x-4">
                {r.ine_photo_url && (
                  <a href={r.ine_photo_url} download={`INE_${r.name}`}>
                    <img
                      src={r.ine_photo_url}
                      alt="INE"
                      className="w-16 h-16 rounded object-cover"
                    />
                  </a>
                )}
                <div className="flex-1 text-sm">
                  <h2 className="font-semibold truncate">{r.name}</h2>
                  <p className="text-gray-600 truncate">{r.phone}</p>
                  <p><span className="font-semibold">Habitación:</span> {r.room_id}</p>
                  <p><span className="font-semibold">Pago:</span> ${r.amount_paid?.toFixed(2)}</p>
                  <p><span className="font-semibold">Restante:</span> ${r.remaining_amount?.toFixed(2)}</p>
                  <p><span className="font-semibold">Entrada:</span> {r.checkin_date}</p>
                  <p><span className="font-semibold">Salida:</span> {r.checkout_date}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 text-sm">
                <p className="font-semibold mb-1">Servicios:</p>
                <div className="grid grid-cols-2 gap-1">
                  {servicesList.map(s => (
                    <label key={s} className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={services[r.id]?.includes(s)}
                        onChange={() => handleToggle(r.id, s)}
                        className="mr-1 w-4 h-4"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                    onClick={() => handleSaveServices(r.id)}
                    className="flex-1 bg-green-500 text-white py-2 rounded text-sm"
                >
                    Guardar servicios
                </button>
                <button
                    onClick={() => handleOpenEditModal(r)}
                    className="flex-1 bg-yellow-500 text-white py-2 rounded text-sm flex items-center justify-center gap-1"
                >
                    <Edit size={14}/> Editar
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
      
      {isEditModalOpen && editingReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Reservación #{editingReservation.id}</h2>
              <button onClick={handleCloseEditModal} className="text-gray-500 hover:text-gray-800">
                <X size={24}/>
              </button>
            </div>
            <form onSubmit={handleUpdateReservation} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Huésped</label>
                    <input type="text" name="name" value={editingReservation.name} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="text" name="phone" value={editingReservation.phone || ''} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Salida (Check-Out)</label>
                    <input type="date" name="checkout_date" value={editingReservation.checkout_date} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                </div>
                
                {/* ---- NUEVO: Se muestran los montos recalculados ---- */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-500">Nuevo Monto Total:</p>
                    <p className="font-bold text-lg">${editingReservation.total_amount?.toFixed(2)}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-500">Nuevo Restante:</p>
                    <p className="font-bold text-lg text-red-600">${editingReservation.remaining_amount?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={handleCloseEditModal} className="bg-gray-200 text-gray-800 py-2 px-4 rounded">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">Guardar Cambios</button>
                </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}