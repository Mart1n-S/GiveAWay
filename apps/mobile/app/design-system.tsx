import { useState } from "react";
import { Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { cssInterop } from "nativewind";
import { Button, Input, TextArea } from "@repo/ui";

// --- 1. CONFIGURATION DES ICÔNES ---
import AddIconSource from "../assets/icons/ic_add.svg";
import EmailIconSource from "../assets/icons/ic_email.svg";
import SearchIconSource from "../assets/icons/ic_search.svg";
import LockIconSource from "../assets/icons/ic_lock.svg";
import UnlockIconSource from "../assets/icons/ic_unlock.svg";

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

// --- 2. HELPERS ---
const SectionTitle = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <View className="pb-2 mb-4 border-b border-grey-300">
    <Text className="text-xl font-bold text-grey-800">{title}</Text>
    {description && (
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
      {defaultValue && (
        <Text className="text-[10px] text-grey-500">
          Défaut: {defaultValue}
        </Text>
      )}
    </View>
    <Text className="text-xs text-grey-600 mt-0.5 leading-4">{desc}</Text>
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
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
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
        </View>
      </ScrollView>
    </>
  );
}
