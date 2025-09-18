import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import Cookies from 'js-cookie';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapaClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchClientesEGeocodificar = useCallback(async () => {
        setLoading(true);
        setError(null);
        const token = Cookies.get('token');
        if (!token) {
            setError('Autenticação necessária.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get('/api/clientes/enderecos', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const clientesComLatLng = [];
            for (const cliente of response.data) {
                const endereco = `${cliente.ENDERECO}, ${cliente.NUMERO}, ${cliente.CIDADE}, ${cliente.UF}`;
                try {
                    const geocodeResponse = await axios.get('/api/geocode', {
                        params: { endereco },
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 10000
                    });

                    if (geocodeResponse.data?.length > 0) {
                        clientesComLatLng.push({
                            ...cliente,
                            lat: geocodeResponse.data[0].lat,
                            lon: geocodeResponse.data[0].lon
                        });
                    }
                } catch (err) {
                    console.error(`Erro ao geocodificar endereço para o cliente ${cliente.CODIGO}:`, err);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // respeitar limite do Nominatim
            }

            setClientes(clientesComLatLng);
        } catch (err) {
            console.error('Erro ao buscar clientes:', err);
            setError('Não foi possível carregar os dados dos clientes. Verifique a conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClientesEGeocodificar();
    }, [fetchClientesEGeocodificar]);

    if (loading) {
        return <div className="erp-content-area"><p className="erp-loading-message">Carregando mapa e clientes...</p></div>;
    }

    if (error) {
        return (
            <div className="erp-content-area">
                <div className="erp-error-message">
                    <p>{error}</p>
                    <button onClick={fetchClientesEGeocodificar} className="erp-btn">Tentar Novamente</button>
                </div>
            </div>
        );
    }

    return (
        <div className="erp-main-content">
            <div className="erp-content-header">
                <h2>Mapa de Clientes</h2>
                <p>Visualize a localização dos seus clientes para planejamento de rotas.</p>
            </div>
            <div className="erp-card" style={{ height: '70vh' }}>
                <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {clientes.map(cliente => (
                        <Marker key={cliente.CODIGO} position={[cliente.lat, cliente.lon]}>
                            <Popup>
                                <strong>{cliente.NOME}</strong><br />
                                {`${cliente.ENDERECO}, ${cliente.NUMERO}`}<br />
                                {`${cliente.BAIRRO}, ${cliente.CIDADE} - ${cliente.UF}`}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapaClientes;