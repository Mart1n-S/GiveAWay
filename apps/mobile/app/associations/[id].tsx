import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  Animated,
  Platform,
  Image,
  Linking,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";
import clsx from "clsx";

import type { AssociationPublicProfile, MissionListItem } from "@repo/shared";
import {
  getPublicAssociation,
  getFollowStatus,
  followAssociation,
  unfollowAssociation,
} from "@/services/association.service";
import { MissionService } from "@/services/mission.service";
import { useAuthStore } from "@/stores/auth.store";
import { useProfileStore } from "@/stores/profile.store";
import { Text, Button, TagBadge, colors } from "@/components/ui";
import { MissionCard } from "@/components/ui/mission-card/mission-card";
import { MissionMap } from "@/components/ui/mission-map";
import { usePageTitle } from "@/hooks/usePageTitle";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import PhoneIconSource from "@assets/icons/ic_phone.svg";
import GlobeIconSource from "@assets/icons/ic_globe.svg";
import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import NotificationLineIconSource from "@assets/icons/ic_notification_line.svg";
import NotificationSolidIconSource from "@assets/icons/ic_notification_solid.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const PhoneIcon = cssInterop(PhoneIconSource, iconConfig);
const GlobeIcon = cssInterop(GlobeIconSource, iconConfig);
const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const NotificationLineIcon = cssInterop(NotificationLineIconSource, iconConfig);
const NotificationSolidIcon = cssInterop(NotificationSolidIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);

const MISSIONS_PAGE_SIZE = 6;

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
      <Skeleton className="rounded-none h-36" />
      <View className="w-full max-w-4xl gap-4 px-4 pt-5 mx-auto">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
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
    <View className="items-center justify-center flex-1 gap-6 px-8 bg-grey-50">
      <View className="items-center justify-center w-20 h-20 rounded-full bg-grey-100">
        <Text className="text-4xl">{isNotFound ? "🔍" : "⚠️"}</Text>
      </View>
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-center text-grey-900">
          {isNotFound ? "Association introuvable" : "Impossible de charger"}
        </Text>
        <Text className="text-sm leading-5 text-center text-grey-700">
          {isNotFound
            ? "Cette association n'existe plus ou n'est pas encore validée."
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

// ─── Notification Modal ───────────────────────────────────────────────────────

function NotificationModal({
  visible,
  associationName,
  onConfirm,
  onCancel,
}: {
  readonly visible: boolean;
  readonly associationName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Overlay cliquable */}
      <Pressable
        className="items-center justify-center flex-1 px-6 bg-black/50"
        onPress={onCancel}
      >
        {/* Carte modale — on bloque la propagation pour ne pas fermer en cliquant dedans */}
        <Pressable
          className="w-full max-w-sm overflow-hidden bg-white rounded-3xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icône en haut */}
          <View className="items-center pt-8 pb-4">
            <View className="items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
              <NotificationSolidIcon className="w-8 h-8 text-primary" />
            </View>
          </View>

          {/* Texte */}
          <View className="gap-3 px-6 pb-2">
            <Text className="text-lg font-bold text-center text-grey-900">
              Recevoir des notifications
            </Text>
            <Text className="text-sm leading-6 text-center text-grey-700">
              Vous serez averti dès que{" "}
              <Text className="font-semibold text-grey-900">{associationName}</Text>{" "}
              publie une nouvelle mission de bénévolat.
            </Text>

            {/* Note sur les paramètres — bulle bleue */}
            <View className="flex-row gap-3 p-4 border border-blue-200 rounded-xl bg-blue-50">
              <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-blue-700">
                  Paramètres requis
                </Text>
                <Text className="text-sm leading-5 text-blue-600">
                  Pour recevoir ces alertes, assurez-vous d'avoir activé les{" "}
                  <Text className="font-semibold">notifications</Text>{" "}
                  dans vos paramètres de profil.
                </Text>
              </View>
            </View>
          </View>

          {/* Boutons */}
          <View className="flex-row gap-3 px-6 pt-4 pb-6">
            <Button
              variant="secondary"
              onPress={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onPress={onConfirm}
              className="flex-1"
            >
              Activer
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  return <View className="h-px bg-grey-100" />;
}

function MetaRow({
  icon: Icon,
  children,
  onPress,
}: {
  readonly icon: ReturnType<typeof cssInterop>;
  readonly children: React.ReactNode;
  readonly onPress?: () => void;
}) {
  const inner = (
    <View className="flex-row items-start gap-3">
      <View className="items-center justify-center w-8 h-8 rounded-lg bg-badge-orange-bg shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </View>
      <View className="flex-1 justify-center min-h-[32px]">{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={clsx(
          "rounded-md border border-transparent bg-white/0 transition-all",
          "web:cursor-pointer hover:bg-white-hover active:bg-white-active",
          "focus:ring-2 focus:ring-focus focus:ring-offset-2",
          "web:focus:ring-0 web:focus:ring-offset-0 web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        )}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

function AssociationInitials({ name }: { readonly name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      className="items-center justify-center w-20 h-20 rounded-2xl shrink-0"
      style={{ backgroundColor: colors.primary.active }}
    >
      <Text className="text-2xl font-bold text-white">{initials}</Text>
    </View>
  );
}

// ─── Bouton notification (bouton icône) ───────────────────────────────────────

function NotifyIconButton({
  notified,
  onPress,
}: {
  readonly notified: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        "items-center justify-center w-10 h-10 rounded-xl border shrink-0 web:cursor-pointer",
        notified
          ? "bg-primary border-primary"
          : "bg-white border-grey-200 hover:border-primary",
      )}
      accessibilityLabel={
        notified
          ? "Se désabonner des notifications"
          : "Être notifié des nouvelles missions"
      }
    >
      {notified ? (
        <NotificationSolidIcon className="w-5 h-5 text-white" />
      ) : (
        <NotificationLineIcon className="w-5 h-5 text-grey-700" />
      )}
    </Pressable>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssociationPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [association, setAssociation] = useState<AssociationPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"network" | "notfound" | null>(null);

  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [missionsTotal, setMissionsTotal] = useState(0);
  const [missionsPage, setMissionsPage] = useState(1);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsLoadingMore, setMissionsLoadingMore] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notified, setNotified] = useState(false);
  const [notifyModalVisible, setNotifyModalVisible] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  usePageTitle("Association");

  const loadAssociation = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setErrorType(null);
    getPublicAssociation(Number(id))
      .then(setAssociation)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setErrorType("notfound");
        } else {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("introuvable")) {
            setErrorType("notfound");
          } else {
            setErrorType("network");
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const loadMissions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!id) return;
      append ? setMissionsLoadingMore(true) : setMissionsLoading(true);
      try {
        const result = await MissionService.getMissions({
          associationId: Number(id),
          page: pageToLoad,
          pageSize: MISSIONS_PAGE_SIZE,
        });
        setMissions((prev) =>
          append ? [...prev, ...result.missions] : result.missions,
        );
        setMissionsTotal(result.total);
        setMissionsPage(pageToLoad);
      } catch {
        // silently ignore — the profile itself remains visible
      } finally {
        setMissionsLoading(false);
        setMissionsLoadingMore(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadAssociation();
  }, [loadAssociation]);

  useEffect(() => {
    if (association) loadMissions(1, false);
  }, [association, loadMissions]);

  useEffect(() => {
    if (!association || !isAuthenticated || !id) return;
    getFollowStatus(Number(id))
      .then((res) => setNotified(res.isFollowing))
      .catch(() => {});
  }, [association, isAuthenticated, id]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push("/associations");
  };

  const handleMissionPress = (missionId: number) => {
    router.push(`/missions/${missionId}`);
  };

  const handleNotifyPress = () => {
    if (notified) {
      void handleUnfollow();
    } else {
      setNotifyModalVisible(true);
    }
  };

  const handleNotifyConfirm = async () => {
    setNotifyModalVisible(false);

    if (!isAuthenticated) {
      setNotified(true);
      return;
    }

    if (!id) return;
    setNotifyLoading(true);
    try {
      await followAssociation(Number(id));
      setNotified(true);
      const store = useProfileStore.getState();
      const prev = store.profile?.followsCount ?? 0;
      store.updateProfile({ followsCount: prev + 1 });
    } catch {
      // silently ignore
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!id) return;
    setNotifyLoading(true);
    try {
      await unfollowAssociation(Number(id));
      setNotified(false);
      const store = useProfileStore.getState();
      const prev = store.profile?.followsCount ?? 0;
      store.updateProfile({ followsCount: Math.max(0, prev - 1) });
    } catch {
      // silently ignore
    } finally {
      setNotifyLoading(false);
    }
  };

  const hasMissionsMore = missions.length < missionsTotal;

  let missionsContent: React.ReactNode;
  if (missionsLoading) {
    missionsContent = (
      <View className="items-center py-8">
        <ActivityIndicator color={colors.primary.default} />
      </View>
    );
  } else if (missions.length === 0) {
    missionsContent = (
      <View className="items-center gap-2 py-8">
        <Text className="text-sm font-semibold text-grey-700">
          Aucune mission active
        </Text>
        <Text className="text-xs text-center text-grey-600">
          Cette association n'a pas encore publié de mission.
        </Text>
      </View>
    );
  } else {
    missionsContent = (
      <View className="gap-3">
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            title={mission.title}
            description={mission.description}
            type={mission.type}
            associationName={mission.association.name}
            city={mission.address?.city ?? null}
            durationInt={mission.durationInt}
            frequency={mission.frequency}
            volunteersNeeded={mission.volunteersNeeded}
            startDate={mission.startDate}
            causes={mission.causes.map((c) => c.label)}
            volunteerTypes={mission.volunteerTypes.map((v) => v.label)}
            testID={`mission-card-${mission.id}`}
            onPress={() => handleMissionPress(mission.id)}
          />
        ))}

        {hasMissionsMore && (
          <View className="items-center mt-2">
            <Button
              variant="secondary"
              onPress={() => loadMissions(missionsPage + 1, true)}
              loading={missionsLoadingMore}
            >
              Voir plus de missions
            </Button>
          </View>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Association" }} />
        <SkeletonScreen />
      </>
    );
  }

  if (errorType || !association) {
    return (
      <>
        <Stack.Screen options={{ title: "Association" }} />
        <ErrorScreen type={errorType} onRetry={loadAssociation} onBack={handleBack} />
      </>
    );
  }

  const hasAddress = association.address !== null;
  const addressLine = hasAddress
    ? [
        association.address!.street,
        association.address!.postalCode,
        association.address!.city,
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const hasAddressCoordinates =
    association.address?.latitude != null && association.address?.longitude != null;

  return (
    <>
      <Stack.Screen options={{ title: association.name }} />

      <NotificationModal
        visible={notifyModalVisible}
        associationName={association.name}
        onConfirm={() => void handleNotifyConfirm()}
        onCancel={() => setNotifyModalVisible(false)}
      />

      <View className="flex-1 bg-grey-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {/* ──────────────────────────────────────── HERO ── */}
          <View className="px-4 pt-6 pb-6 bg-white border-b border-grey-100">
            <View className="w-full max-w-4xl gap-5 mx-auto">

              {/* Barre supérieure web : bouton retour + bouton notif */}
              {Platform.OS === "web" && (
                <View className="flex-row items-center justify-between">
                  <Button
                    variant="secondary"
                    onPress={handleBack}
                    icon={
                      <ArrowLeftIcon className="w-5 h-5 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    accessibilityLabel="Retour"
                  >
                    Retour
                  </Button>

                  {/* Bouton notification — version texte pour le web */}
                  <Pressable
                    onPress={handleNotifyPress}
                    className={clsx(
                      "flex-row items-center gap-2 px-4 py-2 rounded-xl border web:cursor-pointer web:transition-colors",
                      notified
                        ? "bg-primary border-primary hover:bg-primary-hover"
                        : "bg-white border-grey-200 hover:border-primary",
                    )}
                    accessibilityLabel={
                      notified
                        ? "Se désabonner des notifications"
                        : "Être notifié des nouvelles missions"
                    }
                  >
                    {notified ? (
                      <NotificationSolidIcon className="w-5 h-5 text-white" />
                    ) : (
                      <NotificationLineIcon className="w-5 h-5 text-grey-700" />
                    )}
                    <Text
                      className={clsx(
                        "text-sm font-medium",
                        notified ? "text-white" : "text-grey-700",
                      )}
                    >
                      {notified ? "Notifications activées" : "Me notifier"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Identité : logo + nom + localisation + cloche mobile */}
              <View className="flex-row items-start gap-4">
                {association.logoUrl ? (
                  <Image
                    source={{ uri: association.logoUrl }}
                    style={{ width: 80, height: 80, borderRadius: 16 }}
                    accessibilityLabel={`Logo de ${association.name}`}
                  />
                ) : (
                  <AssociationInitials name={association.name} />
                )}

                <View className="flex-1 gap-1.5">
                  <Text className="text-2xl font-bold leading-tight text-grey-900">
                    {association.name}
                  </Text>
                  {hasAddress && (
                    <View className="flex-row items-center gap-1">
                      <LocalisationIcon className="w-3.5 h-3.5 text-grey-600" />
                      <Text className="text-sm text-grey-700">
                        {association.address!.city}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Cloche mobile — icône seule, alignée à droite */}
                {Platform.OS !== "web" && (
                  <NotifyIconButton notified={notified} onPress={handleNotifyPress} />
                )}
              </View>

              {/* Catégorie — row séparée sous l'identité */}
              {association.category && (
                <View className="flex-row items-center gap-2">
                  <TagBadge
                    label={association.category}
                    variant="blue"
                    size="sm"
                  />
                  {association.legalStatus && (
                    <Text className="text-xs text-grey-600">
                      · {association.legalStatus}
                    </Text>
                  )}
                </View>
              )}

              {/* Stat missions actives */}
              {association.activeMissionsCount > 0 && (
                <View className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-grey-50 self-start">
                  <HandHeartIcon className="w-4 h-4 text-primary" />
                  <Text className="text-sm font-semibold text-primary">
                    {association.activeMissionsCount} mission
                    {association.activeMissionsCount > 1 ? "s" : ""} active
                    {association.activeMissionsCount > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ─────────────────────────────────────── CONTENU ── */}
          <View className="w-full max-w-4xl gap-4 px-4 pt-4 pb-2 mx-auto">

            {/* Description / À propos */}
            {(association.description || association.object) && (
              <View className="gap-4 p-4 bg-white rounded-2xl">
                <SectionLabel label="À propos" />
                {association.description && (
                  <Text className="text-sm leading-6 text-grey-700">
                    {association.description}
                  </Text>
                )}
                {association.object && (
                  <>
                    {association.description && <Divider />}
                    <View className="gap-1">
                      <Text className="text-xs font-semibold text-grey-600">
                        Objet statutaire
                      </Text>
                      <Text className="text-sm leading-6 text-grey-700">
                        {association.object}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Informations pratiques */}
            {(hasAddress || association.phone || association.website || association.legalStatus) && (
              <View className="gap-4 p-4 bg-white rounded-2xl">
                <SectionLabel label="Informations pratiques" />

                {hasAddress && (
                  <View className="gap-3">
                    <MetaRow icon={LocalisationIcon}>
                      <Text className="text-sm font-medium text-grey-900">
                        {addressLine}
                      </Text>
                    </MetaRow>

                    {hasAddressCoordinates && (
                      <View className="pl-11">
                        <MissionMap
                          latitude={association.address!.latitude!}
                          longitude={association.address!.longitude!}
                          address={association.address!.street ?? undefined}
                          city={association.address!.city ?? undefined}
                          height={180}
                        />
                      </View>
                    )}
                  </View>
                )}

                {association.phone && (
                  <>
                    {hasAddress && <Divider />}
                    <MetaRow
                      icon={PhoneIcon}
                      onPress={() => Linking.openURL(`tel:${association.phone}`)}
                    >
                      <Text className="text-sm font-medium text-primary">
                        {association.phone}
                      </Text>
                    </MetaRow>
                  </>
                )}

                {association.website && (
                  <>
                    {(hasAddress || association.phone) && <Divider />}
                    <MetaRow
                      icon={GlobeIcon}
                      onPress={() => Linking.openURL(association.website!)}
                    >
                      <Text
                        className="text-sm font-medium text-primary"
                        numberOfLines={1}
                      >
                        {association.website}
                      </Text>
                    </MetaRow>
                  </>
                )}

                {/* legalStatus est désormais dans la hero — on l'affiche ici aussi
                    uniquement si la catégorie est absente (évite la redondance) */}
                {association.legalStatus && !association.category && (
                  <>
                    {(hasAddress || association.phone || association.website) && (
                      <Divider />
                    )}
                    <View className="gap-1 pl-11">
                      <Text className="text-xs text-grey-600">Forme juridique</Text>
                      <Text className="text-sm text-grey-700">
                        {association.legalStatus}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Missions */}
            <View className="gap-4 p-4 bg-white rounded-2xl">
              <View className="flex-row items-center justify-between">
                <SectionLabel label="Missions de l'association" />
                {missionsTotal > 0 && (
                  <Text className="text-xs text-grey-600">
                    {missionsTotal} au total
                  </Text>
                )}
              </View>

              {missionsContent}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
