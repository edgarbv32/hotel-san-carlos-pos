import jsPDF from 'jspdf';


const formatCurrency = (valor) => {
  const num = parseFloat(valor);
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
};


export const generarPDFTicket = (data) => {
  if (!data) return;

  const {
    name = '',
    phone = '',
    roomId = '',
    checkin = '',
    checkout = '',
    total = 0,
    amountPaid = 0,
    remaining = 0
  } = data;

  const fecha = new Date().toLocaleDateString();
  const hora = new Date().toLocaleTimeString();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, 160],
  });

  let y = 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Hotel Real San Carlos', 29, y, { align: 'center' });
  y += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Av. Morelos esq Insurgentes', 29, y, { align: 'center' }); y += 4;
  doc.text('Guadalupe Victoria, Dgo. C.P. 34700', 29, y, { align: 'center' }); y += 4;
  doc.text('Tel: 676 104-7159', 29, y, { align: 'center' }); y += 4;
  doc.text('hotelrealsancarlos2022@gmail.com', 29, y, { align: 'center' }); y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Renta de habitación', 29, y, { align: 'center' }); y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${fecha}`, 5, y); doc.text(`Hora: ${hora}`, 40, y); y += 6;

  doc.text(`Habitación: ${roomId}`, 5, y); y += 5;
  doc.text(`Cliente: ${name}`, 5, y); y += 5;
  doc.text(`Teléfono: ${phone}`, 5, y); y += 5;
  doc.text(`Entrada: ${checkin}`, 5, y); y += 5;
  doc.text(`Salida: ${checkout}`, 5, y); y += 5;
  doc.text(`Pagado: $${amountPaid}`, 5, y); y += 5;
  doc.text(`Restante: $${remaining}`, 5, y); y += 8;

  doc.setFont('helvetica', 'italic');
  doc.text('Gracias por su preferencia,', 29, y, { align: 'center' }); y += 4;
  doc.text('¡Estamos para servirle!', 29, y, { align: 'center' });

  doc.save('ticket.pdf');
};