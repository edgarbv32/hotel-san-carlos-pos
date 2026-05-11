import React, { useState, useEffect } from "react";
import { FaSearch, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa"; // Se añade FaTimes para el icono de cerrar
import { invoke } from "@tauri-apps/api/tauri";

function Consultas() {
  const [reservaciones, setReservaciones] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // --- PASO 1: AÑADIR ESTADOS PARA EL MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState('');

  useEffect(() => {
    const fetchReservaciones = async () => {
      try {
        const data = await invoke('get_reservations');
        setReservaciones(data);
      } catch (error) {
        console.error("Error fetching reservaciones:", error.message);
      }
    };
    fetchReservaciones();
  }, []);
  
  const filteredReservaciones = reservaciones.filter((res) =>
    res.name && res.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReservaciones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReservaciones.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // --- Función para abrir el modal ---
  const handleShowImage = (imageUrl) => {
    setModalImage(imageUrl);
    setIsModalOpen(true);
  };

  // --- Función para cerrar el modal ---
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalImage('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-r from-blue-50 to-white min-h-screen">
      <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center bg-blue-100 p-4 rounded-lg shadow-md">
        Consultas de Reservaciones
      </h2>
      <div className="mb-8">
        <div className="relative">
          <input type="text" placeholder="Buscar por nombre..." value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-1/2 lg:w-1/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 pl-10 shadow-sm"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      {filteredReservaciones.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <tr>
                <th className="p-4 text-left font-semibold">Nombre</th>
                <th className="p-4 text-left font-semibold">Teléfono</th>
                <th className="p-4 text-left font-semibold">Fecha de Check-In</th>
                <th className="p-4 text-left font-semibold">Ver INE</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((res) => (
                <tr key={res.id} className="border-b hover:bg-gray-50 transition-colors duration-200">
                  <td className="p-4">{res.name || "No especificado"}</td>
                  <td className="p-4">{res.phone || "No especificado"}</td>
                  <td className="p-4">{res.checkin_date}</td>
                  <td className="p-4">
                    {/* --- PASO 2: CAMBIAR EL ENLACE POR UN BOTÓN QUE ABRE EL MODAL --- */}
                    {res.ine_photo_url ? ( 
                        <button onClick={() => handleShowImage(res.ine_photo_url)} className="text-blue-600 hover:underline">Ver INE</button>
                    ) : (
                        <span className="text-gray-500">(No disponible)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center items-center gap-4 mt-6">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}><FaChevronLeft /></button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}><FaChevronRight /></button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center text-xl mt-10">No hay reservaciones que coincidan con la búsqueda.</p>
      )}

      {/* --- PASO 3: AÑADIR EL CÓDIGO DEL MODAL AL FINAL DEL COMPONENTE --- */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={handleCloseModal} // Cierra el modal al hacer clic en el fondo
        >
          <div 
            className="relative bg-white p-4 rounded-lg shadow-xl max-w-3xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // Evita que el clic en la imagen cierre el modal
          >
            <button 
              onClick={handleCloseModal} 
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
              aria-label="Cerrar modal"
            >
              <FaTimes />
            </button>
            <img src={modalImage} alt="Vista previa de INE" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
export default Consultas;