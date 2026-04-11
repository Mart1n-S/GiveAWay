import { StyleSheet, Text, View } from "react-native";
import { Callout, Marker } from "react-native-maps";
import type { AssociationMapItem } from "@repo/shared";

const MAX_DESC_LENGTH = 100;

interface AssociationMarkerNativeProps {
  association: AssociationMapItem;
}

export function AssociationMarkerNative({
  association,
}: AssociationMarkerNativeProps) {
  const excerpt =
    association.description && association.description.length > MAX_DESC_LENGTH
      ? association.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
      : association.description;

  return (
    <Marker
      coordinate={{
        latitude: association.latitude,
        longitude: association.longitude,
      }}
      pinColor="#6366f1"
    >
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutBadge}>Association</Text>
          <Text style={styles.calloutName}>{association.name}</Text>
          {association.category && (
            <Text style={styles.calloutCategory}>{association.category}</Text>
          )}
          <View style={styles.divider} />
          <Text style={styles.calloutCity}>📍 {association.city}</Text>
          {excerpt ? (
            <Text style={styles.calloutDesc}>{excerpt}</Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  callout: {
    minWidth: 180,
    maxWidth: 240,
    padding: 10,
  },
  calloutBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366f1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  calloutName: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111",
    marginBottom: 2,
  },
  calloutCategory: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 6,
  },
  calloutCity: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 17,
  },
});
