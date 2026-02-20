import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { cssInterop } from "nativewind";
import { useAddress, AddressResult } from "./useAddress";
import { Input } from "@/components/ui/input/input";
import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import IconLocalisationSource from "@assets/icons/ic_localisation.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(IconLocalisationSource, iconConfig);

interface AddressAutocompleteProps {
  label?: string;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  onSelect: (address: AddressResult | undefined) => void;
  value?: AddressResult;
  required?: boolean;
}

export const AddressAutocomplete = ({
  error,
  onSelect,
  value,
  required = false,
}: AddressAutocompleteProps) => {
  const { searchAddress, getLocation, suggestions, setSuggestions, loading } =
    useAddress();

  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  // --- EXTRACTION DES MESSAGES D'ERREUR ---

  // 1. Erreur globale (L'objet address est undefined ou null)
  const globalError =
    typeof error?.message === "string" ? error.message : undefined;

  // 2. Erreurs spécifiques
  const streetError = (error as any)?.street?.message || globalError;
  const postalCodeError =
    (error as any)?.postalCode?.message ||
    (globalError ? "Le code postal est obligatoire" : undefined);
  const cityError =
    (error as any)?.city?.message ||
    (globalError ? "La ville est obligatoire" : undefined);

  // Synchronisation avec la valeur externe
  useEffect(() => {
    if (value) {
      setStreet(value.street || value.label || "");
      setPostalCode(value.postcode || (value as any).postalCode || "");
      setCity(value.city || "");
    } else {
      setStreet("");
      setPostalCode("");
      setCity("");
    }
  }, [value]);

  // --- HELPER DE MISE A JOUR ---
  const updateParent = (changes: Partial<AddressResult>) => {
    const metaData = {
      latitude: value?.latitude || 0,
      longitude: value?.longitude || 0,
      label: value?.label || "",
    };

    const newData = {
      ...metaData,
      street: street,
      postcode: postalCode,
      city: city,
      ...changes,
    };

    if (newData.street || newData.city || newData.postcode) {
      onSelect(newData as AddressResult);
    } else {
      // Si tout est vide, on envoie undefined pour déclencher "Adresse obligatoire"
      onSelect(undefined);
    }
  };
  // --- 1. GESTION DE LA RUE ---
  const handleStreetChange = (text: string) => {
    setStreet(text);
    if (text.trim() === "" && postalCode === "" && city === "") {
      onSelect(undefined);
      setSuggestions([]);
      return;
    }

    updateParent({ street: text });

    if (timer) clearTimeout(timer);
    const newTimer = setTimeout(() => {
      searchAddress(text);
    }, 500);
    setTimer(newTimer);
  };

  // --- 2. GESTION DES AUTRES CHAMPS ---
  const handlePostalCodeChange = (text: string) => {
    setPostalCode(text);
    updateParent({ postcode: text });
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    updateParent({ city: text });
  };

  // --- 3. SELECTION ---
  const handleSelectSuggestion = (item: AddressResult) => {
    setStreet(item.street);
    setPostalCode(item.postcode);
    setCity(item.city);

    setSuggestions([]);
    setIsFocused(false);

    onSelect({
      ...item,
      street: item.street,
    });
  };

  // --- 4. GEOLOCALISATION ---
  const handleLocateMe = async () => {
    const address = await getLocation();
    if (address) {
      handleSelectSuggestion(address);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
    }, 200);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (street.length > 2) {
      searchAddress(street);
    }
  };

  return (
    <View className="mb-4">
      {/* --- CHAMP RUE --- */}
      <View className="relative mb-4">
        <Input
          label="Numéro et libellé de voie"
          testID="input-address"
          placeholder="Ex: 10 rue de la Paix"
          value={street}
          onChangeText={handleStreetChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          errorMessage={streetError}
          required={required}
          rightIcon={
            loading ? (
              <ActivityIndicator size="small" color="#CC460F" />
            ) : (
              <LocalisationIcon className="w-6 h-6 text-primary" />
            )
          }
          onRightIconPress={handleLocateMe}
          helperText="Cliquez sur 📍 pour vous géolocaliser"
        />

        {isFocused && suggestions.length > 0 && (
          <View
            className="absolute left-0 right-0 bg-white border rounded-md shadow-lg border-grey-200"
            style={[
              {
                top: 80,
                maxHeight: 200,
                zIndex: 9999,
              },
              Platform.select({
                android: { elevation: 10 },
                ios: { zIndex: 9999 },
                web: { zIndex: 9999, position: "static" },
              }),
            ]}
          >
            <ScrollView
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {suggestions.map((item, index) => (
                <Pressable
                  key={`${item.label}-${index}`}
                  className="p-3 border-b border-grey-50 active:bg-grey-50"
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Text className="text-sm font-bold text-grey-900">
                    {item.street || item.label}
                  </Text>
                  <Text className="text-xs text-grey-500">
                    {item.city} ({item.postcode})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* --- CHAMPS CP et VILLE --- */}
      <View className="flex-row gap-4">
        <View className="flex-1">
          <Input
            label="Code Postal"
            testID="input-postalCode"
            value={postalCode}
            onChangeText={handlePostalCodeChange}
            errorMessage={postalCodeError}
            keyboardType="numeric"
            maxLength={5}
            required
            helperText="Exemple : 13100"
          />
        </View>

        <View className="flex-[2]">
          <Input
            label="Ville"
            testID="input-city"
            value={city}
            onChangeText={handleCityChange}
            errorMessage={cityError}
            required
          />
        </View>
      </View>
    </View>
  );
};
