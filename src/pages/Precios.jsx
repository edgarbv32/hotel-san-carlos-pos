import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { invoke } from "@tauri-apps/api/tauri";

const defaultPrices = {
  'fisica_king': 1000,
  'moral_king': 989.60,
  'fisica_doble': 1000,
  'moral_doble': 989.60
};

function Precios() {
  const navigate = useNavigate();
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const savedPrices = await invoke('get_prices');
        if (savedPrices && Object.keys(savedPrices).length > 0) {
          setPrices(savedPrices);
        } else {
          setPrices(defaultPrices);
        }
      } catch (e) {
        console.error("Error al cargar precios:", e);
        setPrices(defaultPrices);
      }
    };
    loadPrices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrices({ ...prices, [name]: parseFloat(value) || 0 });
  };

  const handleSave = async () => {
    try {
      await invoke('save_prices', { prices });
      toast.success('✅ Precios actualizados correctamente');
    } catch (e) {
      console.error("Error al guardar precios:", e);
      toast.error('Hubo un error al guardar los precios.');
    }
  };

  if (!prices) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-8 animate-fadeIn max-w-3xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-blue-600 hover:text-blue-800 transition mb-6">
        <ArrowLeft className="mr-2" /> Volver
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Configuración de Precios</h1>

      <div className="bg-white rounded shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(prices).map((key) => (
            <div key={key}>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                {key.replace('_', ' – ').replace(/\b\w/g, c => c.toUpperCase())}
              </label>
              <input
                type="number"
                name={key}
                value={prices[key]}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
          <Save size={18} /> Guardar cambios
        </button>
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
export default Precios;