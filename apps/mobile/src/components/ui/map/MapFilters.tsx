import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import type { AssociationCategory } from "@repo/shared";
import type { NearbyFilters } from "@/services/association.service";

// ------------------------------------------------------------------ types ---

interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export interface MapFiltersValue {
  filters: NearbyFilters;
  center: [number, number] | null;
}

interface MapFiltersProps {
  onChange: (value: MapFiltersValue) => void;
  /**
   * `true` (défaut) : panneau positionné en absolu par-dessus la carte (usage natif).
   * `false` : panneau en flux normal, rendu au-dessus de la carte dans une colonne.
   */
  floating?: boolean;
  /** Catégories d'associations — fournies par le parent. */
  categories?: AssociationCategory[];
}

// --------------------------------------------------------------- geocoding ---

const ADDRESS_API = "https://api-adresse.data.gouv.fr/search/";

async function geocode(query: string): Promise<AddressSuggestion[]> {
  if (query.length < 3) return [];
  const url = `${ADDRESS_API}?q=${encodeURIComponent(query)}&limit=5&type=municipality`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.features ?? []).map((f: any) => ({
    label: f.properties.label,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

// --------------------------------------------------------------- component ---

export function MapFilters({ onChange, floating = true, categories = [] }: MapFiltersProps) {
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const addressDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");

  // Notifie le parent à chaque changement de filtre (hors adresse)
  useEffect(() => {
    onChange({
      center: null,
      filters: {
        categoryIds: selectedIds.length ? selectedIds : undefined,
        createdAfter: createdAfter || undefined,
        createdBefore: createdBefore || undefined,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, createdAfter, createdBefore]);

  const handleAddressChange = (value: string) => {
    setAddressQuery(value);
    setSuggestions([]);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    if (!value) { setLoadingAddress(false); return; }
    setLoadingAddress(true);
    addressDebounce.current = setTimeout(async () => {
      const results = await geocode(value);
      setSuggestions(results);
      setLoadingAddress(false);
    }, 350);
  };

  const selectSuggestion = (s: AddressSuggestion) => {
    setAddressQuery(s.label);
    setSuggestions([]);
    onChange({
      center: [s.lat, s.lng],
      filters: {
        categoryIds: selectedIds.length ? selectedIds : undefined,
        createdAfter: createdAfter || undefined,
        createdBefore: createdBefore || undefined,
      },
    });
  };

  const toggleCategory = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const reset = () => {
    setAddressQuery("");
    setSuggestions([]);
    setSelectedIds([]);
    setCreatedAfter("");
    setCreatedBefore("");
  };

  const hasFilters =
    selectedIds.length > 0 || !!createdAfter || !!createdBefore || !!addressQuery;

  return (
    <View style={floating ? styles.panel : styles.panelInline}>
      {/* Recherche adresse */}
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="🔍 Ville ou adresse…"
            placeholderTextColor="#AAA"
            value={addressQuery}
            onChangeText={handleAddressChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {loadingAddress && (
            <ActivityIndicator
              style={styles.spinner}
              size="small"
              color="#E84040"
            />
          )}
        </View>
        {hasFilters && (
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetText}>✕ Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((sug, i) => (
            <TouchableOpacity
              key={sug.label}
              style={[
                styles.suggestionItem,
                i < suggestions.length - 1 && styles.suggestionBorder,
              ]}
              onPress={() => selectSuggestion(sug)}
            >
              <Text style={styles.suggestionText}>{sug.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Dates */}
      <View style={styles.row}>
        <Text style={styles.dateLabel}>Depuis</Text>
        <TextInput
          style={styles.dateInput}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#BBB"
          value={createdAfter}
          onChangeText={setCreatedAfter}
          keyboardType="numeric"
          maxLength={10}
        />
        <Text style={styles.dateLabel}>au</Text>
        <TextInput
          style={styles.dateInput}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#BBB"
          value={createdBefore}
          onChangeText={setCreatedBefore}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Catégories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map((cat) => {
            const active = selectedIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ----------------------------------------------------------------- styles ---

const styles = StyleSheet.create({
  // Flottant par-dessus la carte (usage natif)
  panel: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 1000,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 8,
  },
  // En flux normal, au-dessus de la carte dans une colonne (usage web)
  panelInline: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: "#FAFAFA",
    color: "#111",
  },
  spinner: {
    position: "absolute",
    right: 10,
    top: 9,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  resetText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  suggestions: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    fontSize: 13,
    color: "#333",
  },
  dateLabel: {
    fontSize: 12,
    color: "#888",
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    backgroundColor: "#FAFAFA",
    color: "#111",
    textAlign: "center",
  },
  chipsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  chipActive: {
    borderColor: "#E84040",
    backgroundColor: "#FFF0F0",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  chipTextActive: {
    color: "#E84040",
  },
});