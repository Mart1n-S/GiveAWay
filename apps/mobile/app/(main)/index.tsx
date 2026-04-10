import { View, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { Text, Button } from "@/components/ui";
import Map from "@/components/ui/map";

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

// --- Données des étapes ---

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

// --- Composant card étape ---

function StepCard({ step }: { step: Step }) {
  const { number, title, description, Icon, bgClass, iconClass } = step;
  return (
    <View className="flex-1 bg-white rounded-2xl border border-grey-200 p-6">
      {/* Numéro + icône */}
      <View className="flex-row items-center gap-3 mb-4">
        <View
          className={`w-12 h-12 rounded-xl items-center justify-center ${bgClass}`}
        >
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </View>
        <Text className="text-3xl font-bold text-grey-200">{number}</Text>
      </View>

      {/* Texte */}
      <Text className="text-base font-bold text-grey-900 mb-2">{title}</Text>
      <Text className="text-sm leading-6 text-grey-600">{description}</Text>
    </View>
  );
}

// --- Composant valeur ---

function ValuePill({
  icon: Icon,
  label,
}: {
  icon: StepIcon;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 bg-white border border-grey-200 rounded-full px-4 py-2">
      <Icon className="w-4 h-4 text-primary" />
      <Text className="text-sm font-semibold text-grey-800">{label}</Text>
    </View>
  );
}

// --- Page principale ---

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white">
      {/* ================================================================ */}
      {/* HERO                                                              */}
      {/* ================================================================ */}
      <View className="w-full max-w-5xl mx-auto px-4 pt-10 pb-8 md:px-8 md:pt-16 md:pb-12 items-center">
        {/* Pill tag */}
        <View className="bg-white border border-grey-200 rounded-full px-4 py-1.5 mb-5">
          <Text className="text-xs font-semibold text-primary uppercase tracking-widest">
            Bénévolat simplifié
          </Text>
        </View>

        <Text className="text-4xl font-bold text-grey-900 text-center mb-4 leading-tight">
          Trouvez des missions qui{"\n"}
          <Text className="text-primary">vous ressemblent</Text>
        </Text>

        <Text className="text-base text-grey-600 text-center max-w-xl mb-8 leading-7">
          GiveAWay connecte bénévoles et associations grâce à un matching
          intelligent. Géolocalisation, compétences, disponibilités — chaque
          mission est faite pour vous.
        </Text>

        {/* CTA */}
        <View className="flex-row flex-wrap gap-3 justify-center">
          <Button variant="primary" onPress={() => router.push("/inscription")}>
            Commencer gratuitement
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push("/missions")}
          >
            Voir les missions
          </Button>
        </View>
      </View>

      {/* ================================================================ */}
      {/* CARTE                                                             */}
      {/* ================================================================ */}
      <View className="px-4 md:px-8 pb-10">
        <View className="w-full max-w-5xl mx-auto">
          {/* Titre section carte */}
          <View className="mb-4">
            <Text className="text-xl font-bold text-grey-900">
              Missions près de chez vous
            </Text>
            <Text className="text-sm text-grey-500 mt-1">
              Cliquez sur un marqueur pour découvrir la mission
            </Text>
          </View>

          {/* Carte avec filtres intégrés au-dessus */}
          <View
            className="rounded-2xl overflow-hidden border border-grey-200"
            style={{ height: 520 }}
          >
            <Map />
          </View>
        </View>
      </View>

      {/* ================================================================ */}
      {/* COMMENT ÇA MARCHE                                                */}
      {/* ================================================================ */}
      <View className="bg-grey-50">
        <View className="w-full max-w-5xl mx-auto px-4 py-14 md:px-8 md:py-20">
          {/* En-tête section */}
          <View className="items-center mb-12">
            <Text className="text-3xl font-bold text-grey-900 text-center mb-3">
              Comment ça marche ?
            </Text>
            <Text className="text-base text-grey-600 text-center max-w-lg leading-7">
              En quelques étapes, devenez acteur du changement dans votre
              communauté.
            </Text>
          </View>

          {/* Cartes étapes — colonne sur mobile, 3 colonnes sur desktop */}
          <View className="flex-col md:flex-row gap-4 md:gap-6 mb-12">
            {HOW_IT_WORKS.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </View>

          {/* CTA centré */}
          <View className="items-center">
            <Button
              variant="primary"
              onPress={() => router.push("/inscription")}
            >
              Rejoindre GiveAWay gratuitement
            </Button>
          </View>
        </View>
      </View>

      {/* ================================================================ */}
      {/* POURQUOI GIVEAWAY                                                */}
      {/* ================================================================ */}
      <View className="w-full max-w-5xl mx-auto px-4 py-14 md:px-8 md:py-20">
        {/* En-tête */}
        <View className="flex-col md:flex-row md:items-center md:gap-16">
          <View className="flex-1 mb-10 md:mb-0">
            <Text className="text-3xl font-bold text-grey-900 mb-4 leading-tight">
              Le bénévolat,{"\n"}
              <Text className="text-primary">réinventé</Text>
            </Text>
            <Text className="text-base text-grey-600 leading-7 mb-6">
              Les associations peinent à trouver des bénévoles. Les bénévoles
              peinent à trouver des missions. GiveAWay résout les deux
              problèmes à la fois grâce à un algorithme de matching qui
              rapproche les bonnes personnes des bonnes causes.
            </Text>

            {/* Valeurs */}
            <View className="flex-row flex-wrap gap-2">
              <ValuePill icon={ShieldIcon} label="100 % gratuit" />
              <ValuePill icon={HandHeartIcon} label="Impact réel" />
              <ValuePill icon={LocalisationIcon} label="Près de chez vous" />
            </View>
          </View>

          {/* Bloc chiffres */}
          <View className="flex-col gap-4 md:w-64">
            <StatCard value="29" label="causes soutenues" />
            <StatCard value="16" label="types de compétences" />
            <StatCard value="9" label="catégories d'associations" />
          </View>
        </View>
      </View>

      {/* ================================================================ */}
      {/* FOOTER CTA                                                        */}
      {/* ================================================================ */}
      <View className="bg-primary">
        <View className="w-full max-w-5xl mx-auto px-4 py-14 md:px-8 md:py-16 items-center">
          <Text className="text-3xl font-bold text-white text-center mb-3">
            Prêt à faire la différence ?
          </Text>
          <Text className="text-base text-white text-center mb-8 opacity-90 max-w-md leading-7">
            Rejoignez des milliers de bénévoles qui agissent chaque jour pour
            un monde meilleur.
          </Text>
          <View className="flex-row flex-wrap gap-3 justify-center">
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

// --- Composant stat ---

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="bg-grey-50 border border-grey-200 rounded-2xl px-6 py-5">
      <Text className="text-4xl font-bold text-primary mb-1">{value}</Text>
      <Text className="text-sm text-grey-600">{label}</Text>
    </View>
  );
}
