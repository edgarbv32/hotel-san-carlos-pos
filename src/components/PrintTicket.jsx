// src/components/PrintTicket.jsx
import React from 'react';

const PrintTicket = React.forwardRef(({ data, fontSize }, ref) => {
  if (!data) return null;

  const fecha = new Date().toLocaleDateString('es-MX');
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  // ---- CORRECCIÓN: Estilos ajustados para impresora de 80mm ----
  const printStyles = `
    @media print {
      /* Define el tamaño del papel de impresión y elimina márgenes */
      @page {
        size: 80mm auto; /* Ancho de 80mm, altura automática */
        margin: 0 !important;
      }

      /* Resetea el documento para la impresión en rollo */
      html, body {
        width: 80mm; /* Ancho del papel térmico */
        height: fit-content; /* La altura se ajusta al contenido */
        margin: 0 !important;
        padding: 0 !important;
        background: white; /* Asegura fondo blanco */
      }

      .ticket-container {
        width: 100%;
        padding: 2mm; /* Un pequeño margen interno */
        box-sizing: border-box;
      }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>
      <div ref={ref} className="ticket-container text-black bg-white font-mono" style={{ width: '80mm', fontSize: `${fontSize || 10}pt` }}>
        
        <div className="text-center">
          <h2 className="font-bold" style={{ fontSize: '1.2em' }}>Hotel Real San Carlos</h2>
          <p className="text-xs">Av. Morelos esq Insurgentes</p>
          <p className="text-xs">Guadalupe Victoria, Dgo. C.P. 34700</p>
          <p className="text-xs">Tel: 676 104-7159</p>
          <p className="text-xs mb-2">hotelrealsancarlos2022@gmail.com</p>
        </div>

        <hr className="border-t border-dashed border-black my-2" />

        <table className="w-full" style={{ fontSize: '0.9em' }}>
          <tbody>
            <tr>
              <td className="font-bold pr-2">Fecha Impresión:</td>
              <td className="text-right">{fecha} {hora}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Folio de Reserv.:</td>
              <td className="text-right">#{data.id}</td>
            </tr>
          </tbody>
        </table>
        
        <hr className="border-t border-dashed border-black my-2" />

        <table className="w-full" style={{ fontSize: '0.9em' }}>
          <tbody>
            <tr>
              <td className="font-bold pr-2">Habitación:</td>
              <td className="text-right">{data.room_id}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Cliente:</td>
              <td className="text-right">{data.name}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Entrada:</td>
              <td className="text-right">{data.checkin_date}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Salida:</td>
              <td className="text-right">{data.checkout_date}</td>
            </tr>
          </tbody>
        </table>

        <hr className="border-t border-dashed border-black my-2" />
        
        <table className="w-full" style={{ fontSize: '0.9em' }}>
          <tbody>
            <tr>
              <td className="font-bold pr-2">Monto Total:</td>
              <td className="text-right">${data.total_amount?.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Pagado:</td>
              <td className="text-right">${data.amount_paid?.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold pr-2">Restante:</td>
              <td className="text-right font-bold">${data.remaining_amount?.toFixed(2)}</td>
            </tr>
            <tr><td colSpan="2">&nbsp;</td></tr>
            <tr>
              <td className="font-bold pr-2">Método de Pago:</td>
              <td className="text-right">{data.payment_method}</td>
            </tr>
          </tbody>
        </table>
        
        <hr className="border-t border-dashed border-black my-2" />

        <div className="text-center text-xs mt-2">
          <p>Gracias por su preferencia</p>
          <p>¡Estamos para servirle!</p>
        </div>
      </div>
    </>
  );
});

export default PrintTicket;