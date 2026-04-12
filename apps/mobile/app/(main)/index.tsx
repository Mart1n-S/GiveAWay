import {
  View,
  ScrollView,
  Platform,
  Dimensions,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Text, Button } from "@/components/ui";
import MapBase from "@/components/ui/map";
import { MissionFilters } from "@/components/ui/mission-filters";
import { MissionGrid } from "@/components/ui/mission-grid/mission-grid";
import { useAuthStore } from "@/stores/auth.store";
import { useReferenceStore } from "@/stores/reference.store";
import { useFilterReferencesStore } from "@/stores/filter-references.store";
import { MissionService } from "@/services/mission.service";
import type {
  MissionListItem,
  MissionListQuery,
  MissionMapItem,
} from "@repo/shared";
import { usePageTitle } from "@/hooks/usePageTitle";
import UserIconSource from "@assets/icons/ic_user.svg";
import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import ShieldIconSource from "@assets/icons/ic_shield.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const UserIcon = cssInterop(UserIconSource, iconConfig);
const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const ShieldIcon = cssInterop(ShieldIconSource, iconConfig);

// Mémoïsé pour éviter les re-renders lors des changements d'état du parent
// (ex : sélection d'un marqueur) qui fermeraient le Callout/Popup (bugs 3 & 4).
const MemoMap = memo(MapBase);

// --- Marketing (visiteur non-authentifie) ------------------------------------

type StepIcon = ReturnType<typeof cssInterop>;

interface Step {
  number: string;
  title: string;
  description: string;
  Icon: StepIcon;
  bgClass: string;
  iconClass: string;
}

const HOW_IT_WORKS: Step[] = [
  {
    number: "01",
    title: "Créez votre profil",
    description:
      "Renseignez vos compétences, vos centres d'intérêt et vos disponibilités. Plus votre profil est complet, meilleur sera le matching.",
    Icon: UserIcon,
    bgClass: "bg-blue-50",
    iconClass: "text-blue-700",
  },
  {
    number: "02",
    title: "Découvrez les missions",
    description:
      "Notre algorithme vous propose des missions adaptées à votre profil, triées par proximité géographique et affinité associative.",
    Icon: HandHeartIcon,
    bgClass: "bg-green-50",
    iconClass: "text-green-700",
  },
  {
    number: "03",
    title: "Engagez-vous près de chez vous",
    description:
      "Inscrivez-vous directement auprès des associations, suivez vos participations et mesurez votre impact bénévole au fil du temps.",
    Icon: LocalisationIcon,
    bgClass: "bg-badge-orange-bg",
    iconClass: "text-badge-orange-text",
  },
];

function StepCard({ step }: { step: Step }) {
  const { number, title, description, Icon, bgClass, iconClass } = step;
  return (
    <View className="flex-1 p-6 bg-white border rounded-2xl border-grey-200">
      <View className="flex-row items-center gap-3 mb-4">
        <View
          className={`w-12 h-12 rounded-xl items-center justify-center ${bgClass}`}
        >
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </View>
        <Text className="text-3xl font-bold text-grey-200">{number}</Text>
      </View>
      <Text className="mb-2 text-base font-bold text-grey-900">{title}</Text>
      <Text className="text-sm leading-6 text-grey-600">{description}</Text>
    </View>
  );
}

function ValuePill({
  icon: Icon,
  label,
}: {
  icon: StepIcon;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 px-4 py-2 bg-white border rounded-full border-grey-200">
      <Icon className="w-4 h-4 text-primary" />
      <Text className="text-sm font-semibold text-grey-800">{label}</Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="px-6 py-5 border bg-grey-50 border-grey-200 rounded-2xl">
      <Text className="mb-1 text-4xl font-bold text-primary">{value}</Text>
      <Text className="text-sm text-grey-600">{label}</Text>
    </View>
  );
}

// --- Section carte commune (Marketing + Discovery) ---------------------------

const EMPTY_FILTERS: MissionListQuery = { locationMode: "nearby" };
const PAGE_SIZE = 20;
const CARDS_INITIAL = 8;
const CARDS_INCREMENT = 4;

// Hauteur explicite de la carte — nécessaire pour que le ScrollView parent
// puisse calculer sa taille de contenu (bugs 2, 5).
// Sur web : "60vh" est une valeur CSS valide à l'exécution. Le cast `as unknown as number`
// contourne la restriction TypeScript (DimensionValue n'inclut pas les chaînes CSS libres).
const WINDOW_HEIGHT = Dimensions.get("window").height;
const MAP_CONTAINER_STYLE: ViewStyle = Platform.select({
  web: { height: "60vh" as unknown as number, minHeight: 500 },
  default: { height: Math.max(400, WINDOW_HEIGHT * 0.6) },
}) ?? { height: Math.max(400, WINDOW_HEIGHT * 0.6) };

interface MapSectionProps {
  filters: MissionListQuery;
  onFiltersChange: (f: MissionListQuery) => void;
  onReset: () => void;
  showFilters: boolean;
  causes: { id: number; label: string }[];
  skills: { id: number; label: string }[];
  publicTypes: { id: number; label: string }[];
  volunteerTypes: { id: number; label: string }[];
  /** Centre de carte imposé par le parent (géocodage hors MapSection). */
  center?: { lat: number; lon: number };
  /** Remonte un nouveau centre vers le parent (utilisé quand showFilters=true). */
  onCenterChange?: (lat: number, lon: number) => void;
}

function MapSection({
  filters,
  onFiltersChange,
  onReset,
  showFilters,
  causes,
  skills,
  publicTypes,
  volunteerTypes,
  center: centerProp,
  onCenterChange,
}: MapSectionProps) {
  const router = useRouter();

  const [mapMissions, setMapMissions] = useState<MissionMapItem[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [listMissions, setListMissions] = useState<MissionListItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(CARDS_INITIAL);
  // Centre local : utilisé quand les filtres sont à l'intérieur de MapSection
  // (showFilters=true, cas MarketingView). Sinon centerProp prime.
  const [localCenter, setLocalCenter] = useState<{ lat: number; lon: number } | undefined>();
  const mapCenter = centerProp ?? localCenter;
  const handleInternalCenterChange = (lat: number, lon: number) => {
    setLocalCenter({ lat, lon });
    onCenterChange?.(lat, lon);
  };

  const fetchMapMissions = useCallback(async (q: MissionListQuery) => {
    setIsMapLoading(true);
    try {
      const data = await MissionService.getMissionsForMap(q);
      setMapMissions(data);
    } catch {
      // silence
    } finally {
      setIsMapLoading(false);
    }
  }, []);

  const fetchListMissions = useCallback(async (q: MissionListQuery) => {
    setIsListLoading(true);
    setVisibleCount(CARDS_INITIAL);
    try {
      const result = await MissionService.getMissions({ ...q, pageSize: PAGE_SIZE, page: 1 });
      setListMissions(result.missions);
    } catch {
      // silence
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapMissions(filters);
    fetchListMissions(filters);
  }, [filters, fetchMapMissions, fetchListMissions]);

  const visibleMissions = useMemo(
    () =>
      visibleIds.length
        ? listMissions.filter((m) => visibleIds.includes(m.id))
        : listMissions,
    [listMissions, visibleIds],
  );

  // Callback stable (aucune dépendance) — le Callout/Popup s'ouvre nativement
  // via react-native-maps / Leaflet, sans déclenchement de re-render parent (bug 3).
  // TypeScript autorise un callback avec moins de paramètres que le type attendu.
  const handleMissionSelect = useCallback(() => {}, []);

  return (
    <View>
      {/* Filtres */}
      {showFilters && (
        <View className="px-4 pt-3 pb-2">
          <MissionFilters
            value={filters}
            onChange={onFiltersChange}
            onReset={onReset}
            variant="map"
            causes={causes}
            skills={skills}
            publicTypes={publicTypes}
            volunteerTypes={volunteerTypes}
            onCenterChange={handleInternalCenterChange}
          />
        </View>
      )}

      {/* Carte — hauteur fixe pour permettre le scroll de la page (bugs 2, 3, 4, 5) */}
      <View
        className={showFilters ? "mt-4" : undefined}
        style={MAP_CONTAINER_STYLE}
      >
        <MemoMap
          missions={mapMissions}
          isLoading={isMapLoading}
          onMissionSelect={handleMissionSelect}
          onVisibleMissionsChange={setVisibleIds}
          center={mapCenter}
        />
      </View>

      {/* Grille de missions sous la carte (bug 6) */}
      <View className="px-4 pt-4 pb-4 border-t border-grey-100">
        <MissionGrid
          missions={visibleMissions.slice(0, visibleCount)}
          isLoading={isListLoading}
          onMissionPress={(id) => router.push(`/missions/${id}` as never)}
        />

        {/* Bouton "Voir plus" — masqué une fois toutes les cards affichées */}
        {!isListLoading && visibleCount < visibleMissions.length && (
          <View className="items-center mt-6">
            <Button
              variant="secondary"
              onPress={() =>
                setVisibleCount((c) => c + CARDS_INCREMENT)
              }
            >
              Voir plus de missions
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

function MarketingView() {
  const router = useRouter();
  const { causes, skills, fetchReferences } = useReferenceStore();
  const { publicTypes, volunteerTypes, fetchFilterReferences } = useFilterReferencesStore();
  const [filters, setFilters] = useState<MissionListQuery>(EMPTY_FILTERS);

  useEffect(() => {
    fetchReferences();
    fetchFilterReferences();
  }, [fetchReferences, fetchFilterReferences]);

  usePageTitle("Accueil");
  return (
    <ScrollView className="flex-1 bg-white">
      {/* HERO */}
      <View className="items-center w-full max-w-5xl px-4 pt-10 pb-8 mx-auto md:px-8 md:pt-16 md:pb-12">
        <View className="bg-white border border-grey-200 rounded-full px-4 py-1.5 mb-5">
          <Text className="text-xs font-semibold tracking-widest uppercase text-primary">
            Bénévolat simplifié
          </Text>
        </View>
        <Text className="mb-4 text-4xl font-bold leading-tight text-center text-grey-900">
          Trouvez des missions qui{"\n"}
          <Text className="text-primary">vous ressemblent</Text>
        </Text>
        <Text className="max-w-xl mb-8 text-base leading-7 text-center text-grey-600">
          GiveAWay connecte bénévoles et associations grâce à un matching
          intelligent. Géolocalisation, compétences, disponibilités - chaque
          mission est faite pour vous.
        </Text>
        <View className="flex-row flex-wrap justify-center gap-3">
          <Button variant="primary" onPress={() => router.push("/inscription")}>
            Commencer maintenant
          </Button>
          <Button variant="secondary" onPress={() => router.push("/missions")}>
            Voir les missions
          </Button>
        </View>
      </View>

      {/* CARTE + FILTRES + CARDS */}
      <View className="w-full px-4 py-6 mx-auto max-w-7xl md:px-8 md:py-8">
        <View className="w-full max-w-5xl mx-auto">
          <View className="mb-4">
            <Text className="text-xl font-bold text-grey-900">
              Missions près de chez vous
            </Text>
            <Text className="mt-1 text-sm text-grey-500">
              Cliquez sur un marqueur pour découvrir la mission
            </Text>
          </View>
          <View className="overflow-hidden border rounded-2xl border-grey-200">
            <MapSection
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
              showFilters
              causes={causes}
              skills={skills}
              publicTypes={publicTypes}
              volunteerTypes={volunteerTypes}
            />
          </View>
        </View>
      </View>

      {/* COMMENT CA MARCHE */}
      <View className="bg-grey-50">
        <View className="w-full max-w-5xl px-4 mx-auto py-14 md:px-8 md:py-20">
          <View className="items-center mb-12">
            <Text className="mb-3 text-3xl font-bold text-center text-grey-900">
              Comment ça marche ?
            </Text>
            <Text className="max-w-lg text-base leading-7 text-center text-grey-600">
              En quelques étapes, devenez acteur du changement dans votre
              communauté.
            </Text>
          </View>
          <View className="flex-col gap-4 mb-12 md:flex-row md:gap-6">
            {HOW_IT_WORKS.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </View>
          <View className="items-center">
            <Button
              variant="primary"
              onPress={() => router.push("/inscription")}
            >
              Rejoindre GiveAWay
            </Button>
          </View>
        </View>
      </View>

      {/* POURQUOI GIVEAWAY */}
      <View className="w-full max-w-5xl px-4 mx-auto py-14 md:px-8 md:py-20">
        <View className="flex-col md:flex-row md:items-center md:gap-16">
          <View className="flex-1 mb-10 md:mb-0">
            <Text className="mb-4 text-3xl font-bold leading-tight text-grey-900">
              Le bénévolat,{"\n"}
              <Text className="text-primary">réinventé</Text>
            </Text>
            <Text className="mb-6 text-base leading-7 text-grey-600">
              Les associations peinent à trouver des bénévoles. Les bénévoles
              peinent à trouver des missions. GiveAWay résout les deux problèmes
              à la fois grâce à un algorithme de matching qui rapproche les
              bonnes personnes des bonnes causes.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <ValuePill icon={ShieldIcon} label="100 % gratuit" />
              <ValuePill icon={HandHeartIcon} label="Impact réel" />
              <ValuePill icon={LocalisationIcon} label="Près de chez vous" />
            </View>
          </View>
          <View className="flex-col gap-4 md:w-64">
            <StatCard value="29" label="causes soutenues" />
            <StatCard value="16" label="types de compétences" />
            <StatCard value="9" label="catégories d'associations" />
          </View>
        </View>
      </View>

      {/* FOOTER CTA */}
      <View className="bg-primary">
        <View className="items-center w-full max-w-5xl px-4 mx-auto py-14 md:px-8 md:py-16">
          <Text className="mb-3 text-3xl font-bold text-center text-white">
            Prêt à faire la différence ?
          </Text>
          <Text className="max-w-md mb-8 text-base leading-7 text-center text-white opacity-90">
            Rejoignez des milliers de bénévoles qui agissent chaque jour pour un
            monde meilleur.
          </Text>
          <View className="flex-row flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onPress={() => router.push("/inscription")}
            >
              Créer mon profil
            </Button>
            <Button
              variant="secondary"
              onPress={() => router.push("/missions")}
            >
              Explorer les missions
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// --- Discovery (benevole authentifie) ----------------------------------------

function DiscoveryView() {
  const router = useRouter();
  const { causes, skills, fetchReferences } = useReferenceStore();
  const { publicTypes, volunteerTypes, fetchFilterReferences } = useFilterReferencesStore();

  const [filters, setFilters] = useState<MissionListQuery>(EMPTY_FILTERS);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | undefined>();

  // Missions mode remote (liste verticale)
  const [remoteMissions, setRemoteMissions] = useState<MissionListItem[]>([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);

  const isRemote = filters.locationMode === "remote";
  usePageTitle("Accueil");
  // Chargement des references au montage (TTL gere par les stores)
  useEffect(() => {
    fetchReferences();
    fetchFilterReferences();
  }, [fetchReferences, fetchFilterReferences]);

  const fetchRemoteMissions = useCallback(async (q: MissionListQuery) => {
    setIsRemoteLoading(true);
    try {
      const result = await MissionService.getMissions({ ...q, pageSize: 20, page: 1 });
      setRemoteMissions(result.missions);
    } catch {
      // silence
    } finally {
      setIsRemoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isRemote) {
      fetchRemoteMissions(filters);
    }
  }, [filters, isRemote, fetchRemoteMissions]);

  const handleFiltersChange = (newFilters: MissionListQuery) => setFilters(newFilters);
  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setMapCenter(undefined);
  };

  // Mode distanciel : afficher MissionGrid sans carte
  if (isRemote) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full px-4 py-4 mx-auto max-w-7xl md:px-8">
          <MissionFilters
            value={filters}
            onChange={handleFiltersChange}
            onReset={handleReset}
            variant="map"
            causes={causes}
            skills={skills}
            publicTypes={publicTypes}
            volunteerTypes={volunteerTypes}
            onCenterChange={(lat, lon) => setMapCenter({ lat, lon })}
          />

          <View className="mt-4">
            <Text className="mb-1 text-lg font-bold text-grey-900">
              Missions en distanciel
            </Text>
            <Text className="mb-4 text-sm text-grey-500">
              Ces missions peuvent être réalisées depuis chez vous.
            </Text>
            <MissionGrid
              missions={remoteMissions}
              isLoading={isRemoteLoading}
              onMissionPress={(id) => router.push(`/missions/${id}`)}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Mode nearby : carte + filtres + grille de cards (bugs 1, 5, 7)
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="w-full mx-auto max-w-7xl">
        <View className="px-4 pt-3 md:px-8">
          <MissionFilters
            value={filters}
            onChange={handleFiltersChange}
            onReset={handleReset}
            variant="map"
            causes={causes}
            skills={skills}
            publicTypes={publicTypes}
            volunteerTypes={volunteerTypes}
            onCenterChange={(lat, lon) => setMapCenter({ lat, lon })}
          />
        </View>
        {/* mt-4 : espace entre les filtres et la carte (bug 1) */}
        <View className="mt-4">
          <MapSection
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleReset}
            showFilters={false}
            causes={causes}
            skills={skills}
            publicTypes={publicTypes}
            volunteerTypes={volunteerTypes}
            center={mapCenter}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// --- Page principale ---------------------------------------------------------

export default function HomeScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <DiscoveryView /> : <MarketingView />;
}
