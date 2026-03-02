import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ---- MOCK DATA ----
const MOCK_LISTINGS = [
  { id: "1", title: "Appartement centre-ville", price: 95, latitude: 43.5297, longitude: 5.4474 },
  { id: "2", title: "Studio cosy", price: 72, latitude: 43.5312, longitude: 5.4413 },
  { id: "3", title: "Loft moderne", price: 130, latitude: 43.5268, longitude: 5.4522 },
  { id: "4", title: "Maison avec terrasse", price: 210, latitude: 43.5335, longitude: 5.4498 },
];

export default function Map() {
  return (
    <MapContainer
      center={[43.5297, 5.4474]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {MOCK_LISTINGS.map((listing) => (
        <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
          <Popup>
            <strong>{listing.price}€</strong>
            <br />
            {listing.title}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}