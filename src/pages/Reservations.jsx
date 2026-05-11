// src/pages/Reservations.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { invoke } from "@tauri-apps/api/tauri";

const KING_SIZE_ROOMS = [1, 6, 7, 12];
const DOUBLE_ROOMS = [2, 3, 4, 5, 8, 9, 10, 11];

function Reservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [prices, setPrices] = useState(null);
  
  const [form, setForm] = useState({
    name: '', phone: '', checkin: '', checkout: '', clientType: '',
    roomId: '', payment: '', amountPaid: '', inePhoto: null,
    inePhotoUrl: '', approvalCode: '', cardDigits: ''
  });

  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  
  const initialRooms = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ 
    id: i + 1, 
    type: KING_SIZE_ROOMS.includes(i + 1) ? 'King Size' : 'Doble Matrimonial' 
  })), [KING_SIZE_ROOMS]);

  const defaultPrices = { fisica_king: 1000.00, moral_king: 989.60, fisica_doble: 1000.00, moral_doble: 989.60 };

  const loadData = async () => {
    try {
      const resData = await invoke('get_reservations');
      setReservations(resData || []);
    } catch (e) {
      console.error("Error al cargar reservaciones, asumiendo vacío:", e);
      setReservations([]);
    }

    try {
      const priceData = await invoke('get_prices');
      if (priceData && Object.keys(priceData).length > 0) {
        setPrices(priceData);
      } else {
        console.log("No se encontraron precios en la BD, usando precios por defecto.");
        setPrices(defaultPrices);
      }
    } catch (e) {
      console.error("Error al cargar precios, usando precios por defecto:", e);
      toast.warn("No se pudieron cargar las tarifas. Se usarán los precios por defecto.");
      setPrices(defaultPrices);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isRoomAvailable = (roomNum, checkin, checkout) => {
    if (!checkin || !checkout || checkin >= checkout) {
      return true;
    }

    const newCheckinDate = new Date(`${checkin}T00:00:00`);
    const newCheckoutDate = new Date(`${checkout}T00:00:00`);

    if (isNaN(newCheckinDate) || isNaN(newCheckoutDate)) {
        return true; 
    }

    const hasConflict = reservations.some(r => {
      if (!r.checkin_date || !r.checkout_date || !r.room_id) {
          return false;
      }
        
      const existingCheckinDate = new Date(`${r.checkin_date}T00:00:00`);
      const existingCheckoutDate = new Date(`${r.checkout_date}T00:00:00`);
      
      if (isNaN(existingCheckinDate) || isNaN(existingCheckoutDate)) {
          return false;
      }
      
      const isConflict = (
        Number(r.room_id) === roomNum &&
        r.status !== 'cancelada' &&
        newCheckinDate < existingCheckoutDate &&
        newCheckoutDate > existingCheckinDate
      );
      
      if (isConflict) {
        console.log(`Conflicto para Habitación #${roomNum}. Choca con reservación existente:`, r);
      }

      return isConflict;
    });

    return !hasConflict;
  };

  useEffect(() => {
    if (form.checkin && form.checkout && form.clientType && form.roomId && prices) {
      const checkInDate = new Date(`${form.checkin}T00:00:00`);
      const checkOutDate = new Date(`${form.checkout}T00:00:00`);
      const nights = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);
      
      if (nights > 0) {
        const room = initialRooms.find(rm => rm.id === parseInt(form.roomId));
        if (!room) return;

        const clientKey = form.clientType.toLowerCase();
        const roomKey = room.type.startsWith('King') ? 'king' : 'doble';
        const priceKey = `${clientKey}_${roomKey}`;
        
        const price = prices[priceKey] || 0;
        const calcTotal = price * nights;
        setTotal(calcTotal);

        const paid = parseFloat(form.amountPaid || 0);
        setRemaining(Math.max(calcTotal - paid, 0));
      } else {
        setTotal(0);
        setRemaining(0);
      }
    } else {
      setTotal(0);
      setRemaining(0);
    }
  }, [form.checkin, form.checkout, form.clientType, form.roomId, form.amountPaid, prices, initialRooms]);


  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setForm(prev => ({ ...prev, inePhotoUrl: '' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, inePhotoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ---- CORRECCIÓN 2: Permite guardar reservaciones con total $0.00 ----
    // Se cambia (total <= 0) por (total < 0) para permitir $0.00
    if (total < 0) {
      toast.error("El total no puede ser negativo. Verifica las fechas y los datos.");
      return;
    }
    // ---- FIN DE CORRECCIÓN 2 ----
    
    const nuevaReservacion = {
      name: form.name,
      phone: form.phone,
      checkin_date: form.checkin,
      checkout_date: form.checkout,
      client_type: form.clientType,
      room_id: parseInt(form.roomId) || null,
      payment_method: form.payment,
      amount_paid: parseFloat(form.amountPaid || 0),
      total_amount: total,
      remaining_amount: remaining,
      status: 'pendiente',
      services: null,
      ine_photo_url: form.inePhotoUrl || null,
      payment_approval_code: form.approvalCode || null,
      card_last_digits: form.cardDigits || null,
    };

    try {
      await invoke('add_reservation', { res: nuevaReservacion });
      toast.success('✅ Reservación guardada');
      setForm({ 
        name: '', phone: '', checkin: '', checkout: '', clientType: '', 
        roomId: '', payment: '', amountPaid: '', inePhoto: null, 
        inePhotoUrl: '', approvalCode: '', cardDigits: ''
      });
      if(e.target.querySelector('input[type="file"]')) {
          e.target.querySelector('input[type="file"]').value = '';
      }
      loadData();
    } catch (error) {
      toast.error(`Error: ${error}`);
      console.error(error);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8">
      <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline w-fit flex items-center">
        <ArrowLeft className="mr-2" /> Volver
      </button>
      <h1 className="text-3xl font-bold text-gray-800">Reservaciones</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded shadow">
        <input name="name" placeholder="Nombre" value={form.name} onChange={handleChange} className="border p-2 rounded" required />
        <input name="phone" placeholder="Teléfono" value={form.phone} onChange={handleChange} className="border p-2 rounded" />
        <input type="date" name="checkin" value={form.checkin} onChange={handleChange} className="border p-2 rounded" required />
        <input type="date" name="checkout" value={form.checkout} onChange={handleChange} className="border p-2 rounded" required />
        <select name="clientType" value={form.clientType} onChange={handleChange} className="border p-2 rounded" required>
          <option value="">Tipo de cliente</option>
          <option value="fisica">Física</option>
          <option value="moral">Moral</option>
        </select>
        
        <select name="roomId" value={form.roomId} onChange={handleChange} className="border p-2 rounded" required>
            <option value="">Selecciona una habitación...</option>
            <optgroup label="King Size">
                {KING_SIZE_ROOMS.map(roomNum => {
                    const isAvailable = isRoomAvailable(roomNum, form.checkin, form.checkout);
                    return (
                        <option key={roomNum} value={roomNum} disabled={!isAvailable}>
                            Habitación {roomNum} {!isAvailable ? '(No disponible)' : ''}
                        </option>
                    );
                })}
            </optgroup>
            <optgroup label="Dobles Matrimoniales">
                {DOUBLE_ROOMS.map(roomNum => {
                    const isAvailable = isRoomAvailable(roomNum, form.checkin, form.checkout);
                    return (
                        <option key={roomNum} value={roomNum} disabled={!isAvailable}>
                           Habitación {roomNum} {!isAvailable ? '(No disponible)' : ''}
                        </option>
                    );
                })}
            </optgroup>
        </select>

        <select name="payment" value={form.payment} onChange={handleChange} className="border p-2 rounded">
          <option value="">Método de pago</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="Transferencia">Transferencia</option>
        </select>
        <input name="amountPaid" placeholder="Cantidad pagada" type="number" value={form.amountPaid} onChange={handleChange} className="border p-2 rounded" />
        
        {form.payment === 'Tarjeta' && (
          <>
            <input name="approvalCode" placeholder="Cód. Aprobación" value={form.approvalCode} onChange={handleChange} className="border p-2 rounded" />
            <input name="cardDigits" placeholder="Últimos 4 dígitos" value={form.cardDigits} maxLength="4" onChange={handleChange} className="border p-2 rounded" />
          </>
        )}

        <input type="file" accept="image/*" onChange={handlePhotoChange} className="border p-2 rounded md:col-span-2" />
        <div className="md:col-span-2 flex justify-between text-blue-700 font-semibold border-t pt-4 mt-4">
          <div>Total: ${total.toFixed(2)}</div>
          <div>Restante: ${remaining.toFixed(2)}</div>
        </div>
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex gap-2 items-center justify-center md:col-span-2">
          <PlusCircle size={18} /> Guardar reservación
        </button>
      </form>
      <ToastContainer position="bottom-right" />
    </div>
  );
}
export default Reservations;