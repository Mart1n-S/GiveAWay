import { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  Animated,
  Platform,
  Image,
  Linking,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";
import clsx from "clsx";

import type {
  MissionDetail,
  MissionFrequency,
  MissionAvailabilityType,
  ActivityType,
} from "@repo/shared";
import { MissionService } from "@/services/mission.service";
import { useAuthStore } from "@/stores/auth.store";
import { Text, Button, TagBadge, colors } from "@/components/ui";
import { MissionMap } from "@/components/ui/mission-map";
import { usePageTitle } from "@/hooks/usePageTitle";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import ClockIconSource from "@assets/icons/ic_clock.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const ClockIcon = cssInterop(ClockIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const FREQUENCY_LABELS: Record<MissionFrequency, string> = {
  ONCE: "Ponctuel",
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
};

const AVAILABILITY_LABELS: Record<MissionAvailabilityType, string> = {
  REMOTE: "À distance",
  ON_SITE: "Sur place",
  HYBRID: "Hybride",
};

function formatDateRange(
  start: Date | string | null,
  end: Date | string | null,
): string | null {
  if (!start && !end) return null;
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (start && end) return `Du ${fmt(start)} au ${fmt(end)}`;
  if (start) return `À partir du ${fmt(start)}`;
  return `Jusqu'au ${fmt(end!)}`;
}

function formatAddress(
  address: NonNullable<MissionDetail["address"]>,
): string {
  return [address.street, address.postalCode, address.city]
    .filter((v): v is string => Boolean(v))
    .join(", ");
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ActivityType,
  {
    label: string;
    badgeVariant: "green" | "blue" | "orange" | "surface" | "red";
    heroBg: string;
    heroBorder: string;
    iconBg: string;
    iconColor: string;
    Icon: ReturnType<typeof cssInterop>;
  }
> = {
  MISSION: {
    label: "Mission de bénévolat",
    badgeVariant: "green",
    heroBg: "bg-green-50",
    heroBorder: "border-green-100",
    iconBg: "bg-green-100",
    iconColor: "text-green-700",
    Icon: HandHeartIcon,
  },
  EVENT: {
    label: "Événement",
    badgeVariant: "blue",
    heroBg: "bg-blue-50",
    heroBorder: "border-blue-100",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    Icon: CalendarIcon,
  },
  COLLECT: {
    label: "Collecte",
    badgeVariant: "orange",
    heroBg: "bg-badge-orange-bg",
    heroBorder: "border-white-active",
    iconBg: "bg-white-active",
    iconColor: "text-badge-orange-text",
    Icon: BoxIcon,
  },
  INFO: {
    label: "Information",
    badgeVariant: "surface",
    heroBg: "bg-grey-100",
    heroBorder: "border-grey-200",
    iconBg: "bg-grey-200",
    iconColor: "text-grey-700",
    Icon: InfoIcon,
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { readonly className?: string }) {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      className={clsx("bg-grey-300 rounded-xl", className)}
      style={{ opacity: anim }}
    />
  );
}

function SkeletonScreen() {
  return (
    <View className="flex-1 bg-grey-50">
      <Skeleton className="rounded-none h-44" />
      <Skeleton className="h-16 mt-px rounded-none" />
      <View className="w-full max-w-4xl px-4 pt-5 mx-auto">
        <View className="flex-col md:flex-row md:gap-6 md:items-start">
          {/* Sidebar skeleton */}
          <View className="hidden gap-3 md:flex md:flex-col md:w-72 md:shrink-0">
            <Skeleton className="w-2/3 h-6" />
            <View className="flex-row flex-wrap gap-2">
              <Skeleton className="w-20 h-6 rounded-full" />
              <Skeleton className="w-16 h-6 rounded-full" />
              <Skeleton className="w-24 h-6 rounded-full" />
            </View>
            <View className="h-px my-1 bg-grey-200" />
            <Skeleton className="w-1/2 h-6" />
            <View className="flex-row flex-wrap gap-2">
              <Skeleton className="h-6 rounded-full w-18" />
              <Skeleton className="h-6 rounded-full w-22" />
            </View>
          </View>
          {/* Main skeleton */}
          <View className="flex-1 gap-4">
            <View className="flex-row items-center gap-3 p-4 bg-white rounded-2xl">
              <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
              <View className="flex-1 gap-2">
                <Skeleton className="w-2/3 h-4" />
                <Skeleton className="w-full h-3" />
              </View>
            </View>
            <View className="gap-2 p-4 bg-white rounded-2xl">
              <Skeleton className="w-1/4 h-3 mb-1" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </View>
            <Skeleton className="w-full h-28" />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  type,
  onRetry,
  onBack,
}: {
  readonly type: "network" | "notfound" | null;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}) {
  const isNotFound = type === "notfound";
  return (
    <View
      testID={isNotFound ? "mission-error-notfound" : "mission-error-network"}
      className="items-center justify-center flex-1 gap-6 px-8 bg-grey-50"
    >
      <View className="items-center justify-center w-20 h-20 rounded-full bg-grey-100">
        <Text className="text-4xl">{isNotFound ? "🔍" : "⚠️"}</Text>
      </View>
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-center text-grey-900">
          {isNotFound ? "Mission introuvable" : "Impossible de charger"}
        </Text>
        <Text className="text-sm leading-5 text-center text-grey-700">
          {isNotFound
            ? "Cette mission n'existe plus ou a été supprimée."
            : "Vérifiez votre connexion et réessayez."}
        </Text>
      </View>
      <View className="w-full gap-3">
        {!isNotFound && (
          <Button variant="primary" onPress={onRetry} className="w-full">
            Réessayer
          </Button>
        )}
        <Button variant="secondary" onPress={onBack} className="w-full">
          Retour
        </Button>
      </View>
    </View>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function SectionLabel({ label }: { readonly label: string }) {
  return (
    <Text className="text-xs font-semibold tracking-wider uppercase text-grey-700">
      {label}
    </Text>
  );
}

function Divider() {
  return <View className="h-px bg-grey-400" />;
}

function MetaRow({
  icon: Icon,
  children,
}: {
  readonly icon: ReturnType<typeof cssInterop>;
  readonly children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="items-center justify-center w-8 h-8 rounded-lg bg-grey-50 shrink-0">
        <Icon className="w-4 h-4 text-grey-700" />
      </View>
      <View className="flex-1 justify-center min-h-[32px]">{children}</View>
    </View>
  );
}

function TagGroup({
  label,
  items,
  variant,
}: {
  readonly label: string;
  readonly items: { readonly id: number; readonly label: string }[];
  readonly variant: "orange" | "green" | "blue" | "surface" | "red";
}) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionLabel label={label} />
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <TagBadge
            key={item.id}
            label={item.label}
            variant={variant}
            size="sm"
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"network" | "notfound" | null>(null);

  usePageTitle("Détail mission");

  const loadMission = () => {
    if (!id) return;
    setIsLoading(true);
    setErrorType(null);
    MissionService.getMissionById(Number(id))
      .then(setMission)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setErrorType("notfound");
        } else {
          setErrorType("network");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadMission();
  }, [id]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push("/missions");
  };

  const handleAssociationPress = () => {
    router.push(`/associations/${mission?.association.id}`);
  };

  // ─── Mémoïsation ────────────────────────────────────────────────────────────

  const formattedDuration = useMemo(
    () => (mission?.durationInt ? formatDuration(mission.durationInt) : null),
    [mission?.durationInt],
  );

  const formattedDateRange = useMemo(
    () => formatDateRange(mission?.startDate ?? null, mission?.endDate ?? null),
    [mission?.startDate, mission?.endDate],
  );

  const isAssociationMember = useMemo(
    () =>
      mission != null &&
      (user?.associations ?? []).some(
        (a) => a.associationId === mission.association.id,
      ),
    [mission, user?.associations],
  );

  const canRegister = useMemo(
    () =>
      !isAssociationMember &&
      mission?.hasRegistration === true &&
      mission?.status === "ACTIVE",
    [isAssociationMember, mission?.hasRegistration, mission?.status],
  );

  const isFull = useMemo(
    () =>
      mission?.volunteersNeeded != null &&
      mission.participantsCount >= mission.volunteersNeeded,
    [mission?.volunteersNeeded, mission?.participantsCount],
  );

  const hasTags = useMemo(
    () =>
      (mission?.causes.length ?? 0) > 0 ||
      (mission?.skills.length ?? 0) > 0 ||
      (mission?.volunteerTypes.length ?? 0) > 0 ||
      (mission?.publicTypes.length ?? 0) > 0,
    [mission?.causes, mission?.skills, mission?.volunteerTypes, mission?.publicTypes],
  );

  // ─── États ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Mission" }} />
        <SkeletonScreen />
      </>
    );
  }

  if (errorType || !mission) {
    return (
      <>
        <Stack.Screen options={{ title: "Mission" }} />
        <ErrorScreen type={errorType} onRetry={loadMission} onBack={handleBack} />
      </>
    );
  }

  // ─── Mission chargée ────────────────────────────────────────────────────────

  const tc = TYPE_CONFIG[mission.type];
  const hasAddress = mission.address !== null;
  const mapLat = mission.address?.latitude ?? null;
  const mapLng = mission.address?.longitude ?? null;
  const showCta = canRegister || isAssociationMember;

  let ctaButton: React.ReactNode;
  if (isAssociationMember) {
    ctaButton = (
      <Button
        testID="btn-manage-mission"
        variant="secondary"
        onPress={() => {
          router.navigate("/association/missions" as any);
          setTimeout(() => {
            router.push(`/association/missions/${mission.id}` as any);
          }, 0);
        }}
        className="w-full"
      >
        Gérer cette mission
      </Button>
    );
  } else if (isFull) {
    ctaButton = (
      <Button
        testID="btn-mission-full"
        variant="primary"
        disabled
        onPress={() => {}}
        className="w-full"
      >
        Complet — toutes les places sont prises
      </Button>
    );
  } else {
    ctaButton = (
      <Button testID="btn-candidater" variant="primary" onPress={() => {}} className="w-full">
        Candidater à cette mission
      </Button>
    );
  }
  const ctaBottomOffset = showCta ? insets.bottom + 84 : 32;

  const assocInitials = mission.association.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const stats: Array<{
    Icon: ReturnType<typeof cssInterop>;
    value: string;
    label: string;
  }> = [
    ...(mission.hasRegistration && mission.volunteersNeeded != null
      ? [
          {
            Icon: HandHeartIcon,
            value: `${mission.participantsCount} / ${mission.volunteersNeeded}`,
            label: "bénévole" + (mission.participantsCount > 1 ? "s" : ""),
          },
        ]
      : []),
    ...(formattedDuration
      ? [{ Icon: ClockIcon, value: formattedDuration, label: "durée" }]
      : []),
    ...(mission.frequency
      ? [{ Icon: CalendarIcon, value: FREQUENCY_LABELS[mission.frequency], label: "fréquence" }]
      : []),
  ];

  // Bloc Catégories — rendu dans le sidebar (desktop) ET en bas (mobile)
  const categoriesBlock = hasTags ? (
    <View className="gap-4 p-4 bg-white rounded-2xl">
      <SectionLabel label="Catégories & Compétences" />

      <TagGroup
        label="Causes soutenues"
        items={mission.causes}
        variant="orange"
      />

      {mission.causes.length > 0 && mission.skills.length > 0 && <Divider />}

      <TagGroup
        label="Compétences"
        items={mission.skills}
        variant="green"
      />

      {(mission.causes.length > 0 || mission.skills.length > 0) &&
        mission.volunteerTypes.length > 0 && <Divider />}

      <TagGroup
        label="Profil bénévole"
        items={mission.volunteerTypes}
        variant="blue"
      />

      {(mission.causes.length > 0 ||
        mission.skills.length > 0 ||
        mission.volunteerTypes.length > 0) &&
        mission.publicTypes.length > 0 && <Divider />}

      <TagGroup
        label="Publics visés"
        items={mission.publicTypes}
        variant="red"
      />
    </View>
  ) : null;

  return (
    <>
      <Stack.Screen options={{ title: mission.title }} />

      <View className="flex-1 bg-grey-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: ctaBottomOffset }}
        >
          {/* ────────────────────────────────────────── HERO ── */}
          <View
            className={clsx(
              "pt-6 pb-8 px-4 border-b",
              tc.heroBg,
              tc.heroBorder,
            )}
          >
            <View className="w-full max-w-4xl gap-4 mx-auto">
              {/* Bouton retour — web uniquement */}
              {Platform.OS === "web" && (
                <View className="items-start">
                  <Button
                    testID="btn-back-mission"
                    variant="secondary"
                    onPress={handleBack}
                    icon={
                      <ArrowLeftIcon className="w-5 h-5 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    accessibilityLabel="Retour"
                  >
                    Retour
                  </Button>
                </View>
              )}

              {/* Icône type */}
              <View
                className={clsx(
                  "w-14 h-14 rounded-2xl items-center justify-center",
                  tc.iconBg,
                )}
              >
                <tc.Icon className={clsx("w-7 h-7", tc.iconColor)} />
              </View>

              {/* Badge + titre */}
              <View className="gap-2">
                <TagBadge
                  testID="mission-detail-badge"
                  label={tc.label}
                  variant={tc.badgeVariant}
                  size="sm"
                />
                <Text testID="mission-detail-title" className="text-2xl font-bold leading-snug text-grey-900">
                  {mission.title}
                </Text>
              </View>

              {/* Attribution association */}
              <Text className="text-sm text-grey-700">
                Proposé par{" "}
                <Text className="font-semibold text-grey-800">
                  {mission.association.name}
                </Text>
              </Text>
            </View>
          </View>

          {/* ─────────────────────────────────────── STATS ── */}
          {stats.length > 0 && (
            <View className="bg-white border-b border-grey-100">
              <View className="flex-row w-full max-w-4xl mx-auto">
                {stats.map((s, i) => (
                  <View key={s.label} className="flex-row flex-1">
                    {i > 0 && <View className="w-px bg-grey-100" />}
                    <View className="flex-1 items-center py-4 gap-0.5">
                      <s.Icon className="w-4 h-4 text-grey-400" />
                      <Text className="text-sm font-bold text-grey-900">
                        {s.value}
                      </Text>
                      <Text className="text-xs text-grey-700">{s.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ────────────────────────────────────── CONTENU ── */}
          <View className="w-full max-w-4xl px-4 pt-4 pb-2 mx-auto">
            <View className="flex-col md:flex-row md:items-start md:gap-6">
              {/* ── Sidebar gauche : Catégories (desktop uniquement) ── */}
              {hasTags && (
                <View className="hidden gap-4 md:flex md:flex-col md:w-64 md:shrink-0">
                  {categoriesBlock}
                </View>
              )}

              {/* ── Contenu principal ── */}
              <View className="flex-1 min-w-0 gap-4">
                {/* ── Catégories : visible uniquement sur mobile (< md) ── */}
                {hasTags && (
                  <View className="md:hidden">{categoriesBlock}</View>
                )}

                {/* Association */}
                <View className="gap-4 p-4 bg-white rounded-2xl">
                  <SectionLabel label="L'association" />
                  <View className="flex-row items-start gap-4">
                    {mission.association.logoUrl ? (
                      <Image
                        source={{ uri: mission.association.logoUrl }}
                        style={{ width: 56, height: 56, borderRadius: 12 }}
                        accessibilityLabel={`Logo de ${mission.association.name}`}
                      />
                    ) : (
                      <View
                        className="items-center justify-center w-14 h-14 rounded-xl shrink-0"
                        style={{ backgroundColor: colors.primary.active }}
                      >
                        <Text className="text-lg font-bold text-white">
                          {assocInitials}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1 gap-1">
                      <Pressable
                        onPress={handleAssociationPress}
                        className="self-start rounded-md web:cursor-pointer"
                        accessibilityRole="button"
                        accessibilityLabel={`Voir le profil de ${mission.association.name}`}
                      >
                        <Text
                          testID="mission-detail-association"
                          className="text-base font-bold underline text-primary"
                        >
                          {mission.association.name}
                        </Text>
                      </Pressable>
                      {mission.association.description && (
                        <Text
                          className="text-sm leading-5 text-grey-700"
                          numberOfLines={3}
                        >
                          {mission.association.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {mission.association.website && (
                    <Button
                      variant="secondary"
                      onPress={() =>
                        Linking.openURL(mission.association.website!)
                      }
                      className="w-full"
                    >
                      Visiter le site web
                    </Button>
                  )}
                </View>

                {/* Description */}
                <View testID="mission-detail-description" className="gap-3 p-4 bg-white rounded-2xl">
                  <SectionLabel label="À propos de la mission" />
                  <Text className="text-sm leading-6 text-grey-700">
                    {mission.description}
                  </Text>
                </View>

                {/* Informations pratiques */}
                <View className="gap-4 p-4 bg-white rounded-2xl">
                  <SectionLabel label="Informations pratiques" />

                  {/* Modalité (+ adresse inline si sur place ou hybride) */}
                  {mission.availabilityType && (
                    <MetaRow icon={LocalisationIcon}>
                      <Text className="text-sm font-medium text-grey-900">
                        {AVAILABILITY_LABELS[mission.availabilityType]}
                      </Text>
                      {mission.availabilityType !== "REMOTE" && hasAddress && (
                        <Text className="text-xs text-grey-700 mt-0.5">
                          {formatAddress(mission.address!)}
                        </Text>
                      )}
                    </MetaRow>
                  )}

                  {/* Adresse séparée pour les missions à distance */}
                  {mission.availabilityType === "REMOTE" && hasAddress && (
                    <>
                      <Divider />
                      <MetaRow icon={LocalisationIcon}>
                        <Text className="text-sm text-grey-700">
                          {formatAddress(mission.address!)}
                        </Text>
                      </MetaRow>
                    </>
                  )}

                  {formattedDateRange && (
                    <>
                      <Divider />
                      <MetaRow icon={CalendarIcon}>
                        <Text className="text-sm text-grey-700">
                          {formattedDateRange}
                        </Text>
                      </MetaRow>
                    </>
                  )}

                  {(formattedDuration || mission.frequency) && (
                    <>
                      <Divider />
                      <MetaRow icon={ClockIcon}>
                        <Text className="text-sm text-grey-700">
                          {[
                            formattedDuration,
                            mission.frequency
                              ? FREQUENCY_LABELS[mission.frequency]
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </MetaRow>
                    </>
                  )}

                  {mapLat !== null && mapLng !== null && (
                    <>
                      <Divider />
                      <MissionMap
                        latitude={mapLat}
                        longitude={mapLng}
                        address={mission.address!.street}
                        city={mission.address!.city}
                        height={200}
                      />
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ─────────────────────────────────────── CTA FIXE ── */}
        {showCta && (
          <View
            testID="mission-detail-cta"
            className="absolute bottom-0 left-0 right-0 px-4 bg-white border-t border-grey-100"
            style={{
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            }}
          >
            <View className="w-full max-w-4xl mx-auto">
              {ctaButton}
            </View>
          </View>
        )}
      </View>
    </>
  );
}
