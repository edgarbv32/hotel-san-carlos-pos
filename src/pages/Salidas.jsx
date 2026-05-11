// src/pages/Salidas.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import PrintTicket from '../components/PrintTicket';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
// ---- NUEVO: Se importa la función 'confirm' de la API de diálogo de Tauri ----
import { confirm } from '@tauri-apps/api/dialog';

export default function Salidas() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [reservaParaImprimir, setReservaParaImprimir] = useState(null);
  const [fontSize, setFontSize] = useState(10);
  
  const [paymentDetails, setPaymentDetails] = useState({});

  const ticketRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
  });

  const fetchCheckedIn = async () => {
    try {
      const data = await invoke('get_reservations');
      setReservas(data.filter(r => r.status === 'checkedIn'));
    } catch (e) {
      console.error('❌ Error al cargar huéspedes:', e);
      toast.error(`Error al cargar huéspedes: ${String(e)}`);
    }
  };

  useEffect(() => {
    const savedSize = localStorage.getItem('ticketFontSize');
    if (savedSize) {
      setFontSize(parseInt(savedSize, 10));
    }
    fetchCheckedIn();
  }, []);

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('ticketFontSize', size);
    toast.info(`Tamaño de letra del ticket ajustado.`);
  };

  const handleCheckOut = async (id) => {
    const reserva = reservas.find(r => r.id === id);
    if (!reserva) return;

    if (reserva.remaining_amount > 0) {
      toast.error('No se puede hacer check-out. El huésped tiene un saldo pendiente.');
      return;
    }
    
    // ---- CORRECCIÓN: Se reemplaza window.confirm por la función 'confirm' de Tauri ----
    const confirmed = await confirm(`¿Confirmar check-out para ${reserva.name}?`, {
        title: 'Confirmación de Check-Out',
        type: 'info'
    });

    if (confirmed) {
      try {
        await invoke('update_reservation_status', { id, status: 'checkedOut' });
        toast.success('✅ Check-out realizado correctamente');
        
        fetchCheckedIn();
      } catch (e) {
        console.error('❌ Error en el check-out:', e);
        toast.error(`Error en el check-out: ${String(e)}`);
      }
    }
    // Si 'confirmed' es falso (el usuario pulsa Cancelar), no se hace nada.
  };
  
  const handlePaymentChange = (id, field, value) => {
    setPaymentDetails(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleAplicarPago = async (res) => {
    const details = paymentDetails[res.id] || {};
    const abono = parseFloat(details.amount || 0);

    if (abono <= 0) {
      toast.error('Ingresa un monto válido para el abono.');
      return;
    }
    if (abono > res.remaining_amount) {
      toast.error('El monto no puede ser mayor al saldo restante.');
      return;
    }
    if (details.method === 'Tarjeta' && (!details.approvalCode || !details.cardDigits)) {
        toast.error('Para pagos con tarjeta, el código de aprobación y los últimos 4 dígitos son obligatorios.');
        return;
    }

    const nuevoPaid = (res.amount_paid || 0) + abono;
    const nuevoRemaining = Math.max((res.remaining_amount || 0) - abono, 0);

    try {
      await invoke('update_reservation_payment', {
        id: res.id,
        newAmountPaid: nuevoPaid,
        newRemainingAmount: nuevoRemaining,
        paymentMethod: details.method,
        approvalCode: details.approvalCode || null,
        cardDigits: details.cardDigits || null,
      });
      toast.success(`Pago de $${abono.toFixed(2)} aplicado con ${details.method}.`);
      setPaymentDetails(prev => ({ ...prev, [res.id]: undefined }));
      fetchCheckedIn();
    } catch (e) {
      console.error('❌ Error al aplicar pago:', e);
      toast.error(`Error al aplicar pago: ${String(e)}`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Salidas (Check-Out)</h1>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tamaño de letra del Ticket:</span>
            <button onClick={() => handleFontSizeChange(8)} className={`px-2 py-1 text-xs rounded ${fontSize === 8 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pequeña</button>
            <button onClick={() => handleFontSizeChange(10)} className={`px-2 py-1 text-xs rounded ${fontSize === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mediana</button>
            <button onClick={() => handleFontSizeChange(12)} className={`px-2 py-1 text-xs rounded ${fontSize === 12 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Grande</button>
        </div>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center mb-4 text-blue-600 hover:underline"
      >
        <ArrowLeft className="mr-2" size={24} />
        Volver
      </button>

      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-4 text-left">Nombre</th>
            <th className="py-2 px-4 text-left">Check-Out</th>
            <th className="py-2 px-4 text-center">Hab.</th>
            <th className="py-2 px-4 text-right">Pagado</th>
            <th className="py-2 px-4 text-right">Restante</th>
            <th className="py-2 px-4 text-center">Saldar Cuenta</th>
            <th className="py-2 px-4 text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map(r => {
            const currentPayment = paymentDetails[r.id] || { method: 'Efectivo', amount: r.remaining_amount.toString(), approvalCode: '', cardDigits: '' };
            return(
            <tr key={r.id} className="text-center border-t">
              <td className="px-4 py-2 text-left">{r.name}</td>
              <td className="px-4 py-2 text-left">{r.checkout_date}</td>
              <td className="px-4 py-2 text-center">{r.room_id}</td>
              <td className="px-4 py-2 text-right">${(r.amount_paid || 0).toFixed(2)}</td>
              <td className={`px-4 py-2 text-right font-bold ${r.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${(r.remaining_amount || 0).toFixed(2)}
              </td>

              <td className="px-4 py-2">
                {r.remaining_amount > 0 && (
                  <div className="flex flex-col space-y-2 w-52 mx-auto">
                      <input
                          type="number" min="0" placeholder="Monto"
                          value={currentPayment.amount}
                          onChange={e => handlePaymentChange(r.id, 'amount', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-center" />
                      <select
                          value={currentPayment.method}
                          onChange={e => handlePaymentChange(r.id, 'method', e.target.value)}
                          className="w-full border rounded px-2 py-1" >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                      </select>
                      {currentPayment.method === 'Tarjeta' && (
                          <>
                              <input
                                  type="text" placeholder="Cód. Aprobación"
                                  value={currentPayment.approvalCode}
                                  onChange={e => handlePaymentChange(r.id, 'approvalCode', e.target.value)}
                                  className="w-full border rounded px-2 py-1" />
                              <input
                                  type="text" placeholder="Últimos 4 dígitos"
                                  value={currentPayment.cardDigits}
                                  onChange={e => handlePaymentChange(r.id, 'cardDigits', e.target.value)}
                                  className="w-full border rounded px-2 py-1" maxLength="4" />
                          </>
                      )}
                      <button
                          onClick={() => handleAplicarPago(r)} disabled={!currentPayment.amount}
                          className="w-full px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300" >
                          Pagar
                      </button>
                  </div>
                )}
              </td>
              
              <td className="px-4 py-2">
                <button
                  onClick={() => handleCheckOut(r.id)}
                  disabled={r.remaining_amount > 0}
                  className={`w-full px-3 py-1 rounded ${
                    r.remaining_amount > 0
                      ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Check-Out
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      <div style={{ display: 'none' }}>
        <PrintTicket ref={ticketRef} data={reservaParaImprimir} fontSize={fontSize} />
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}