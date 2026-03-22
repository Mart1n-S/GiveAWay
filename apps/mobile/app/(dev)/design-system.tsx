import { useState } from "react";
import { Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { cssInterop } from "nativewind";
import Toast from "react-native-toast-message";
import {
  Button,
  Input,
  TextArea,
  AvatarButton,
  Logo,
  MenuItem,
  colors,
  NavigationMenu,
  WebNavBar,
  TagBadge,
  AvailabilitySlot,
  AvailabilityTypeDot,
  MissionHistoryItem,
} from "@/components/ui";

// --- CONFIGURATION DES ICÔNES ---
import AddIconSource from "../../assets/icons/ic_add.svg";
import EmailIconSource from "../../assets/icons/ic_email.svg";
import SearchIconSource from "../../assets/icons/ic_search.svg";
import LockIconSource from "../../assets/icons/ic_lock.svg";
import UnlockIconSource from "../../assets/icons/ic_unlock.svg";
import UserIconSource from "../../assets/icons/ic_user.svg";
import GiveawayIconSource from "../../assets/icons/ic_giveaway.svg";
import ChevronRightIcon from "../../assets/icons/ic_chevron_right.svg";
import LogoutIconSource from "../../assets/icons/ic_logout.svg";
import SettingsIconSource from "../../assets/icons/ic_settings.svg";
import MenuIconSource from "../../assets/icons/ic_menu.svg";
import CloseIconSource from "../../assets/icons/ic_close.svg";
import CalendarIconSource from "../../assets/icons/ic_calendar.svg";
import MoonIconSource from "../../assets/icons/ic_moon.svg";
import TrashIconSource from "../../assets/icons/ic_trash.svg";

// Helper pour éviter de répéter la config
const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const AddIcon = cssInterop(AddIconSource, iconConfig);
const EmailIcon = cssInterop(EmailIconSource, iconConfig);
const SearchIcon = cssInterop(SearchIconSource, iconConfig);
const LockIcon = cssInterop(LockIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);
const UserIcon = cssInterop(UserIconSource, iconConfig);
const GiveawayIcon = cssInterop(GiveawayIconSource, iconConfig);
const ChevronRight = cssInterop(ChevronRightIcon, iconConfig);
const LogoutIcon = cssInterop(LogoutIconSource, iconConfig);
const SettingsIcon = cssInterop(SettingsIconSource, iconConfig);
const MenuIcon = cssInterop(MenuIconSource, iconConfig);
const CloseIcon = cssInterop(CloseIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const MoonIcon = cssInterop(MoonIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);

// --- HELPERS ---
const SectionTitle = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <View className="pb-2 mb-4 border-b border-grey-100">
    <Text className="text-xl font-bold text-grey-800">{title}</Text>
    {!!description && (
      <Text className="mt-1 text-sm text-grey-600">{description}</Text>
    )}
  </View>
);

const VariantLabel = ({ title }: { title: string }) => (
  <Text className="mt-4 mb-2 text-xs font-bold uppercase text-grey-500">
    {title}
  </Text>
);

const ApiProp = ({
  name,
  type,
  defaultValue,
  desc,
}: {
  name: string;
  type: string;
  defaultValue?: string;
  desc: string;
}) => (
  <View className="mb-3 last:mb-0">
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="font-mono text-sm font-bold text-blue-700">{name}</Text>
      <View className="bg-grey-200 px-1.5 py-0.5 rounded">
        <Text className="text-[10px] font-mono text-grey-700">{type}</Text>
      </View>
      {!!defaultValue && (
        <Text className="text-[10px] text-grey-500">
          Défaut: {defaultValue}
        </Text>
      )}
    </View>
    <Text className="text-xs text-grey-600 mt-0.5 leading-4">{desc}</Text>
  </View>
);

// --- HELPER POUR LES COULEURS ---
const ColorSwatch = ({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor?: string;
}) => (
  <View className="flex-row items-center gap-3 mb-2">
    <View
      style={{ backgroundColor: color }}
      className="border rounded-md shadow-sm w-14 h-14 border-grey-200"
    />
    <View>
      <Text className="text-sm font-bold text-grey-800">{label}</Text>
      <Text className="font-mono text-xs uppercase text-grey-500">{color}</Text>
    </View>
  </View>
);

const PaletteRow = ({
  palette,
  name,
}: {
  palette: Record<string, string>;
  name: string;
}) => (
  <View className="mb-6">
    <Text className="mb-3 text-sm font-bold uppercase text-grey-500">
      {name}
    </Text>
    <View className="flex-row flex-wrap gap-2">
      {Object.entries(palette).map(([key, value]) => {
        // Calcul simple pour le contraste du texte (blanc sur foncé, noir sur clair)
        const isDark =
          Number.parseInt(key) >= 500 ||
          key === "active" ||
          key === "hover" ||
          key === "strong";
        return (
          <View
            key={key}
            style={{ backgroundColor: value }}
            className="items-center justify-center w-16 h-16 mb-2 rounded-lg shadow-sm"
          >
            <Text
              className={`text-[10px] font-bold ${
                isDark ? "text-white" : "text-grey-800"
              }`}
            >
              {key}
            </Text>
            <Text
              className={`text-[8px] uppercase ${
                isDark ? "text-white/80" : "text-grey-600"
              }`}
            >
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
);

export default function DesignSystemScreen() {
  // --- ÉTATS ---
  const [isSimulating, setIsSimulating] = useState(false);

  // États indépendants pour les démos de mot de passe
  const [showPassSimple, setShowPassSimple] = useState(false);
  const [showPassHelper, setShowPassHelper] = useState(false);

  const handleSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 2000);
  };

  return (
    <>
      <Stack.Screen
        options={{ title: "Design System", headerBackTitle: "Retour" }}
      />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-3xl gap-10 px-6 py-8 mx-auto">
          {/* ============================================================
              CHAPITRE 0 : COULEURS & TOKENS 🎨
             ============================================================ */}
          <View>
            <SectionTitle
              title="0. Couleurs & Tokens"
              description="Palette de couleurs unifiée pour l'application."
            />

            <View className="p-6 bg-white border rounded-lg border-grey-200">
              {/* 1. PRIMARY & BRAND */}
              <View className="flex-row flex-wrap gap-8 mb-8">
                <View>
                  <Text className="mb-3 text-sm font-bold uppercase text-grey-500">
                    Brand Primary
                  </Text>
                  <ColorSwatch label="Default" color={colors.primary.default} />
                  <ColorSwatch label="Hover" color={colors.primary.hover} />
                  <ColorSwatch label="Active" color={colors.primary.active} />
                </View>

                <View>
                  <Text className="mb-3 text-sm font-bold uppercase text-grey-500">
                    Neutrals (White)
                  </Text>
                  <ColorSwatch label="Default" color={colors.white.default} />
                  <ColorSwatch label="Hover" color={colors.white.hover} />
                  <ColorSwatch label="Active" color={colors.white.active} />
                </View>

                <View>
                  <Text className="mb-3 text-sm font-bold uppercase text-grey-500">
                    Semantic
                  </Text>
                  <ColorSwatch label="Focus Ring" color={colors.focus} />
                  <ColorSwatch
                    label="Error Strong"
                    color={colors.error.strong}
                  />
                  <ColorSwatch
                    label="Success Strong"
                    color={colors.success.strong}
                  />
                </View>
              </View>

              {/* 2. GREY SCALE */}
              <PaletteRow name="Grey Scale (Neutrals)" palette={colors.grey} />

              <View className="h-px my-6 bg-grey-200" />

              {/* 3. FULL PALETTES */}
              <PaletteRow
                name="Red Palette (Destructive / Error)"
                palette={colors.red}
              />
              <PaletteRow
                name="Green Palette (Success)"
                palette={colors.green}
              />
              <PaletteRow
                name="Blue Palette (Info / Focus)"
                palette={colors.blue}
              />
            </View>
          </View>
        </View>
        <View className="w-full max-w-3xl gap-10 px-6 py-8 mx-auto">
          {/* ============================================================
              CHAPITRE 1 : BUTTONS
              ============================================================ */}
          <View>
            <SectionTitle
              title="1. Boutons"
              description="Composant <Button /> interactif avec gestion des états."
            />

            {/* --- 📚 BLOC DOCUMENTATION API (NOUVEAU) --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>

              <ApiProp
                name="variant"
                type="'primary' | 'secondary' | 'tertiary'"
                defaultValue="'primary'"
                desc="Définit le style visuel du bouton."
              />
              <ApiProp
                name="loading"
                type="boolean"
                defaultValue="false"
                desc="Affiche un spinner et désactive les interactions. Préserve la largeur du bouton."
              />
              <ApiProp
                name="disabled"
                type="boolean"
                defaultValue="false"
                desc="Désactive le bouton (visuel gris + non-cliquable)."
              />
              <ApiProp
                name="icon"
                type="ReactNode"
                desc="Icône SVG à afficher à gauche du texte. S'adapte automatiquement à la couleur du texte."
              />
              <ApiProp
                name="onPress"
                type="() => void"
                desc="Fonction appelée lors du clic (si non disabled/loading)."
              />
              <ApiProp
                name="className"
                type="string"
                desc="Classes Tailwind additionnelles (ex: 'w-full')."
              />
            </View>

            {/* --- VARIANT: PRIMARY --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">
                Variant: Primary
              </Text>
              <Text className="mb-4 text-xs text-grey-600">
                Texte blanc, fond orange. L'icône reste blanche.
              </Text>

              <View className="flex-row flex-wrap items-end gap-4">
                <View>
                  <VariantLabel title="Défaut" />
                  <Button onPress={handleSimulation} loading={isSimulating}>
                    Valider
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Avec Icône" />
                  <Button
                    // PRIMARY : L'icône est toujours blanche
                    icon={<AddIcon className="w-5 h-5 text-white" />}
                    onPress={() => console.log("Primary")}
                  >
                    Ajouter
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Loading" />
                  <Button loading>Valider</Button>
                </View>

                <View>
                  <VariantLabel title="Disabled" />
                  <Button
                    disabled
                    // DISABLED : L'icône devient grise
                    icon={
                      <AddIcon className="w-5 h-5 text-grey-disabledText" />
                    }
                  >
                    Ajouter
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Icon Only" />
                  <Button
                    icon={<AddIcon className="w-6 h-6 text-white" />}
                    aria-label="Ajouter"
                  />
                </View>
              </View>

              <View className="mt-4">
                <VariantLabel title="Full Width" />
                <Button className="w-full">Pleine largeur</Button>
              </View>

              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="⚡️ Démo Interactive (Anti-Layout Shift)" />
                <Text className="mb-2 text-xs text-grey-600">
                  Clique ci-dessous : le bouton passe en loading pendant 2s sans
                  changer de largeur.
                </Text>
                <Button
                  onPress={handleSimulation}
                  loading={isSimulating}
                  icon={<AddIcon className="w-5 h-5 text-white" />}
                >
                  Simuler une action
                </Button>
              </View>
            </View>

            {/* --- VARIANT: SECONDARY --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-800">
                Variant: Secondary
              </Text>
              <Text className="mb-4 text-xs text-grey-600">
                Fond blanc, texte orange. L'icône change de couleur au survol.
              </Text>

              <View className="flex-row flex-wrap items-end gap-4">
                <View>
                  <VariantLabel title="Défaut" />
                  <Button
                    variant="secondary"
                    onPress={handleSimulation}
                    loading={isSimulating}
                  >
                    Annuler
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Avec Icône (Dynamique)" />
                  <Button
                    variant="secondary"
                    icon={
                      <AddIcon className="w-5 h-5 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    onPress={() => console.log("Secondary")}
                  >
                    Modifier
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Loading" />
                  <Button variant="secondary" loading>
                    Annuler
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Disabled" />
                  <Button
                    variant="secondary"
                    disabled
                    icon={
                      <AddIcon className="w-5 h-5 text-grey-disabledText" />
                    }
                  >
                    Modifier
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Icon Only" />
                  <Button
                    variant="secondary"
                    icon={
                      <AddIcon className="w-6 h-6 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                  />
                </View>
              </View>

              <View className="mt-4">
                <VariantLabel title="Full Width" />
                <Button className="w-full" variant="secondary">
                  Pleine largeur
                </Button>
              </View>

              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="⚡️ Démo Interactive (Anti-Layout Shift)" />
                <Text className="mb-2 text-xs text-grey-600">
                  Clique ci-dessous : le bouton passe en loading pendant 2s sans
                  changer de largeur.
                </Text>
                <Button
                  onPress={handleSimulation}
                  loading={isSimulating}
                  variant="secondary"
                  icon={<AddIcon className="w-5 h-5 text-white" />}
                >
                  Simuler une action
                </Button>
              </View>
            </View>

            {/* --- VARIANT: TERTIARY --- */}
            <View className="p-4 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-600">
                Variant: Tertiary
              </Text>
              <Text className="mb-4 text-xs text-grey-600">
                Ghost (Transparent). L'icône change aussi de couleur.
              </Text>

              <View className="flex-row flex-wrap items-end gap-4">
                <View>
                  <VariantLabel title="Défaut" />
                  <Button
                    variant="tertiary"
                    onPress={handleSimulation}
                    loading={isSimulating}
                  >
                    Options
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Avec Icône" />
                  <Button
                    variant="tertiary"
                    icon={
                      <AddIcon className="w-5 h-5 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    onPress={() => console.log("Tertiary")}
                  >
                    Nouveau
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Loading" />
                  <Button variant="tertiary" loading>
                    Annuler
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Disabled" />
                  <Button
                    variant="tertiary"
                    disabled
                    icon={
                      <AddIcon className="w-5 h-5 text-grey-disabledText" />
                    }
                  >
                    Nouveau
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Icon Only" />
                  <Button
                    variant="tertiary"
                    icon={
                      <AddIcon className="w-6 h-6 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                  />
                </View>
              </View>
              <View className="mt-4">
                <VariantLabel title="Full Width" />
                <Button className="w-full" variant="tertiary">
                  Pleine largeur
                </Button>
              </View>

              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="⚡️ Démo Interactive (Anti-Layout Shift)" />
                <Text className="mb-2 text-xs text-grey-600">
                  Clique ci-dessous : le bouton passe en loading pendant 2s sans
                  changer de largeur.
                </Text>
                <Button
                  onPress={handleSimulation}
                  loading={isSimulating}
                  variant="tertiary"
                  icon={<AddIcon className="w-5 h-5 text-white" />}
                >
                  Simuler une action
                </Button>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE BUTTONS */}

          {/* ============================================================
              CHAPITRE 2 : INPUTS
              ============================================================ */}
          <View>
            <SectionTitle
              title="2. Champs de Saisie"
              description="Composant <Input /> complet avec gestion des icônes, helpers et erreurs."
            />

            {/* --- 📚 BLOC DOCUMENTATION API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp name="label" type="string" desc="Libellé du champ." />
              <ApiProp
                name="placeholder"
                type="string"
                desc="Texte indicatif."
              />
              <ApiProp
                name="helperText"
                type="string"
                desc="Texte d'aide gris sous le champ."
              />
              <ApiProp
                name="errorMessage"
                type="string"
                desc="Message rouge. Active la bordure rouge."
              />
              <ApiProp
                name="error"
                type="boolean"
                defaultValue="false"
                desc="Force la bordure rouge sans message."
              />
              <ApiProp
                name="leftIcon"
                type="ReactNode"
                desc="Icône décorative à gauche."
              />
              <ApiProp
                name="rightIcon"
                type="ReactNode"
                desc="Icône interactive à droite."
              />
              <ApiProp
                name="onRightIconPress"
                type="() => void"
                desc="Action au clic sur l'icône droite."
              />
              <ApiProp
                name="secureTextEntry"
                type="boolean"
                desc="Masque le texte (mot de passe)."
              />
              <ApiProp
                name="required"
                type="boolean"
                desc="Indique si le champ est obligatoire."
              />
            </View>

            <View className="gap-8">
              {/* GROUPE 1 : BASIQUES & ICONS GAUCHE */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-grey-800">
                  Basiques & Icônes
                </Text>

                <View>
                  <VariantLabel title="Label + Input" />
                  <Input label="Nom" placeholder="Doe" />
                </View>

                <View>
                  <VariantLabel title="Label + Input + HelperText" />
                  <Input
                    label="Pseudo"
                    placeholder="User123"
                    helperText="Ce nom sera visible sur votre profil."
                  />
                </View>

                <View>
                  <VariantLabel title="Label + Input + Icon Left" />
                  <Input
                    label="Email"
                    placeholder="exemple@mail.com"
                    // Icône non cliquable
                    leftIcon={<EmailIcon className="w-5 h-5 text-grey-700" />}
                    keyboardType="email-address"
                  />
                </View>

                <View>
                  <VariantLabel title="Label + Input + Icon Left + Helper Text" />
                  <Input
                    label="Email professionnel"
                    placeholder="pro@entreprise.com"
                    helperText="Utilisez votre email d'entreprise."
                    leftIcon={<EmailIcon className="w-5 h-5 text-grey-700" />}
                    keyboardType="email-address"
                  />
                </View>

                <View>
                  <VariantLabel title="Input obligatoire" />
                  <Input
                    label="Email"
                    placeholder="exemple@mail.com"
                    leftIcon={<EmailIcon className="w-5 h-5 text-grey-700" />}
                    keyboardType="email-address"
                    required
                  />
                </View>
              </View>

              {/* GROUPE 2 : MOTS DE PASSE (INTERACTIFS) */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-grey-800">
                  Mots de passe (Icon Right)
                </Text>

                <View>
                  <VariantLabel title="Label + Input + Icon Right Cliquable" />
                  <Input
                    label="Mot de passe"
                    placeholder="••••••••"
                    // Logique d'affichage
                    secureTextEntry={!showPassSimple}
                    // L'icône change selon l'état (Lock/Unlock)
                    rightIcon={
                      showPassSimple ? (
                        <UnlockIcon className="w-5 h-5 text-grey-700" />
                      ) : (
                        <LockIcon className="w-5 h-5 text-grey-700" />
                      )
                    }
                    // Action au clic
                    onRightIconPress={() => setShowPassSimple(!showPassSimple)}
                  />
                </View>

                <View>
                  <VariantLabel title="Label + Input + Icon Right + Helper Text" />
                  <Input
                    label="Confirmation"
                    placeholder="••••••••"
                    helperText="Doit contenir au moins 8 caractères."
                    secureTextEntry={!showPassHelper}
                    rightIcon={
                      showPassHelper ? (
                        <UnlockIcon className="w-5 h-5 text-grey-700" />
                      ) : (
                        <LockIcon className="w-5 h-5 text-grey-700" />
                      )
                    }
                    onRightIconPress={() => setShowPassHelper(!showPassHelper)}
                  />
                </View>
              </View>

              {/* GROUPE 3 : ERREURS & VALIDATION */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-error-100">
                  Erreurs & Validation
                </Text>

                <View>
                  <VariantLabel title="Icon Left + Message d'erreur" />
                  <Input
                    label="Email de connexion"
                    defaultValue="jean.dupont"
                    // Message rouge
                    errorMessage="Format d'email invalide."
                    leftIcon={<EmailIcon className="w-5 h-5 text-grey-700" />}
                    keyboardType="email-address"
                  />
                </View>

                <View>
                  <VariantLabel title="Icon Left + Helper + Message d'erreur" />
                  <Input
                    label="Email de récupération"
                    defaultValue="test@"
                    helperText="Nous vous enverrons un lien."
                    errorMessage="Adresse introuvable."
                    leftIcon={<EmailIcon className="w-5 h-5 text-grey-700" />}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* GROUPE 4 : ÉTATS SPÉCIAUX */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-grey-600">
                  États Spéciaux
                </Text>

                <View>
                  <VariantLabel title="Disabled + Helper + Icon Left" />
                  <Input
                    label="Identifiant unique"
                    value="USER-8842-AB"
                    disabled
                    helperText="Contactez le support pour modifier cet ID."
                    // En disabled, on met l'icône en gris désactivé
                    leftIcon={
                      <EmailIcon className="w-5 h-5 text-grey-disabledText" />
                    }
                  />
                </View>

                <View>
                  <VariantLabel title="Sans Label + Icon Left (Search)" />
                  {/* Exemple Barre de recherche */}
                  <Input
                    placeholder="Rechercher un article..."
                    leftIcon={<SearchIcon className="w-5 h-5 text-grey-500" />}
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE INPUTS */}

          {/* ============================================================
              CHAPITRE 3 : TEXTAREA
              ============================================================ */}
          <View>
            <SectionTitle
              title="3. Zones de texte (TextArea)"
              description="Composant <TextArea /> multi-lignes avec redimensionnement automatique (mobile) et compteur de caractères."
            />

            {/* --- 📚 BLOC DOCUMENTATION API (TEXTAREA) --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp name="label" type="string" desc="Libellé du champ." />
              <ApiProp
                name="placeholder"
                type="string"
                desc="Texte indicatif."
              />
              <ApiProp
                name="maxLength"
                type="number"
                desc="Limite le nombre de caractères et affiche un compteur."
              />
              <ApiProp
                name="showCharacterCount"
                type="boolean"
                defaultValue="true"
                desc="Affiche ou masque le compteur '0/200' (si maxLength défini)."
              />
              <ApiProp
                name="helperText"
                type="string"
                desc="Texte d'aide gris sous le champ."
              />
              <ApiProp
                name="errorMessage"
                type="string"
                desc="Message rouge. Active la bordure rouge."
              />
              <ApiProp
                name="disabled"
                type="boolean"
                defaultValue="false"
                desc="Désactive le champ."
              />
            </View>

            <View className="gap-8">
              {/* GROUPE 1 : BASIQUES & COMPTEURS */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-grey-800">
                  Basiques & Compteurs
                </Text>

                <View>
                  <VariantLabel title="Standard (Auto-Grow sur Mobile)" />
                  <TextArea
                    label="Biographie"
                    placeholder="Racontez-nous votre histoire..."
                  />
                </View>

                <View>
                  <VariantLabel title="Avec Limite (Compteur Auto)" />
                  <TextArea
                    label="Message court (Max 2000)"
                    placeholder="Saisissez votre message..."
                    maxLength={2000}
                    helperText="Le compteur s'affiche en haut à droite."
                  />
                </View>

                <View>
                  <VariantLabel title="Limite sans Compteur visuel" />
                  <TextArea
                    label="Tweet (Caché)"
                    placeholder="Le compteur est masqué mais la limite de 280 caractères s'applique."
                    maxLength={280}
                    showCharacterCount={false}
                  />
                </View>
              </View>

              {/* GROUPE 2 : VALIDATION & ERREURS */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-error-100">
                  Validation & Erreurs
                </Text>

                <View>
                  <VariantLabel title="Erreur avec Message" />
                  <TextArea
                    label="Description du problème"
                    defaultValue="Ça marche pas."
                    errorMessage="Veuillez fournir plus de détails (min 10 caractères)."
                    maxLength={500}
                  />
                </View>

                <View>
                  <VariantLabel title="Erreur visuelle + Helper" />
                  <TextArea
                    label="Note interne"
                    placeholder="Ajouter une note..."
                    defaultValue="Ça marche pas !!!!!!!!"
                    error
                    helperText="Merci de détailler rapidement."
                    errorMessage="Veuillez fournir une note plus concise (max 20 caractères)."
                    maxLength={20}
                  />
                </View>
              </View>

              {/* GROUPE 3 : DÉSACTIVÉ */}
              <View className="p-4 bg-white border rounded-lg border-grey-200">
                <Text className="mb-4 text-lg font-bold text-grey-600">
                  État Désactivé
                </Text>

                <View>
                  <VariantLabel title="Lecture Seule" />
                  <TextArea
                    label="Commentaires archivés"
                    value="Ceci est un ancien commentaire qui ne peut plus être modifié par l'utilisateur. Il sert uniquement d'archive pour l'historique du dossier client."
                    disabled
                    helperText="Archivé le 12/10/2023"
                    maxLength={500}
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE TEXTAREA */}

          {/* ============================================================
              CHAPITRE 4 : AVATAR BUTTON
             ============================================================ */}
          <View>
            <SectionTitle
              title="4. Avatar Button"
              description="Bouton avatar pour le header. Gère l'image, les initiales ou le mode invité."
            />

            {/* --- DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="imageUrl"
                type="string | null"
                desc="URL de l'image. Prioritaire sur les initiales."
              />
              <ApiProp
                name="initials"
                type="string | null"
                desc="Initiales (ex: 'JD'). Affichées si pas d'image."
              />
              <ApiProp
                name="isGuest"
                type="boolean"
                defaultValue="false"
                desc="Mode invité. Affiche une icône générique."
              />
              <ApiProp
                name="size"
                type="'sm' | 'md' | 'lg' | 'xl'"
                defaultValue="'md'"
                desc="Taille du cercle."
              />
              <ApiProp
                name="readonly"
                type="boolean"
                defaultValue="false"
                desc="Si true, le composant n'est plus interactif (pas de clic)."
              />
            </View>

            <View className="p-6 bg-white border rounded-lg border-grey-200">
              {/* ÉTATS PRINCIPAUX */}
              <View className="flex-row items-end justify-between mb-8">
                <View className="items-center gap-2">
                  <VariantLabel title="1. Initiales (Défaut)" />
                  <AvatarButton
                    initials="JD"
                    onPress={() => console.log("Avatar Initials")}
                  />
                  <Text className="text-xs text-grey-500">
                    Connecté sans photo
                  </Text>
                </View>

                <View className="items-center gap-2">
                  <VariantLabel title="2. Avec Image" />
                  <AvatarButton
                    imageUrl="https://i.pravatar.cc/150?img=68"
                    initials="JD"
                    onPress={() => console.log("Avatar Image")}
                  />
                  <Text className="text-xs text-grey-500">
                    Connecté avec photo
                  </Text>
                </View>

                <View className="items-center gap-2">
                  <VariantLabel title="3. Mode Invité" />
                  <AvatarButton
                    isGuest
                    guestIcon={<UserIcon className="w-6 h-6 text-grey-900" />}
                    onPress={() => console.log("Avatar Guest")}
                  />
                  <Text className="text-xs text-grey-500">Non connecté</Text>
                </View>
              </View>

              {/* TAILLES */}
              <View className="pt-6 border-t border-grey-100">
                <VariantLabel title="4. Tailles Disponibles" />
                <View className="flex-row items-center gap-6 mt-4">
                  <View className="items-center gap-1">
                    <AvatarButton initials="SM" size="sm" />
                    <Text className="text-[10px] text-grey-400">sm</Text>
                  </View>

                  <View className="items-center gap-1">
                    <AvatarButton initials="MD" size="md" />
                    <Text className="text-[10px] text-grey-400">md</Text>
                  </View>

                  <View className="items-center gap-1">
                    <AvatarButton initials="LG" size="lg" />
                    <Text className="text-[10px] text-grey-400">lg</Text>
                  </View>

                  <View className="items-center gap-1">
                    <AvatarButton initials="XL" size="xl" />
                    <Text className="text-[10px] text-grey-400">xl</Text>
                  </View>
                </View>
              </View>

              {/* READONLY */}
              <View className="pt-6 mt-6 border-t border-grey-100">
                <VariantLabel title="5. Mode Readonly (Non Cliquable)" />
                <Text className="mb-3 text-xs text-grey-500">
                  Pas de curseur main, pas d'effet au clic/focus.
                </Text>
                <View className="flex-row items-center gap-6">
                  <AvatarButton initials="RO" readonly />
                  <AvatarButton
                    imageUrl="https://i.pravatar.cc/150?img=12"
                    readonly
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE AVATAR BUTTON */}

          {/* ============================================================
              CHAPITRE 5 : LOGO
             ============================================================ */}
          <View>
            <SectionTitle
              title="5. Logo"
              description="Identité visuelle de l'application. Responsive et adaptable."
            />

            {/* --- DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="size"
                type="'sm' | 'md' | 'lg' | 'xl'"
                defaultValue="'md'"
                desc="Taille globale (Icône + Texte)."
              />
              <ApiProp
                name="showText"
                type="boolean"
                defaultValue="true"
                desc="Affiche ou masque le texte 'GiveAWay'."
              />
              <ApiProp
                name="icon"
                type="ReactNode"
                desc="L'icône SVG à afficher."
              />
              <ApiProp
                name="textColor"
                type="string"
                defaultValue="'text-grey-900'"
                desc="Classe couleur pour le texte."
              />
            </View>

            <View className="p-6 bg-white border rounded-lg border-grey-200">
              {/* TAILLES */}
              <View>
                <VariantLabel title="1. Tailles Disponibles" />
                <View className="gap-6 mt-4">
                  <View className="flex-row items-center gap-4">
                    <Text className="w-8 text-xs font-bold text-grey-400">
                      SM
                    </Text>
                    <Logo
                      size="sm"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-600" />
                      }
                    />
                  </View>

                  <View className="flex-row items-center gap-4">
                    <Text className="w-8 text-xs font-bold text-grey-400">
                      MD
                    </Text>
                    <Logo
                      size="md"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-600" />
                      }
                    />
                  </View>

                  <View className="flex-row items-center gap-4">
                    <Text className="w-8 text-xs font-bold text-grey-400">
                      LG
                    </Text>
                    <Logo
                      size="lg"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-600" />
                      }
                    />
                  </View>

                  <View className="flex-row items-center gap-4">
                    <Text className="w-8 text-xs font-bold text-grey-400">
                      XL
                    </Text>
                    <Logo
                      size="xl"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-600" />
                      }
                    />
                  </View>
                </View>
              </View>

              {/* VARIANTES */}
              <View className="pt-6 mt-6 border-t border-grey-100">
                <VariantLabel title="2. Variantes d'affichage" />
                <View className="flex-row flex-wrap items-center gap-8 mt-4">
                  {/* Icon Only */}
                  <View className="items-center gap-2">
                    <Logo
                      showText={false}
                      size="lg"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-600" />
                      }
                    />
                    <Text className="text-xs text-grey-500">Icône seule</Text>
                  </View>

                  {/* Custom Color */}
                  <View className="items-center gap-2">
                    <Logo
                      size="md"
                      textColor="text-primary-700"
                      icon={
                        <GiveawayIcon className="w-full h-full text-primary-700" />
                      }
                    />
                    <Text className="text-xs text-grey-500">
                      Tout en couleur
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE LOGO */}

          {/* ============================================================
              CHAPITRE 6 : MENU ITEM 📋
             ============================================================ */}
          <View>
            <SectionTitle
              title="6. Menu Item"
              description="Élément de liste pour la navigation (Drawer, Profil, Burger)."
            />

            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>

              <ApiProp
                name="label"
                type="string"
                desc="Le texte principal du lien."
              />

              <ApiProp
                name="icon"
                type="ReactNode"
                desc="Icône à gauche (ne pas mettre de couleur, juste la taille)."
              />

              <ApiProp
                name="rightIcon"
                type="ReactNode"
                desc="Élément à droite (ex: Chevron, Badge)."
              />

              <ApiProp
                name="isActive"
                type="boolean"
                defaultValue="false"
                desc="Indique la page courante (Style actif)."
              />

              <ApiProp
                name="isDestructive"
                type="boolean"
                defaultValue="false"
                desc="Style rouge (Déconnexion, Supprimer)."
              />

              <ApiProp
                name="disabled"
                type="boolean"
                defaultValue="false"
                desc="Désactive le clic et grise l'élément."
              />
            </View>

            {/* --- DÉMOS --- */}
            <View className="p-6 bg-white border rounded-lg border-grey-200">
              <View className="gap-4">
                <View>
                  <VariantLabel title="1. Standard (Gris -> Orange au survol)" />
                  <MenuItem
                    label="Mon Profil"
                    icon={<UserIcon className="w-5 h-5" />}
                    rightIcon={<ChevronRight className="w-5 h-5" />}
                    onPress={() => console.log("Profil")}
                  />
                </View>

                <View>
                  <VariantLabel title="2. Actif (Couleur Active)" />
                  <MenuItem
                    label="Paramètres"
                    isActive={true}
                    icon={<SearchIcon className="w-5 h-5" />}
                    rightIcon={<ChevronRight className="w-5 h-5" />}
                  />
                </View>

                <View>
                  <VariantLabel title="3. Destructif (Fond Rouge / Texte Blanc)" />
                  <MenuItem
                    label="Se déconnecter"
                    isDestructive
                    icon={<LogoutIcon className="w-5 h-5" />}
                  />
                </View>

                <View>
                  <VariantLabel title="4. Sans Icône Gauche" />
                  <MenuItem
                    label="Mentions légales"
                    rightIcon={<ChevronRight className="w-5 h-5" />}
                  />
                </View>

                {/* --- ÉTAT DISABLED --- */}
                <View>
                  <VariantLabel title="5. Disabled (Désactivé)" />
                  <MenuItem
                    label="Fonctionnalité indisponible"
                    disabled
                    icon={<UnlockIcon className="w-5 h-5" />}
                    rightIcon={<ChevronRight className="w-5 h-5" />}
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE MENU ITEM */}

          {/* ============================================================
              CHAPITRE 7 : NAVIGATION MENU 🍔
             ============================================================ */}
          <View>
            <SectionTitle
              title="7. Navigation Menu"
              description="Le menu complet (utilisé dans le Drawer Mobile et le Burger Web)."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="user"
                type="{ name, email?, avatarUrl? } | null"
                desc="Infos de l'utilisateur connecté. Si null, passe en mode Invité."
              />
              <ApiProp
                name="isGuest"
                type="boolean"
                defaultValue="false"
                desc="Force l'affichage du mode Invité (Boutons Connexion/Inscription)."
              />
              <ApiProp
                name="mainLinks"
                type="MenuLink[]"
                desc="Liste des liens principaux (Haut du menu)."
              />
              <ApiProp
                name="secondaryLinks"
                type="MenuLink[]"
                desc="Liste des liens secondaires (Bas du menu, après séparateur)."
              />
              <ApiProp
                name="onLoginPress"
                type="() => void"
                desc="Callback pour le bouton 'Connexion' (Mode Invité)."
              />
              <ApiProp
                name="onRegisterPress"
                type="() => void"
                desc="Callback pour le bouton 'S'inscrire' (Mode Invité)."
              />
            </View>

            <View className="gap-8">
              {/* DÉMO 1 : UTILISATEUR CONNECTÉ */}
              <View>
                <VariantLabel title="1. Mode Connecté (Exemple)" />
                <Text className="mb-2 text-xs text-grey-500">
                  Simule un menu tiroir. Note : Les liens utilisent 'href' pour
                  le web.
                </Text>

                {/* Conteneur simulant le Drawer */}
                <View className="w-full max-w-sm h-[500px] border border-grey-300 rounded-xl overflow-hidden shadow-sm bg-white">
                  <NavigationMenu
                    user={{
                      name: "John Doe",
                      email: "john.doe@giveaway.com",
                      initials: "JD",
                    }}
                    mainLinks={[
                      {
                        id: "1",
                        label: "Mon Profil",
                        href: "/profil",
                        icon: <UserIcon className="w-5 h-5" />,
                        rightIcon: <ChevronRight className="w-5 h-5" />,
                      },
                      {
                        id: "2",
                        label: "Rechercher un événement",
                        href: "/search",
                        icon: <SearchIcon className="w-5 h-5" />,
                        rightIcon: <ChevronRight className="w-5 h-5" />,
                      },
                      {
                        id: "3",
                        label: "Paramètres",
                        href: "/settings",
                        icon: <SettingsIcon className="w-5 h-5" />,
                      },
                      {
                        id: "4",
                        label: "Se déconnecter",
                        icon: <LockIcon className="w-5 h-5" />,
                        isDestructive: true,
                        onPress: () => console.log("Logout"),
                      },
                    ]}
                    secondaryLinks={[
                      {
                        id: "support",
                        label: "Aide & Support",
                        href: "/support",
                        rightIcon: <ChevronRight className="w-5 h-5" />,
                      },
                      {
                        id: "legal",
                        label: "Mentions légales",
                        href: "/legal",
                      },
                    ]}
                  />
                </View>
              </View>

              {/* DÉMO 2 : MODE INVITÉ */}
              <View>
                <VariantLabel title="2. Mode Invité (Guest)" />
                <Text className="mb-2 text-xs text-grey-500">
                  Affiche les boutons d'appel à l'action en haut.
                </Text>

                {/* Conteneur simulant le Drawer */}
                <View className="w-full max-w-sm h-[450px] border border-grey-300 rounded-xl overflow-hidden shadow-sm bg-white">
                  <NavigationMenu
                    isGuest={true}
                    onLoginPress={() => alert("Naviguer vers Login")}
                    onRegisterPress={() => alert("Naviguer vers Register")}
                    mainLinks={[
                      {
                        id: "1",
                        label: "Explorer les événements",
                        href: "/explore",
                        icon: <SearchIcon className="w-5 h-5" />,
                        rightIcon: <ChevronRight className="w-5 h-5" />,
                      },
                    ]}
                    secondaryLinks={[
                      {
                        id: "legal",
                        label: "Politique de confidentialité",
                        href: "/privacy",
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 7 */}

          {/* ============================================================
              CHAPITRE 8 : WEB NAV BAR 💻
             ============================================================ */}
          <View>
            <SectionTitle
              title="8. Web Navigation Bar"
              description="Barre de navigation principale responsive. (Resize la fenêtre pour tester !)"
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="user"
                type="User | null"
                desc="Infos utilisateur. Si null, affiche les boutons Connexion/Inscription."
              />
              <ApiProp
                name="logoComponent"
                type="ReactNode"
                desc="Le composant <Logo /> configuré."
              />
              <ApiProp
                name="mainLinks"
                type="MenuLink[]"
                desc="Liens affichés au centre. Supporte 'href' pour la navigation Web."
              />
              <ApiProp
                name="menuIcon"
                type="ReactNode"
                desc="Icône du Burger Menu (Mobile)."
              />
              <ApiProp
                name="closeIcon"
                type="ReactNode"
                desc="Icône de fermeture du menu (Mobile)."
              />
            </View>

            {/* --- DÉMOS --- */}
            <View className="gap-8">
              {/* CAS 1 : INVITÉ */}
              <View>
                <VariantLabel title="1. Mode Invité (Guest)" />
                <Text className="mb-2 text-xs text-grey-500">
                  Affiche "Connexion / S'inscrire" à droite. Les liens utilisent
                  'href'.
                </Text>

                {/* Cadre de simulation pour visualiser la barre */}
                <View className="overflow-hidden bg-gray-100 border rounded-lg border-grey-200">
                  <WebNavBar
                    // Pas d'user = Mode Invité
                    logoComponent={
                      <Logo
                        size="md"
                        icon={
                          <GiveawayIcon className="w-full h-full text-primary-default" />
                        }
                      />
                    }
                    menuIcon={
                      <MenuIcon className="w-6 h-6 text-grey-800 group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    closeIcon={
                      <CloseIcon className="w-6 h-6 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    onLoginPress={() => console.log("Login Click")}
                    onRegisterPress={() => console.log("Register Click")}
                    mainLinks={[
                      { id: "1", label: "Accueil", href: "/" },
                      { id: "2", label: "Explorer", href: "/explore" },
                      {
                        id: "3",
                        label: "Comment ça marche ?",
                        href: "/about",
                      },
                    ]}
                  />
                  {/* Faux contenu en dessous pour voir l'ombre/border */}
                  <View className="items-center justify-center h-20 bg-grey-50">
                    <Text className="text-xs text-grey-400">
                      Contenu de la page...
                    </Text>
                  </View>
                </View>
              </View>

              {/* CAS 2 : CONNECTÉ */}
              <View>
                <VariantLabel title="2. Mode Connecté (Logged In)" />
                <Text className="mb-2 text-xs text-grey-500">
                  Affiche l'Avatar et le Nom à droite. Le lien "Dashboard" est
                  actif.
                </Text>

                <View className="overflow-hidden bg-gray-100 border rounded-lg border-grey-200">
                  <WebNavBar
                    user={{
                      name: "Sophie Fonfec",
                      initials: "SF",
                      email: "sophie@test.com",
                    }}
                    logoComponent={
                      <Logo
                        size="md"
                        icon={
                          <GiveawayIcon className="w-full h-full text-primary-default" />
                        }
                      />
                    }
                    menuIcon={
                      <MenuIcon className="w-6 h-6 text-grey-800 group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    closeIcon={
                      <CloseIcon className="w-6 h-6 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                    }
                    onProfilePress={() => console.log("Open Profile")}
                    mainLinks={[
                      {
                        id: "1",
                        label: "Dashboard",
                        href: "/dashboard",
                        isActive: true,
                      },
                      {
                        id: "2",
                        label: "Mes Billets",
                        href: "/tickets",
                      },
                      {
                        id: "3",
                        label: "Favoris",
                        onPress: () => console.log("Favoris (Action JS)"),
                      },
                    ]}
                    secondaryLinks={[
                      {
                        id: "help",
                        label: "Centre d'aide",
                        href: "/help",
                      },
                    ]}
                  />
                  <View className="items-center justify-center h-20 bg-grey-50">
                    <Text className="text-xs text-grey-400">
                      Contenu de la page...
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 8 */}

          {/* ============================================================
              CHAPITRE 9 : NOTIFICATIONS (TOASTS) 🔔
              ============================================================ */}
          <View>
            <SectionTitle
              title="9. Global Notifications"
              description="Système de Toasts impératifs. Design 50/800 pour un contraste maximal."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 Toast Service API
              </Text>
              <ApiProp
                name="type"
                type="'success' | 'error' | 'info' | 'warning'"
                desc="Définit l'ambiance visuelle (Couleurs 50/800)."
              />
              <ApiProp
                name="text1"
                type="string"
                desc="Titre en gras (couleur 800)."
              />
              <ApiProp
                name="text2"
                type="string"
                desc="Message détaillé. Gère le multi-ligne automatiquement."
              />
              <ApiProp
                name="onPress"
                type="() => void"
                desc="Action au clic. Utilisé pour fermer manuellement via Toast.hide()."
              />
              <ApiProp
                name="visibilityTime"
                type="number"
                desc="Délai avant disparition automatique (ms)."
              />
            </View>

            {/* --- DÉMOS : VARIANTES --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">
                Variantes & Couleurs
              </Text>
              <Text className="mb-4 text-xs text-grey-600">
                Cliquez sur les boutons pour tester les différents états.
              </Text>

              <View className="flex-row flex-wrap gap-4">
                {/* SUCCESS */}
                <View>
                  <VariantLabel title="Success" />
                  <Button
                    onPress={() =>
                      Toast.show({
                        type: "success",
                        text1: "Compte activé !",
                        text2: "Votre inscription est maintenant terminée.",
                        onPress: () => Toast.hide(),
                      })
                    }
                    className="text-white bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 active:bg-green-800 active:border-green-800"
                  >
                    Déclencher Succès
                  </Button>
                </View>

                {/* ERROR */}
                <View>
                  <VariantLabel title="Error" />
                  <Button
                    onPress={() =>
                      Toast.show({
                        type: "error",
                        text1: "Échec de validation",
                        text2: "Le code saisi est incorrect ou expiré.",
                        onPress: () => Toast.hide(),
                      })
                    }
                    className="text-white bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800"
                  >
                    Déclencher Erreur
                  </Button>
                </View>

                {/* INFO */}
                <View>
                  <VariantLabel title="Info" />
                  <Button
                    onPress={() =>
                      Toast.show({
                        type: "info",
                        text1: "Mise à jour",
                        text2:
                          "Une nouvelle version de GiveAway est disponible.",
                        onPress: () => Toast.hide(),
                      })
                    }
                    className="text-white bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:bg-blue-800 active:border-blue-800"
                  >
                    Déclencher Info
                  </Button>
                </View>

                {/* WARNING */}
                <View>
                  <VariantLabel title="Warning" />
                  <Button
                    onPress={() =>
                      Toast.show({
                        type: "warning",
                        text1: "Attention",
                        text2:
                          "Veuillez vérifier vos informations avant de valider.",
                        onPress: () => Toast.hide(),
                      })
                    }
                    // Utilise ton orange Primary
                  >
                    Déclencher Warning
                  </Button>
                </View>
              </View>
            </View>

            {/* --- DÉMOS : COMPORTEMENTS --- */}
            <View className="p-4 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-800">
                Tests de Comportement UX
              </Text>

              <View className="gap-4">
                <View>
                  <VariantLabel title="Message Long (Multi-ligne)" />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onPress={() =>
                      Toast.show({
                        type: "info",
                        text1: "Information détaillée",
                        text2:
                          "Ceci est un test pour vérifier que le texte long ne se coupe pas et que le conteneur s'agrandit bien verticalement sur mobile et sur web.",
                        visibilityTime: 8000,
                      })
                    }
                  >
                    Tester le multi-ligne
                  </Button>
                </View>

                <View>
                  <VariantLabel title="Persistance & Fermeture Manuelle" />
                  <Button
                    variant="tertiary"
                    className="w-full"
                    onPress={() =>
                      Toast.show({
                        type: "success",
                        text1: "Toast persistant (10s)",
                        text2:
                          "Cliquez sur l'icône de fermeture ou sur le toast pour masquer.",
                        visibilityTime: 10000,
                        onPress: () => Toast.hide(),
                      })
                    }
                  >
                    Afficher 10 secondes
                  </Button>
                </View>
              </View>

              {/* Rappel Responsive */}
              <View className="p-3 mt-6 border rounded border-grey-100 bg-grey-50">
                <Text className="text-[10px] font-bold text-grey-400 uppercase mb-1">
                  💡 Rappel Responsive
                </Text>
                <Text className="text-xs italic text-grey-500">
                  Sur Web: Top-Right décalé (Desktop) ou Pleine largeur
                  (Mobile-Web).{"\n"}
                  Sur Natif: Centré en haut (iOS/Android).
                </Text>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 9 */}

          {/* ============================================================
            CHAPITRE 10 : TAG BADGE 🏷️
            ============================================================ */}
          <View>
            <SectionTitle
              title="10. Tag Badge"
              description="Badge pill pour afficher les causes, compétences et étiquettes colorées."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="label"
                type="string"
                desc="Texte affiché dans le badge."
              />
              <ApiProp
                name="variant"
                type="'orange' | 'green' | 'blue' | 'red' | 'surface'"
                defaultValue="'surface'"
                desc="Variante de couleur. orange: causes/bénévolat — green: environnement — blue: tech/info — red: urgent — surface: neutre/compétences."
              />
              <ApiProp
                name="size"
                type="'sm' | 'md' | 'lg'"
                defaultValue="'md'"
                desc="Taille du badge — contrôle le padding et la taille du texte."
              />
              <ApiProp
                name="className"
                type="string"
                desc="Classes Tailwind additionnelles pour le positionnement."
              />
            </View>

            {/* --- VARIANTES DE COULEUR --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">
                Variantes de couleur
              </Text>

              <VariantLabel title="Toutes les variantes" />
              <View className="flex-row flex-wrap gap-2">
                <TagBadge label="Solidarité" variant="orange" />
                <TagBadge label="Écologie" variant="green" />
                <TagBadge label="Informatique" variant="blue" />
                <TagBadge label="Urgent" variant="red" />
                <TagBadge label="Logistique" variant="surface" />
              </View>
            </View>

            {/* --- TAILLES --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-800">
                Tailles
              </Text>

              <VariantLabel title="Small" />
              <View className="flex-row flex-wrap gap-2">
                <TagBadge label="Solidarité" variant="orange" size="sm" />
                <TagBadge label="Écologie" variant="green" size="sm" />
                <TagBadge label="Logistique" variant="surface" size="sm" />
              </View>

              <VariantLabel title="Medium (défaut)" />
              <View className="flex-row flex-wrap gap-2">
                <TagBadge label="Solidarité" variant="orange" size="md" />
                <TagBadge label="Écologie" variant="green" size="md" />
                <TagBadge label="Logistique" variant="surface" size="md" />
              </View>

              <VariantLabel title="Large" />
              <View className="flex-row flex-wrap gap-2">
                <TagBadge label="Solidarité" variant="orange" size="lg" />
                <TagBadge label="Écologie" variant="green" size="lg" />
                <TagBadge label="Logistique" variant="surface" size="lg" />
              </View>
            </View>

            {/* --- CAS D'USAGE RÉEL --- */}
            <View className="p-4 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-800">
                💡 Cas d'usage — Profil bénévole
              </Text>
              <Text className="mb-4 text-xs text-grey-500">
                Causes et compétences telles qu'elles apparaissent sur la page
                profil.
              </Text>

              <Text className="mb-2 text-xs font-bold uppercase text-grey-500">
                Causes
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                <TagBadge label="Écologie" variant="green" />
                <TagBadge label="Solidarité" variant="orange" />
                <TagBadge label="Éducation" variant="blue" />
                <TagBadge label="Santé" variant="red" />
              </View>

              <Text className="mb-2 text-xs font-bold uppercase text-grey-500">
                Compétences
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TagBadge label="Informatique" variant="surface" />
                <TagBadge label="Jardinage" variant="surface" />
                <TagBadge label="Logistique" variant="surface" />
                <TagBadge label="Communication" variant="surface" />
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 10 */}
          {/* ============================================================
              CHAPITRE 11 : AVAILABILITY SLOT 📅
              ============================================================ */}
          <View>
            <SectionTitle
              title="11. Availability Slot"
              description="Carte créneau de disponibilité avec état actif/inactif."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="icon"
                type="ReactNode"
                desc="Icône SVG à afficher dans la carte."
              />
              <ApiProp
                name="label"
                type="string"
                desc="Label affiché sous l'icône (ex: Semaine, Weekend, Soirée)."
              />
              <ApiProp
                name="active"
                type="boolean"
                defaultValue="false"
                desc="Si true : icône et texte colorés en primary, bordure orange. Si false : grisé et opacité réduite."
              />
              <ApiProp
                name="className"
                type="string"
                desc="Classes Tailwind additionnelles."
              />
            </View>

            {/* --- ÉTATS --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">États</Text>

              <VariantLabel title="Actif vs Inactif" />
              <View className="flex-row gap-3">
                <AvailabilitySlot
                  icon={<CalendarIcon className="w-6 h-6 text-primary" />}
                  label="Semaine"
                  active
                  className="flex-1"
                />
                <AvailabilitySlot
                  icon={<CalendarIcon className="w-6 h-6 text-grey-700" />}
                  label="Weekend"
                  className="flex-1"
                />
                <AvailabilitySlot
                  icon={<MoonIcon className="w-6 h-6 text-primary" />}
                  label="Soirée"
                  active
                  className="flex-1"
                />
              </View>

              {/* --- CAS D'USAGE RÉEL --- */}
              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="💡 Cas d'usage — Profil bénévole" />
                <Text className="mb-3 text-xs text-grey-500">
                  Grille de disponibilités telle qu'elle apparaît sur la page
                  profil.
                </Text>
                <View className="flex-row gap-3">
                  <AvailabilitySlot
                    icon={<CalendarIcon className="w-6 h-6 text-primary" />}
                    label="Semaine"
                    active
                    className="flex-1"
                  />
                  <AvailabilitySlot
                    icon={<CalendarIcon className="w-6 h-6 text-grey-700" />}
                    label="Weekend"
                    className="flex-1"
                  />
                  <AvailabilitySlot
                    icon={<MoonIcon className="w-6 h-6 text-primary" />}
                    label="Soirée"
                    active
                    className="flex-1"
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 11 */}

          {/* ============================================================
          CHAPITRE 12 : AVAILABILITY TYPE DOT 🟢
          ============================================================ */}
          <View>
            <SectionTitle
              title="12. Availability Type Dot"
              description="Indicateur du type de disponibilité avec point coloré."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp
                name="type"
                type="'REMOTE' | 'ON_SITE' | 'HYBRID'"
                desc="Type de disponibilité. HYBRID affiche automatiquement les deux badges Sur site et À distance."
              />
              <ApiProp
                name="className"
                type="string"
                desc="Classes Tailwind additionnelles."
              />
            </View>

            {/* --- VARIANTES --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">
                Variantes
              </Text>

              <VariantLabel title="À distance (REMOTE)" />
              <AvailabilityTypeDot type="REMOTE" />

              <VariantLabel title="Sur site (ON_SITE)" />
              <AvailabilityTypeDot type="ON_SITE" />

              <VariantLabel title="Hybride (HYBRID) — affiche les deux" />
              <AvailabilityTypeDot type="HYBRID" />

              {/* --- CAS D'USAGE RÉEL --- */}
              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="💡 Cas d'usage — Profil bénévole" />
                <Text className="mb-3 text-xs text-grey-500">
                  Tel qu'affiché dans la section disponibilités du profil.
                </Text>
                <AvailabilityTypeDot type="HYBRID" />
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 12 */}

          {/* ============================================================
              CHAPITRE 13 : MISSION HISTORY ITEM 📋
              ============================================================ */}
          <View>
            <SectionTitle
              title="13. Mission History Item"
              description="Item d'historique pour les participations aux missions."
            />

            {/* --- 📚 DOC API --- */}
            <View className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50/50">
              <Text className="mb-4 text-sm font-bold text-blue-800 uppercase">
                📚 API Reference
              </Text>
              <ApiProp name="title" type="string" desc="Titre de la mission." />
              <ApiProp
                name="associationName"
                type="string"
                desc="Nom de l'association organisatrice."
              />
              <ApiProp
                name="date"
                type="Date | string"
                desc="Date de participation — formatée automatiquement en français."
              />
              <ApiProp
                name="type"
                type="'MISSION' | 'EVENT' | 'COLLECT' | 'INFO'"
                desc="Type de mission — détermine la couleur et l'icône de l'item."
              />
              <ApiProp
                name="onPress"
                type="() => void"
                desc="Callback au clic. Si absent, le chevron est masqué et l'item est non cliquable."
              />
              <ApiProp
                name="className"
                type="string"
                desc="Classes Tailwind additionnelles."
              />
            </View>

            {/* --- VARIANTES PAR TYPE --- */}
            <View className="p-4 mb-6 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-primary">
                Types de mission
              </Text>

              <VariantLabel title="Tous les types" />
              <View className="gap-3">
                <MissionHistoryItem
                  title="Nettoyage des berges"
                  associationName="Green Rhône"
                  date="2024-10-12"
                  type="MISSION"
                  onPress={() => {}}
                />
                <MissionHistoryItem
                  title="Soirée de sensibilisation"
                  associationName="Solidarité Lyon"
                  date="2024-09-28"
                  type="EVENT"
                  onPress={() => {}}
                />
                <MissionHistoryItem
                  title="Collecte de vêtements"
                  associationName="Entraide 69"
                  date="2024-09-15"
                  type="COLLECT"
                  onPress={() => {}}
                />
                <MissionHistoryItem
                  title="Newsletter mensuelle"
                  associationName="Asso Info"
                  date="2024-08-01"
                  type="INFO"
                  onPress={() => {}}
                />
              </View>
            </View>

            {/* --- ÉTATS --- */}
            <View className="p-4 bg-white border rounded-lg border-grey-200">
              <Text className="mb-2 text-lg font-bold text-grey-800">
                États
              </Text>

              <VariantLabel title="Cliquable (avec chevron)" />
              <MissionHistoryItem
                title="Aide aux devoirs"
                associationName="Savoir Partagé"
                date="2024-09-28"
                type="MISSION"
                onPress={() => {}}
              />

              <VariantLabel title="Non cliquable (sans chevron)" />
              <MissionHistoryItem
                title="Aide aux devoirs"
                associationName="Savoir Partagé"
                date="2024-09-28"
                type="MISSION"
              />

              {/* CAS D'USAGE RÉEL */}
              <View className="pt-4 mt-6 border-t border-grey-200">
                <VariantLabel title="💡 Cas d'usage — Historique profil" />
                <Text className="mb-3 text-xs text-grey-500">
                  Les 5 dernières participations telles qu'elles apparaissent
                  sur la page profil.
                </Text>
                <View className="gap-3">
                  <MissionHistoryItem
                    title="Nettoyage des berges"
                    associationName="Green Rhône"
                    date="2024-10-12"
                    type="MISSION"
                    onPress={() => {}}
                  />
                  <MissionHistoryItem
                    title="Aide aux devoirs"
                    associationName="Savoir Partagé"
                    date="2024-09-28"
                    type="EVENT"
                    onPress={() => {}}
                  />
                </View>
              </View>
            </View>
          </View>
          {/* FIN CHAPITRE 13 */}
        </View>
      </ScrollView>
    </>
  );
}
