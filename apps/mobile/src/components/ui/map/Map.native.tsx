import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SetStateAction, useState } from "react";

// ---- MOCK DATA ----
const MOCK_LISTINGS = [
  { id: "1", title: "Appartement centre-ville", price: 95, latitude: 43.5297, longitude: 5.4474 },
  { id: "2", title: "Studio cosy", price: 72, latitude: 43.5312, longitude: 5.4413 },
  { id: "3", title: "Loft moderne", price: 130, latitude: 43.5268, longitude: 5.4522 },
  { id: "4", title: "Maison avec terrasse", price: 210, latitude: 43.5335, longitude: 5.4498 },
];

// ---- CUSTOM PRICE MARKER ----
// TODO: refaire dans un composant
function PriceMarker({ price }: { price: number }) {
  return (
    <View style={styles.markerContainer}>
      <Text style={styles.markerText}>{price}€</Text>
    </View>
  );
}

export default function Map() {
  const [region, setRegion] = useState<Region>({
    latitude: 43.5297,
    longitude: 5.4474,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  return (
    <View style={{ flex: 1, height: "100%", width: "100%" }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={(newRegion: SetStateAction<Region>) => {
          setRegion(newRegion);

          // 👉 ici tu brancheras ton appel API NestJS plus tard
          console.log("Region changed:", newRegion);
        }}
      >
        {MOCK_LISTINGS.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
          >
            <PriceMarker price={listing.price} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerText: {
    fontWeight: "600",
    fontSize: 14,
  },
});