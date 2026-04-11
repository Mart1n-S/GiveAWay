import {
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { Text } from "../text/text";
import { colors } from "../theme/tokens";
import type { MissionFiltersProps } from "./mission-filters.types";
import type { ActivityType, MissionFrequency } from "@repo/shared";
import { DateInput } from "./DateInput";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import SearchIconSource from "@assets/icons/ic_search.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const SearchIcon = cssInterop(SearchIconSource, iconConfig);

// ─── Géolocalisation ──────────────────────────────────────────────────────────

async function reverseGeocodeCity(
  lat: number,
  lon: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&limit=1`,
    );
    const json = await res.json();
    const props = json?.features?.[0]?.properties;
    return props?.city ?? props?.municipality ?? null;
  } catch {
    return null;
  }
}

async function getCurrentCity(): Promise<string | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const city = await reverseGeocodeCity(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          resolve(city);
        },
        () => resolve(null),
        { timeout: 8000 },
      );
    });
  }
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const isWeb = Platform.OS === "web";

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "MISSION", label: "Missions" },
  { value: "EVENT", label: "Événements" },
  { value: "COLLECT", label: "Collectes" },
  { value: "INFO", label: "Informations" },
];

const FREQUENCY_OPTIONS: { value: MissionFrequency; label: string }[] = [
  { value: "ONCE", label: "Ponctuelle" },
  { value: "DAILY", label: "Quotidienne" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuelle" },
];

// ─── Classes réutilisables (inspirées de Button) ──────────────────────────────

/** Focus ring identique au composant Button */
const focusRing =
  "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleArrayItem<T>(arr: T[] | undefined, item: T): T[] {
  if (!arr) return [item];
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ─── Séparateur vertical ──────────────────────────────────────────────────────

function Divider({ className }: { className?: string }) {
  return (
    <View
      className={clsx("w-px self-stretch bg-grey-200 mx-1", className)}
    />
  );
}

// ─── RadioOption ──────────────────────────────────────────────────────────────

function RadioOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="radio"
      accessibilityRole="radio"
      aria-checked={active}
      accessibilityState={{ checked: active }}
      className={clsx(
        "group flex-row items-center gap-1.5 py-0.5 rounded",
        focusRing,
        isWeb && "web:cursor-pointer",
      )}
    >
      {/* Cercle radio */}
      <View
        className={clsx(
          "w-4 h-4 rounded-full border-2 items-center justify-center transition-colors",
          active
            ? "border-primary bg-primary"
            : "border-grey-400 group-hover:border-primary",
        )}
      >
        {active && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
      </View>
      <Text
        className={clsx(
          "text-sm transition-colors",
          active
            ? "font-semibold text-grey-900"
            : "text-grey-600 group-hover:text-grey-900",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── SectionTrigger ───────────────────────────────────────────────────────────

/**
 * Bouton déclencheur d'une section déroulante (Activités, Dates, Fréquence).
 * Styles alignés sur la variante secondaire du composant Button.
 */
function SectionTrigger({
  label,
  badge,
  active,
  open,
  onPress,
}: {
  label: string;
  badge?: string;
  active: boolean;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityRole="button"
      aria-expanded={open}
      className={clsx(
        "flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all",
        focusRing,
        isWeb && "web:cursor-pointer",
        // État ouvert
        open && "bg-grey-50 border-primary",
        // État actif (filtre appliqué), non ouvert
        active && !open && "border-primary",
        // État normal (pas de filtre, fermé)
        !active && !open && [
          "bg-white border-grey-300",
          "hover:bg-white-hover hover:border-primary",
          "active:bg-white-active active:border-primary",
        ],
        // Actif ouvert ou fermé → hover primaire
        active && [
          "hover:bg-white-hover hover:border-primary-hover",
          "active:bg-white-active",
        ],
      )}
    >
      <Text
        className={clsx(
          "text-sm font-semibold transition-colors",
          active || open ? "text-primary" : "text-grey-700",
        )}
      >
        {label}
      </Text>

      {badge && (
        <View className="bg-primary rounded-full px-1.5 py-0.5 min-w-[18px] items-center">
          <Text className="text-xs font-bold leading-none text-white">{badge}</Text>
        </View>
      )}

      <Text
        className={clsx(
          "text-xs transition-colors",
          open ? "text-primary" : active ? "text-primary" : "text-grey-400",
        )}
      >
        {open ? "▲" : "▼"}
      </Text>
    </Pressable>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

/**
 * Chip de sélection (Row 2). Variante primaire quand actif, secondaire sinon.
 */
function FilterChip({
  label,
  count,
  active,
  open,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  open: boolean;
  onPress: () => void;
}) {
  const showCount = active && (count ?? 0) > 0;
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityRole="button"
      aria-pressed={active}
      aria-expanded={open}
      className={clsx(
        "flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all",
        focusRing,
        isWeb && "web:cursor-pointer",
        active
          ? [
              "bg-primary border-primary",
              "hover:bg-primary-hover hover:border-primary-hover",
              "active:bg-primary-active active:border-primary-active",
            ]
          : [
              "bg-white border-grey-200",
              open ? "border-primary bg-grey-50" : "",
              "hover:bg-white-hover hover:border-primary",
              "active:bg-white-active",
            ],
      )}
    >
      <Text
        className={clsx(
          "text-sm font-semibold",
          active ? "text-white" : "text-grey-700",
        )}
      >
        {label}
      </Text>

      {showCount && (
        <View className="bg-white/30 rounded-full px-1 min-w-[18px] items-center">
          <Text className="text-xs font-bold leading-none text-white">{count}</Text>
        </View>
      )}

      {!active && (
        <Text
          className={clsx(
            "text-xs",
            open ? "text-primary" : "text-grey-400",
          )}
        >
          {open ? "▲" : "▼"}
        </Text>
      )}
    </Pressable>
  );
}

// ─── ToggleChip ───────────────────────────────────────────────────────────────

function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityRole="button"
      aria-pressed={active}
      className={clsx(
        "px-3 py-1.5 rounded-full border transition-all",
        focusRing,
        isWeb && "web:cursor-pointer",
        active
          ? [
              "bg-primary border-primary",
              "hover:bg-primary-hover hover:border-primary-hover",
              "active:bg-primary-active active:border-primary-active",
            ]
          : [
              "bg-white border-grey-200",
              "hover:bg-white-hover hover:border-primary",
              "active:bg-white-active",
            ],
      )}
    >
      <Text
        className={clsx(
          "text-sm font-semibold",
          active ? "text-white" : "text-grey-700",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── SelectOption (dans les panneaux) ─────────────────────────────────────────

function SelectOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="option"
      accessibilityRole="button"
      aria-selected={selected}
      className={clsx(
        "px-3 py-1.5 rounded-full border transition-all",
        focusRing,
        isWeb && "web:cursor-pointer",
        selected
          ? [
              "bg-primary border-primary",
              "hover:bg-primary-hover hover:border-primary-hover",
              "active:bg-primary-active active:border-primary-active",
            ]
          : [
              "bg-white border-grey-200",
              "hover:bg-white-hover hover:border-primary",
              "active:bg-white-active",
            ],
      )}
    >
      <Text
        className={clsx(
          "text-sm font-medium",
          selected ? "text-white" : "text-grey-700",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── MultiSelectPanel ─────────────────────────────────────────────────────────

function MultiSelectPanel({
  items,
  selectedIds,
  onToggle,
}: {
  items: { id: number; label: string }[];
  selectedIds: number[] | undefined;
  onToggle: (id: number) => void;
}) {
  if (!items.length) {
    return (
      <Text className="py-2 text-sm italic text-grey-500">
        Aucune option disponible
      </Text>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <SelectOption
          key={item.id}
          label={item.label}
          selected={selectedIds?.includes(item.id) ?? false}
          onPress={() => onToggle(item.id)}
        />
      ))}
    </View>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Barre de filtres unifiée pour le listing et la carte des missions.
 *
 * Responsive :
 * - Petit écran : radios → champ adresse → triggers (chacun sur sa propre ligne)
 * - Écran md+   : radios | champ adresse | triggers (tout en ligne)
 *
 * Row 2 : chips causes / compétences / publics / bénévoles / places restantes.
 */
export function MissionFilters({
  value,
  onChange,
  onReset,
  variant = "list",
  causes = [],
  skills = [],
  publicTypes = [],
  volunteerTypes = [],
  className,
}: MissionFiltersProps) {
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState(value.city ?? "");
  const [isGeolocating, setIsGeolocating] = useState(false);

  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // Sync city input avec réinitialisation externe
  useEffect(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    setCityInput(value.city ?? "");
  }, [value.city]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const togglePanel = (key: string) =>
    setOpenPanel((prev) => (prev === key ? null : key));

  const closePanel = () => setOpenPanel(null);

  const handleLocationMode = (mode: "nearby" | "remote") => {
    closePanel();
    onChangeRef.current({
      ...valueRef.current,
      locationMode: mode,
      city: mode === "remote" ? undefined : valueRef.current.city,
    });
    if (mode === "remote") setCityInput("");
  };

  const handleCityChange = (text: string) => {
    setCityInput(text);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(() => {
      onChangeRef.current({
        ...valueRef.current,
        city: text.trim() || undefined,
      });
    }, 300);
  };

  const handleGeolocate = async () => {
    setIsGeolocating(true);
    try {
      const city = await getCurrentCity();
      if (city) {
        setCityInput(city);
        onChangeRef.current({ ...valueRef.current, city });
      }
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleToggleType = (t: ActivityType) => {
    const next = toggleArrayItem(value.types, t);
    onChange({ ...value, types: next.length ? next : undefined });
  };

  const handleFrequency = (f: MissionFrequency) => {
    onChange({ ...value, frequency: value.frequency === f ? undefined : f });
    closePanel();
  };

  const handleToggleCauseId = (id: number) =>
    onChange({ ...value, causeIds: toggleArrayItem(value.causeIds, id) });

  const handleToggleSkillId = (id: number) =>
    onChange({ ...value, skillIds: toggleArrayItem(value.skillIds, id) });

  const handleTogglePublicTypeId = (id: number) =>
    onChange({
      ...value,
      publicTypeIds: toggleArrayItem(value.publicTypeIds, id),
    });

  const handleToggleVolunteerTypeId = (id: number) =>
    onChange({
      ...value,
      volunteerTypeIds: toggleArrayItem(value.volunteerTypeIds, id),
    });

  const handleAvailableSpots = () =>
    onChange({
      ...value,
      hasAvailableSpots: value.hasAvailableSpots ? undefined : true,
    });

  // ── États dérivés ─────────────────────────────────────────────────────────

  const isRemote = value.locationMode === "remote";
  const typesCount = value.types?.length ?? 0;
  const hasDate = !!value.startDateFrom || !!value.startDateTo;
  const causesCount = value.causeIds?.length ?? 0;
  const skillsCount = value.skillIds?.length ?? 0;
  const publicTypesCount = value.publicTypeIds?.length ?? 0;
  const volunteerTypesCount = value.volunteerTypeIds?.length ?? 0;

  const hasActiveFilters =
    !!value.locationMode ||
    !!value.city ||
    typesCount > 0 ||
    !!value.frequency ||
    hasDate ||
    causesCount > 0 ||
    skillsCount > 0 ||
    publicTypesCount > 0 ||
    volunteerTypesCount > 0 ||
    !!value.hasAvailableSpots ||
    !!value.search;

  const webInputStyle = Platform.select({
    web: { outlineStyle: "none" },
    default: {},
  }) as ViewStyle;

  // ── Champ ville (réutilisé dans les deux positions) ───────────────────────

  const cityField = (
    <View
      className={clsx(
        "flex-row items-center gap-1 px-2 rounded-md border border-grey-300 bg-white transition-colors",
        isWeb && [
          "hover:border-primary",
          "focus-within:border-primary",
          "focus-within:ring-1 focus-within:ring-primary/20",
        ],
      )}
      style={{ height: 36 }}
    >
      <LocalisationIcon className="flex-shrink-0 w-4 h-4 text-grey-400" />
      <TextInput
        value={cityInput}
        onChangeText={handleCityChange}
        placeholder="Ville ou adresse"
        placeholderTextColor={colors.grey[400]}
        returnKeyType="search"
        style={[webInputStyle, { flex: 1, fontSize: 13, color: colors.grey[900] }]}
        accessibilityLabel="Filtrer par ville ou adresse"
      />
      {/* Bouton géolocalisation */}
      <Pressable
        onPress={handleGeolocate}
        disabled={isGeolocating}
        role="button"
        accessibilityRole="button"
        accessibilityLabel="Me géolocaliser"
        className={clsx(
          "p-1 rounded transition-colors",
          focusRing,
          isGeolocating
            ? "opacity-60"
            : [isWeb && "web:cursor-pointer", "hover:bg-grey-100 active:bg-grey-200"],
        )}
      >
        {isGeolocating ? (
          <ActivityIndicator size={14} color={colors.primary.default} />
        ) : (
          <LocalisationIcon className="w-4 h-4 text-primary" />
        )}
      </Pressable>
    </View>
  );

  // ── Rendu du panneau ouvert ───────────────────────────────────────────────

  const renderPanel = () => {
    if (!openPanel) return null;

    return (
      <View className="p-3 mt-1 bg-white border shadow-sm rounded-xl border-grey-200">
        {openPanel === "types" && (
          <View className="flex-row flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <SelectOption
                key={opt.value}
                label={opt.label}
                selected={value.types?.includes(opt.value) ?? false}
                onPress={() => handleToggleType(opt.value)}
              />
            ))}
          </View>
        )}

        {openPanel === "dates" && (
          <View className="flex-col gap-3">
            {[
              { key: "startDateFrom" as const, label: "Depuis" },
              { key: "startDateTo" as const, label: "Jusqu'au" },
            ].map(({ key, label }) => (
              <View key={key} className="flex-row items-center gap-3">
                <Text className="text-sm font-semibold text-grey-700 w-16">
                  {label}
                </Text>
                <View
                  className={clsx(
                    "flex-1 h-control flex-row items-center rounded-md border border-grey-300 px-3 bg-white transition-colors",
                    isWeb && "hover:border-primary focus-within:border-primary",
                  )}
                >
                  {/*
                   * Sur web  : <input type="date"> — date picker natif du navigateur.
                   * Sur native : TextInput masqué — tirets insérés automatiquement,
                   *             onChange déclenché seulement quand la date est complète
                   *             et calendairement valide (format AAAA-MM-JJ).
                   */}
                  <DateInput
                    value={value[key]}
                    onChange={(v) => onChange({ ...value, [key]: v })}
                    label={label}
                  />
                </View>
              </View>
            ))}
            <Text className="text-xs text-grey-400">
              Laissez un champ vide pour ne pas le filtrer.
            </Text>
          </View>
        )}

        {openPanel === "frequency" && (
          <View className="flex-row flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectOption
                key={opt.value}
                label={opt.label}
                selected={value.frequency === opt.value}
                onPress={() => handleFrequency(opt.value)}
              />
            ))}
          </View>
        )}

        {openPanel === "causes" && (
          <MultiSelectPanel
            items={causes}
            selectedIds={value.causeIds}
            onToggle={handleToggleCauseId}
          />
        )}

        {openPanel === "skills" && (
          <MultiSelectPanel
            items={skills}
            selectedIds={value.skillIds}
            onToggle={handleToggleSkillId}
          />
        )}

        {openPanel === "publicTypes" && (
          <MultiSelectPanel
            items={publicTypes}
            selectedIds={value.publicTypeIds}
            onToggle={handleTogglePublicTypeId}
          />
        )}

        {openPanel === "volunteerTypes" && (
          <MultiSelectPanel
            items={volunteerTypes}
            selectedIds={value.volunteerTypeIds}
            onToggle={handleToggleVolunteerTypeId}
          />
        )}
      </View>
    );
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <View className={clsx("gap-4", className)}>
      {/* Champ de recherche — variante 'list' seulement */}
      {variant === "list" && (
        <View
          className={clsx(
            "h-control flex-row items-center rounded-md border border-grey-300 px-3 gap-2 bg-white transition-colors",
            isWeb && "hover:border-primary focus-within:border-primary",
            isWeb &&
              "focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2",
          )}
        >
          <SearchIcon className="w-5 h-5 text-grey-400" />
          <TextInput
            value={value.search ?? ""}
            onChangeText={(text) =>
              onChange({ ...value, search: text || undefined })
            }
            placeholder="Rechercher une mission, une association..."
            placeholderTextColor={colors.grey[400]}
            style={webInputStyle}
            returnKeyType="search"
            className="flex-1 h-full p-0 font-sans text-base bg-transparent border-0 text-grey-900"
          />
        </View>
      )}

      {/* ── Row 1 — Barre primaire ───────────────────────────────────────── */}
      <View className="bg-white rounded-xl shadow-md border border-grey-100 px-3 py-2.5">
        {/*
         * Layout responsive :
         * - Mobile (flex-col) : radios → champ ville → triggers
         * - md+   (flex-row)  : [radios] | [champ ville] | [triggers] en ligne
         */}
        <View className="flex-col gap-2 md:flex-row md:items-center">

          {/* Partie 1 : boutons radio localisation */}
          <View className="flex-shrink-0 gap-1">
            <RadioOption
              label="Près de chez moi"
              active={!isRemote}
              onPress={() => handleLocationMode("nearby")}
            />
            <RadioOption
              label="Depuis chez moi"
              active={isRemote}
              onPress={() => handleLocationMode("remote")}
            />
          </View>

          {/* Séparateur + champ ville : inline sur md+, masqué sur mobile */}
          {!isRemote && (
            <View className="flex-row items-center flex-1 hidden min-w-0 gap-0 md:flex">
              <Divider />
              <View className="flex-1 min-w-[140px] max-w-[280px]">
                {cityField}
              </View>
            </View>
          )}

          {/* Séparateur avant les triggers */}
          <Divider className="hidden md:flex" />

          {/* Partie 3 : triggers (flex-row wrap pour petits écrans) */}
          <View className="flex-row flex-wrap items-center gap-x-1 gap-y-1.5">
            <SectionTrigger
              label="Activités"
              badge={typesCount > 0 ? String(typesCount) : undefined}
              active={typesCount > 0}
              open={openPanel === "types"}
              onPress={() => togglePanel("types")}
            />
            <Divider />
            <SectionTrigger
              label="Dates"
              badge={hasDate ? "•" : undefined}
              active={hasDate}
              open={openPanel === "dates"}
              onPress={() => togglePanel("dates")}
            />
            <Divider />
            <SectionTrigger
              label={
                value.frequency
                  ? (FREQUENCY_OPTIONS.find((f) => f.value === value.frequency)
                      ?.label ?? "Fréquence")
                  : "Fréquence"
              }
              active={!!value.frequency}
              open={openPanel === "frequency"}
              onPress={() => togglePanel("frequency")}
            />
          </View>

          {/* Champ ville : visible sur mobile seulement (sous les radios) */}
          {!isRemote && (
            <View className="flex md:hidden">
              {cityField}
            </View>
          )}

        </View>
      </View>

      {/* Panneau déroulant (triggers Row 1) */}
      {["types", "dates", "frequency"].includes(openPanel ?? "") && renderPanel()}

      {/* ── Row 2 — Chips secondaires ─────────────────────────────────────── */}
      <View className="flex-row flex-wrap items-center gap-2">
        {causes.length > 0 && (
          <FilterChip
            label="Causes"
            count={causesCount}
            active={causesCount > 0}
            open={openPanel === "causes"}
            onPress={() => togglePanel("causes")}
          />
        )}

        {skills.length > 0 && (
          <FilterChip
            label="Compétences"
            count={skillsCount}
            active={skillsCount > 0}
            open={openPanel === "skills"}
            onPress={() => togglePanel("skills")}
          />
        )}

        {publicTypes.length > 0 && (
          <FilterChip
            label="Publics aidés"
            count={publicTypesCount}
            active={publicTypesCount > 0}
            open={openPanel === "publicTypes"}
            onPress={() => togglePanel("publicTypes")}
          />
        )}

        {volunteerTypes.length > 0 && (
          <FilterChip
            label="Types de bénévoles"
            count={volunteerTypesCount}
            active={volunteerTypesCount > 0}
            open={openPanel === "volunteerTypes"}
            onPress={() => togglePanel("volunteerTypes")}
          />
        )}

        <ToggleChip
          label="Places restantes"
          active={!!value.hasAvailableSpots}
          onPress={handleAvailableSpots}
        />

        {/* Bouton réinitialiser (tertiary) */}
        {hasActiveFilters && (
          <Pressable
            onPress={() => {
              closePanel();
              onReset();
            }}
            role="button"
            accessibilityRole="button"
            className={clsx(
              "px-3 py-1.5 rounded ml-auto transition-colors",
              focusRing,
              isWeb && "web:cursor-pointer",
              "hover:bg-grey-100 active:bg-grey-200",
            )}
          >
            <Text className="text-sm font-semibold underline text-grey-700">
              Réinitialiser
            </Text>
          </Pressable>
        )}
      </View>

      {/* Panneau déroulant (chips Row 2) */}
      {["causes", "skills", "publicTypes", "volunteerTypes"].includes(
        openPanel ?? "",
      ) && renderPanel()}
    </View>
  );
}
