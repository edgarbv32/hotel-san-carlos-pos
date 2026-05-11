// src/pages/Entradas.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import PrintTicket from '../components/PrintTicket';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Printer } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useAuth } from '../context/AuthContext';
// ---- NUEVO: Se importa la función 'confirm' de la API de diálogo de Tauri ----
import { confirm } from '@tauri-apps/api/dialog';


export default function Entradas() {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const [reservas, setReservas] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({});
  
  const [todasLasReservas, setTodasLasReservas] = useState([]);

  const [reservaParaImprimir, setReservaParaImprimir] = useState(null);
  const [fontSize, setFontSize] = useState(10); 
  
  const ticketRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: 'ticket_checkin'
  });

  const fetchPendientes = async () => {
    try {
      const data = await invoke('get_reservations');
      setTodasLasReservas(data); 
      setReservas(data.filter(r => r.status === 'pendiente'));
    } catch (e) {
      console.error('❌ Error al cargar pendientes:', e);
      toast.error(`Error al cargar pendientes: ${String(e)}`);
    }
  };

  useEffect(() => {
    const savedSize = localStorage.getItem('ticketFontSize');
    if (savedSize) {
      setFontSize(parseInt(savedSize, 10));
    }
    fetchPendientes();
  }, []);
  
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('ticketFontSize', size);
    toast.info(`Tamaño de letra del ticket ajustado.`);
  };

  const handleCheckIn = async (id) => {
    const res = reservas.find(r => r.id === id);
    if (!res || !res.room_id) {
      toast.error("Esta reservación no tiene una habitación asignada.");
      return;
    }

    const habitacionOcupada = todasLasReservas.find(
      r => r.room_id === res.room_id && r.status === 'checkedIn'
    );

    if (habitacionOcupada) {
      toast.error(`Error: La habitación ${res.room_id} ya está ocupada por ${habitacionOcupada.name}. No se puede hacer el check-in.`);
      return;
    }

    if (res.remaining_amount > 0) {
        // ---- CORRECCIÓN: Se reemplaza window.confirm por la función 'confirm' de Tauri ----
        const confirmed = await confirm('Esta reservación tiene un saldo pendiente. ¿Deseas hacer el check-in de todos modos?', {
          title: 'Saldo Pendiente',
          type: 'warning'
        });
        if (!confirmed) {
            return; // Si el usuario cancela, la función termina aquí.
        }
    }
    try {
      await invoke('update_reservation_status', { id, status: 'checkedIn' });
      toast.success('Check-in realizado correctamente');
      setReservaParaImprimir(res);
      setTimeout(handlePrint, 300);
      fetchPendientes();
    } catch (e) {
      console.error('❌ Error en el check-in:', e);
      toast.error(`Error en el check-in: ${String(e)}`);
    }
  };
  
  const handleCancelar = async (res) => {
    // ---- CORRECCIÓN: Se reemplaza window.confirm por la función 'confirm' de Tauri ----
    const confirmed = await confirm('¿Estás seguro de que deseas cancelar esta reservación? La habitación volverá a estar disponible.', {
        title: 'Confirmar Cancelación',
        type: 'warning'
    });
    
    if (!confirmed) {
        return; // Si el usuario cancela, la función termina aquí.
    }

    const cancellationData = {
      reservation_id: res.id,
      guest_name: res.name,
      cancel_date: new Date().toISOString().split('T')[0],
      reason: "Cancelada desde pantalla de Entradas",
      refund_amount: 0.0,
    };

    try {
      await invoke('update_reservation_status', {
        id: res.id,
        status: 'cancelada'
      });
      await invoke('save_cancellation', { c: cancellationData });
      
      toast.warn(`La reservación para ${res.name} ha sido cancelada.`);
      fetchPendientes();

    } catch (e) {
      console.error('❌ Error al cancelar reserva:', e);
      toast.error(`Error al cancelar: ${String(e)}`);
    }
  };

  const handleAplicarPago = async (res) => {
    const details = paymentDetails[res.id] || {};
    const abono = parseFloat(details.amount || 0);

    if (abono <= 0) {
      toast.error('Ingresa un monto válido para el abono.');
      return;
    }
    if (details.method === 'Tarjeta' && (!details.approvalCode || !details.lastDigits)) {
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
        cardDigits: details.lastDigits || null,
      });
      toast.success(`Pago de $${abono.toFixed(2)} aplicado con ${details.method}.`);
      setPaymentDetails(prev => ({ ...prev, [res.id]: { amount: '', method: 'Efectivo', approvalCode: '', lastDigits: ''} }));
      fetchPendientes();
    } catch (e) {
      console.error('❌ Error al aplicar pago:', e);
      toast.error(`Error al aplicar pago: ${String(e)}`);
    }
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

  const triggerPrint = (reserva) => {
    setReservaParaImprimir(reserva);
    setTimeout(handlePrint, 100);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Entradas (Check-In)</h1>
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
            <th className="py-2 px-4 text-left">Check-In</th>
            <th className="py-2 px-4 text-left">Check-Out</th>
            <th className="py-2 px-4 text-center">Hab.</th>
            <th className="py-2 px-4 text-right">Pagado</th>
            <th className="py-2 px-4 text-right">Restante</th>
            <th className="py-2 px-4 text-center">Abono</th>
            <th className="py-2 px-4 text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map(r => {
            const currentPayment = paymentDetails[r.id] || { method: 'Efectivo', amount: '', approvalCode: '', lastDigits: '' };
            return (
            <tr key={r.id} className="text-center border-t">
              <td className="px-4 py-2 text-left">{r.name}</td>
              <td className="px-4 py-2 text-left">{r.checkin_date}</td>
              <td className="px-4 py-2 text-left">{r.checkout_date}</td>
              <td className="px-4 py-2 text-center">{r.room_id}</td>
              <td className="px-4 py-2 text-right">${(r.amount_paid || 0).toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-bold text-red-600">${(r.remaining_amount || 0).toFixed(2)}</td>

              <td className="border px-4 py-2">
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
                                value={currentPayment.lastDigits}
                                onChange={e => handlePaymentChange(r.id, 'lastDigits', e.target.value)}
                                className="w-full border rounded px-2 py-1" maxLength="4" />
                        </>
                    )}
                    <button
                        onClick={() => handleAplicarPago(r)} disabled={!currentPayment.amount}
                        className="w-full px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300" >
                        Pagar
                    </button>
                </div>
              </td>

              <td className="border px-4 py-2">
                <div className="flex flex-col items-center space-y-2">
                    <button onClick={() => handleCheckIn(r.id)} className="w-24 px-3 py-1 rounded bg-green-500 text-white" >
                        Check-In
                    </button>
                    <button onClick={() => triggerPrint(r)} className="w-24 px-2 py-1 bg-sky-500 text-white rounded flex items-center justify-center">
                        <Printer size={16} className="mr-2" />
                        Ticket
                    </button>
                    {user && (user.role === 'admin' || user.role === 'recepcionista') && (
                        <button onClick={() => handleCancelar(r)} className="w-24 px-3 py-1 bg-orange-500 text-white rounded">
                            Cancelar
                        </button>
                    )}
                </div>
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