import { useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

export interface AddressResult {
  label: string;
  street: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

export const useAddress = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);

  // Fonction de recherche par TEXTE (API Gouv)
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
      );
      const data = await response.json();
      setSuggestions(formatApiGouvResults(data.features));
    } catch (error) {
      console.error("Erreur API Adresse", error);
    }
  };

  // Fonction de recherche par GPS (Reverse Geocoding)
  const getLocation = async (): Promise<AddressResult | null> => {
    setLoading(true);
    try {
      // 1. Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Nous avons besoin de votre position pour remplir l'adresse automatiquement.",
        );
        setLoading(false);
        return null;
      }

      // 2. Récupérer la position
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 3. Appel API Gouv (Reverse)
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lat=${latitude}&lon=${longitude}`,
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const result = formatApiGouvResults([data.features[0]])[0];
        setLoading(false);
        return result;
      }

      setLoading(false);
      return null;
    } catch (error) {
      console.error("Erreur Location", error);
      Alert.alert("Erreur", "Impossible de récupérer votre position.");
      setLoading(false);
      return null;
    }
  };

  return {
    searchAddress,
    getLocation,
    suggestions,
    setSuggestions,
    loading,
  };
};

// Helper : Formate les données brutes de l'API Gouv
const formatApiGouvResults = (features: any[]): AddressResult[] => {
  return features.map((f: any) => ({
    label: f.properties.label,
    street: f.properties.name,
    city: f.properties.city,
    postcode: f.properties.postcode,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
  }));
};
