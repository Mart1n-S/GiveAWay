import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import clsx from "clsx";
import { Stack, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import {
  RegisterAssociationSchema,
  VerifyEmailSchema,
  VerifyEmailDto,
  ResendVerificationDto,
  RNA_REGEX,
  SIRET_REGEX,
} from "@repo/shared";
import { z } from "zod";
import { FormInput, FormTextarea } from "@/components/form/";
import {
  Button,
  AvatarButton,
  AddressAutocomplete,
  PasswordCriteria,
  TermsCheckbox,
  colors,
} from "@/components/ui";
import { AddressResult } from "@/components/ui/form-tools/useAddress";
import {
  MultipleDocumentsPicker,
  ReactNativeFile,
} from "@/components/multiple-documents-picker/multiple-documents-picker";
import { AuthService } from "@/services/auth.service";
import { cssInterop } from "nativewind";
import AddIconSource from "@assets/icons/ic_add.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import EmailIconSource from "@assets/icons/ic_email.svg";
import LockIconSource from "@assets/icons/ic_lock.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import { isAxiosError } from "axios";
import { usePageTitle } from "@/hooks/usePageTitle";

const CameraPlaceholder = () => <Text className="text-4xl">🏢</Text>;
const AvatarPlaceholder = () => <Text className="text-4xl">📷</Text>;

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const AddIcon = cssInterop(AddIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const EmailIcon = cssInterop(EmailIconSource, iconConfig);
const LockIcon = cssInterop(LockIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);

const LEGAL_STATUSES = ["Loi 1901", "Loi 1908 Alsace-Moselle"] as const;

type FormValues = z.input<typeof RegisterAssociationSchema>;
type VerifyFormInput = z.input<typeof VerifyEmailSchema>;
type Step = "REGISTER" | "VERIFY";

export default function RegisterAssociationScreen() {
  usePageTitle("Inscription association");
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("REGISTER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<ReactNativeFile | null>(null);
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [logoFile, setLogoFile] = useState<ReactNativeFile | null>(null);
  const [documents, setDocuments] = useState<ReactNativeFile[]>([]);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(RegisterAssociationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      age: "",
      name: "",
      rna: "",
      siret: "",
      phone: "",
      website: "",
      description: "",
      object: "",
      legalStatus: "",
      biography: "",
      address: undefined,
      userAddress: undefined,
    },
  });

  const {
    control: controlVerify,
    handleSubmit: handleSubmitVerify,
    setError: setErrorVerify,
  } = useForm<VerifyFormInput>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: { code: "" },
  });

  const passwordValue = watch("password");
  const acceptTerms = watch("acceptTerms");
  const rnaValue = watch("rna");
  const siretValue = watch("siret");

  // Re-validation temps réel RNA/SIRET :
  // Dès que l'un des deux champs est valide, on re-valide les deux via Zod.
  // → Zod efface l'erreur croisée automatiquement si au moins un est renseigné.
  // → Zod conserve l'erreur de format sur l'autre champ s'il est mal rempli.
  useEffect(() => {
    const rnaValid = typeof rnaValue === "string" && RNA_REGEX.test(rnaValue);
    const siretValid =
      typeof siretValue === "string" && SIRET_REGEX.test(siretValue);
    if (rnaValid || siretValid) {
      trigger(["rna", "siret"]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rnaValue, siretValue]);

  useEffect(() => {
    const subscription = watch(() => {
      if (errors.root) clearErrors("root");
    });
    return () => subscription.unsubscribe();
  }, [watch, errors.root, clearErrors]);

  const scrollToTop = () =>
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

  // ------------------------------------------------------------------
  // Helpers image
  // ------------------------------------------------------------------
  const ACCEPTED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

  const handleWebImageFile = (
    file: File,
    onSet: (uri: string, rn: ReactNativeFile) => void,
    toastMsg: string,
  ) => {
    if (!ACCEPTED_IMAGE_MIME.has(file.type)) {
      Toast.show({
        type: "error",
        text1: "Fichier non supporté",
        text2: toastMsg,
        visibilityTime: 8000,
        onPress: () => Toast.hide(),
      });
      return;
    }
    const uri = URL.createObjectURL(file);
    onSet(uri, { uri, name: file.name, type: file.type, webFile: file });
  };

  // ------------------------------------------------------------------
  // Avatar owner
  // ------------------------------------------------------------------
  const pickAvatar = async () => {
    if (Platform.OS === "web") {
      avatarInputRef.current?.click();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name =
          asset.fileName ??
          `avatar-${Date.now()}.${(asset.mimeType ?? "image/jpeg").split("/")[1] ?? "jpg"}`;
        setAvatarUri(asset.uri);
        setAvatarFile({ uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" });
      }
    } catch (e: unknown) {
      console.warn("[pickAvatar] Erreur:", e);
    }
  };

  const removeAvatar = () => {
    setAvatarUri(undefined);
    setAvatarFile(null);
  };

  // ------------------------------------------------------------------
  // Logo
  // ------------------------------------------------------------------
  const pickLogo = async () => {
    if (Platform.OS === "web") {
      logoInputRef.current?.click();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name =
          asset.fileName ??
          `logo-${Date.now()}.${(asset.mimeType ?? "image/jpeg").split("/")[1] ?? "jpg"}`;
        setLogoUri(asset.uri);
        setLogoFile({ uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" });
      }
    } catch (e: unknown) {
      console.warn("[pickLogo] Erreur:", e);
    }
  };

  const removeLogo = () => {
    setLogoUri(undefined);
    setLogoFile(null);
  };

  // ------------------------------------------------------------------
  // Resend (step 2)
  // ------------------------------------------------------------------
  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const payload: ResendVerificationDto = { email: registeredEmail };
      await AuthService.resendVerificationEmail(payload);
      setResendTimer(60);
      Toast.show({
        type: "success",
        text1: "Code renvoyé",
        text2: "Un nouveau code a été envoyé à votre adresse email.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? (error.response?.data?.message as string | undefined) ?? "Erreur lors du renvoi."
        : "Erreur lors du renvoi.";
      Toast.show({
        type: "error",
        text1: "Action impossible",
        text2: msg,
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsResending(false);
    }
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const onRegisterSubmit = async (data: FormValues) => {
    // --- Validation locale du statut juridique (enum restreint à l'UI) ---
    if (
      !data.legalStatus ||
      !LEGAL_STATUSES.includes(
        data.legalStatus as (typeof LEGAL_STATUSES)[number],
      )
    ) {
      setError("legalStatus", {
        type: "manual",
        message: "Le statut juridique est obligatoire",
      });
      scrollToTop();
      return;
    }

    setIsSubmitting(true);
    setError("root", { message: undefined });

    try {
      const response = await AuthService.registerAssociation(
        data,
        logoFile,
        documents,
        avatarFile,
      );

      setRegisteredEmail(data.email);

      Toast.show({
        type: "info",
        text1: response.requiresManualReview
          ? "Inscription enregistrée"
          : "Inscription réussie",
        text2: response.requiresManualReview
          ? "Votre inscription est bien enregistrée. Un email de vérification vous a été envoyé. Votre association nécessite également une vérification manuelle par notre équipe — vous pourrez accéder aux services GiveAWay en attendant, mais la gestion de votre association sera disponible après validation."
          : `Un code de vérification a été envoyé à ${data.email}`,
        visibilityTime: response.requiresManualReview ? 15000 : 10000,
        onPress: () => Toast.hide(),
      });
      setStep("VERIFY");
      scrollToTop();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const apiError = error.response.data;
        const status = error.response.status;

        setError("root", {
          message: "Une erreur est survenue. Veuillez vérifier votre saisie.",
        });
        scrollToTop();

        // 422 : erreur image/logo ou documents
        if (status === 422) {
          const msg = apiError?.message || "Fichier invalide.";
          Toast.show({
            type: "error",
            text1: "Fichier invalide",
            text2: Array.isArray(msg) ? msg[0] : msg,
            visibilityTime: 10000,
            onPress: () => Toast.hide(),
          });
          return;
        }

        // 400 : erreurs Zod détaillées
        if (status === 400 && apiError?.errors?.properties) {
          const properties = apiError.errors.properties;
          let hasMappedError = false;
          Object.keys(properties).forEach((field) => {
            const errorMsg = properties[field]?.errors?.[0];
            if (errorMsg) {
              setError(field as keyof FormValues, {
                type: "server",
                message: errorMsg,
              });
              hasMappedError = true;
            }
          });
          if (hasMappedError) return;
        }

        const errorMessage = apiError?.message || "Une erreur est survenue.";

        // 409 / email pris
        if (
          status === 409 ||
          (typeof errorMessage === "string" &&
            errorMessage.toLowerCase().includes("email"))
        ) {
          setError("email", {
            type: "manual",
            message: "Cet email est déjà utilisé.",
          });
          return;
        }

        // 400 avec rejectionReason (association dissoute / inactive)
        if (
          status === 400 &&
          typeof errorMessage === "string" &&
          (errorMessage.toLowerCase().includes("dissou") ||
            errorMessage.toLowerCase().includes("inactive") ||
            errorMessage.toLowerCase().includes("association"))
        ) {
          setError("root", { message: errorMessage });
          Toast.show({
            type: "error",
            text1: "Association non valide",
            text2: errorMessage,
            visibilityTime: 12000,
            onPress: () => Toast.hide(),
          });
          return;
        }

        const displayMessage = Array.isArray(errorMessage)
          ? errorMessage[0]
          : errorMessage;
        Toast.show({
          type: "error",
          text1: "Erreur d'inscription",
          text2: displayMessage,
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      } else {
        setError("root", {
          message:
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
        });
        scrollToTop();
        Toast.show({
          type: "error",
          text1: "Erreur réseau",
          text2:
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifySubmit = async (data: VerifyFormInput) => {
    setIsSubmitting(true);
    try {
      const validData = data as unknown as VerifyEmailDto;
      await AuthService.verifyEmail(validData);
      Toast.show({
        type: "success",
        text1: "Compte activé !",
        text2: "Votre compte a été activé avec succès !",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      router.replace("/connexion");
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const apiError = error.response.data as { message?: string };
        if (status === 401 || status === 400) {
          setErrorVerify("code", {
            type: "server",
            message: apiError.message || "Code invalide.",
          });
          return;
        }
      }
      Toast.show({
        type: "error",
        text1: "Vérification échouée",
        text2: "Une erreur est survenue lors de la vérification du code.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: step === "REGISTER" ? "Association" : "Vérification",
          headerBackTitle: "Retour",
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-2xl gap-4 px-4">
          {step === "REGISTER" && (
            <>
              {errors.root?.message && (
                <View className="p-3 mb-4 border border-red-200 rounded-md bg-red-50">
                  <Text className="text-sm font-medium text-center text-red-600">
                    {errors.root.message}
                  </Text>
                </View>
              )}

              {/* ============================================= */}
              {/* SECTION 1 — COMPTE OWNER                      */}
              {/* ============================================= */}
              <Text className="mt-2 text-lg font-bold text-grey-900">
                Votre compte (responsable de l&apos;association)
              </Text>

              {/* --- AVATAR OWNER (même style que l'inscription bénévole) --- */}
              <View className="items-center mb-4">
                <View className="relative">
                  <AvatarButton
                    size="xl"
                    onPress={pickAvatar}
                    imageUrl={avatarUri}
                    isGuest={!avatarUri}
                    guestIcon={<AvatarPlaceholder />}
                    accessibilityLabel={
                      avatarUri ? "Modifier la photo" : "Ajouter une photo"
                    }
                    className="bg-grey-100 border-grey-200"
                  />
                  {avatarUri ? (
                    <Button
                      onPress={removeAvatar}
                      variant="primary"
                      icon={<TrashIcon className="w-3 h-3 text-white" />}
                      className="!absolute !bottom-0 !right-0 !w-6 !h-6 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Supprimer la photo"
                    />
                  ) : (
                    <View className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 border-2 border-white rounded-full pointer-events-none bg-primary">
                      <AddIcon className="w-4 h-4 text-white" />
                    </View>
                  )}
                </View>
                <Text className="mt-2 text-sm text-grey-500">
                  {avatarUri
                    ? "Modifier la photo"
                    : "Ajouter une photo (optionnel)"}
                </Text>
              </View>

              <View className="flex-col gap-4 md:flex-row">
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="firstName"
                    label="Prénom"
                    testID="input-firstName"
                    required
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="lastName"
                    label="Nom"
                    testID="input-lastName"
                    required
                  />
                </View>
              </View>

              <FormInput
                control={control}
                name="email"
                label="Email"
                testID="input-email"
                helperText="Format : contact@association.fr"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <EmailIcon width={20} height={20} color={colors.grey[600]} />
                }
                required
              />

              <FormInput
                control={control}
                name="age"
                label="Votre âge"
                testID="input-age"
                keyboardType="numeric"
                required
              />

              <View className="gap-4 mt-2">
                <FormInput
                  control={control}
                  name="password"
                  label="Mot de passe"
                  testID="input-password"
                  secureTextEntry={!showPassword}
                  rightIcon={
                    showPassword ? (
                      <UnlockIcon
                        width={20}
                        height={20}
                        color={colors.primary.default}
                      />
                    ) : (
                      <LockIcon
                        width={20}
                        height={20}
                        color={colors.grey[600]}
                      />
                    )
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  required
                />
                <PasswordCriteria password={passwordValue} />
                <FormInput
                  control={control}
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  testID="input-confirmPassword"
                  secureTextEntry={!showPassword}
                  rightIcon={
                    showPassword ? (
                      <UnlockIcon
                        width={20}
                        height={20}
                        color={colors.primary.default}
                      />
                    ) : (
                      <LockIcon
                        width={20}
                        height={20}
                        color={colors.grey[600]}
                      />
                    )
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  required
                />
              </View>

              {/* --- ADRESSE DU OWNER (obligatoire) --- */}
              <View className="flex-row gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
                <View className="flex-1 gap-1">
                  <Text className="flex-1 text-sm text-blue-900">
                    Vous devez renseigner{" "}
                    <Text className="font-bold">votre adresse personnelle</Text>
                  </Text>
                </View>
              </View>

              <Controller
                control={control}
                name="userAddress"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <AddressAutocomplete
                    label="Votre adresse personnelle"
                    value={value as unknown as AddressResult}
                    onSelect={(result) => {
                      if (result) {
                        onChange({
                          street: result.street,
                          postalCode: result.postcode,
                          city: result.city,
                          latitude: result.latitude,
                          longitude: result.longitude,
                        });
                      } else {
                        onChange(undefined);
                      }
                    }}
                    error={error}
                    required
                    testIDPrefix="user"
                  />
                )}
              />

              {/* --- BIOGRAPHIE (optionnelle) --- */}
              <FormTextarea
                control={control}
                name="biography"
                label="Biographie (Optionnel)"
                placeholder="Dites-nous en plus sur vous..."
                maxLength={1000}
                showCharacterCount={true}
              />

              {/* ============================================= */}
              {/* SECTION 2 — ASSOCIATION                        */}
              {/* ============================================= */}
              <Text className="mt-6 text-lg font-bold text-grey-900">
                Informations de l&apos;association
              </Text>

              {/* --- LOGO DE L'ASSOCIATION (même style que l'avatar) --- */}
              <View className="items-center mb-4">
                <View className="relative">
                  <AvatarButton
                    size="xl"
                    onPress={pickLogo}
                    imageUrl={logoUri}
                    isGuest={!logoUri}
                    guestIcon={<CameraPlaceholder />}
                    accessibilityLabel={
                      logoUri ? "Modifier le logo" : "Ajouter un logo"
                    }
                    className="bg-grey-100 border-grey-200"
                  />
                  {logoUri ? (
                    <Button
                      onPress={removeLogo}
                      variant="primary"
                      icon={<TrashIcon className="w-3 h-3 text-white" />}
                      className="!absolute !bottom-0 !right-0 !w-6 !h-6 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Supprimer le logo"
                    />
                  ) : (
                    <View className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 border-2 border-white rounded-full pointer-events-none bg-primary">
                      <AddIcon className="w-4 h-4 text-white" />
                    </View>
                  )}
                </View>
                <Text className="mt-2 text-sm text-grey-500">
                  {logoUri
                    ? "Modifier le logo"
                    : "Logo de l'association (optionnel)"}
                </Text>
              </View>

              <FormInput
                control={control}
                name="name"
                label="Nom de l'association"
                testID="input-name"
                required
              />

              {/* --- INFO RNA / SIRET --- */}
              <View className="flex-row gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
                <Text className="flex-1 text-sm text-blue-900">
                  Vous devez renseigner{" "}
                  <Text className="font-bold">au moins l&apos;un</Text> des deux
                  identifiants ci-dessous :{"\n"}• Le{" "}
                  <Text className="font-bold">RNA</Text> (Répertoire National
                  des Associations), attribué à la déclaration en préfecture.
                  {"\n"}• Le <Text className="font-bold">SIRET</Text>, attribué
                  par l&apos;INSEE.
                </Text>
              </View>

              <FormInput
                control={control}
                name="rna"
                label="Numéro RNA"
                testID="input-rna"
                helperText="Le RNA (Répertoire National des Associations) est attribué lors de la déclaration en préfecture. Format : W suivi de 9 chiffres (ex. W123456789)."
                autoCapitalize="characters"
                maxLength={10}
              />

              <FormInput
                control={control}
                name="siret"
                label="Numéro SIRET"
                testID="input-siret"
                helperText="Le SIRET identifie votre association auprès de l'INSEE. Format : 14 chiffres sans espaces. Au moins l'un des deux (RNA ou SIRET) doit être renseigné."
                keyboardType="numeric"
                maxLength={14}
              />

              <FormTextarea
                control={control}
                name="object"
                label="Objet de l'association *"
                placeholder="Décrivez l'objet statutaire de l'association (tel qu'il figure dans vos statuts)..."
                helperText="Exemple : « Promouvoir le bénévolat auprès des jeunes en Île-de-France. »"
                maxLength={500}
                showCharacterCount={true}
              />

              {/* --- STATUT JURIDIQUE --- */}
              <View>
                <Text className="mb-2 text-base font-medium text-grey-900">
                  Statut juridique <Text className="text-red-600">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="legalStatus"
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <View className="flex-col gap-2 md:flex-row">
                        {LEGAL_STATUSES.map((status) => {
                          const selected = value === status;
                          return (
                            <Button
                              key={status}
                              testID={`btn-legal-status-${status === "Loi 1901" ? "1901" : "1908"}`}
                              variant={selected ? "primary" : "secondary"}
                              onPress={() => {
                                onChange(status);
                                trigger("legalStatus");
                              }}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                              className="flex-1"
                            >
                              {status}
                            </Button>
                          );
                        })}
                      </View>
                      {error && (
                        <Text className="mt-2 text-sm text-error-100">
                          {error.message as string}
                        </Text>
                      )}
                    </>
                  )}
                />
              </View>

              <View className="flex-row gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
                <View className="flex-1 gap-1">
                  <Text className="flex-1 text-sm text-blue-900">
                    Vous devez renseigner l&apos;adresse de l&apos;association{" "}
                    <Text className="font-bold">
                      comme indiquée dans le Procès-Verbal de l&apos;Assemblée Générale ou la déclaration en préfecture
                    </Text>
                  </Text>
                </View>
              </View>

              {/* --- ADRESSE DU SIÈGE --- */}
              <Controller
                control={control}
                name="address"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <AddressAutocomplete
                    label="Adresse du siège de l'association"
                    value={value as unknown as AddressResult}
                    onSelect={(result) => {
                      if (result) {
                        onChange({
                          street: result.street,
                          postalCode: result.postcode,
                          city: result.city,
                          latitude: result.latitude,
                          longitude: result.longitude,
                        });
                      } else {
                        onChange(undefined);
                      }
                    }}
                    error={error}
                    required
                    testIDPrefix="assoc"
                  />
                )}
              />

              <FormInput
                control={control}
                name="phone"
                label="Téléphone (optionnel)"
                testID="input-phone"
                helperText="Format : 0606060606 (sans indicatif pays)"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <FormInput
                control={control}
                name="website"
                label="Site web (optionnel)"
                testID="input-website"
                helperText="Format : https://www.association.fr"
                autoCapitalize="none"
                keyboardType="url"
              />

              <FormTextarea
                control={control}
                name="description"
                label="Description (optionnelle)"
                placeholder="Présentez votre association en quelques phrases..."
                maxLength={1000}
                showCharacterCount={true}
              />

              {/* --- DOCUMENTS --- */}
              <MultipleDocumentsPicker
                value={documents}
                onChange={setDocuments}
                maxFiles={5}
              />

              {/* --- CGU --- */}
              <Controller
                control={control}
                name="acceptTerms"
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <TermsCheckbox
                    checked={Boolean(value)}
                    testID="checkbox-terms"
                    onChange={(isChecked) => {
                      onChange(isChecked);
                      trigger("acceptTerms");
                    }}
                    errorMessage={error?.message}
                  />
                )}
              />

              <TouchableOpacity
                onPress={handleSubmit(onRegisterSubmit, scrollToTop)}
                testID="btn-submit-register-association"
                disabled={!acceptTerms || isSubmitting}
                className={clsx(
                  "h-control rounded-md flex-row items-center justify-center mt-4 transition-all",
                  !acceptTerms || isSubmitting
                    ? "bg-grey-100 border border-grey-100"
                    : "bg-primary border border-primary active:bg-primary-active",
                )}
                accessibilityRole="button"
                accessibilityState={{ disabled: !acceptTerms || isSubmitting }}
              >
                {isSubmitting ? (
                  <ActivityIndicator
                    color={acceptTerms ? colors.grey[400] : "#6B7280"}
                  />
                ) : (
                  <Text
                    className={clsx(
                      "font-bold text-base",
                      acceptTerms ? "text-white" : "text-grey-400",
                    )}
                  >
                    Inscrire mon association
                  </Text>
                )}
              </TouchableOpacity>

              {/* Inputs fichier web (cachés) — contournement de expo-image-picker sur web */}
              {Platform.OS === "web" && (
                <>
                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleWebImageFile(
                          file,
                          (uri, rn) => { setAvatarUri(uri); setAvatarFile(rn); },
                          "Seules les images sont acceptées pour la photo (JPEG, PNG, WEBP)",
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleWebImageFile(
                          file,
                          (uri, rn) => { setLogoUri(uri); setLogoFile(rn); },
                          "Seules les images sont acceptées pour le logo (JPEG, PNG, WEBP)",
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </>
          )}

          {step === "VERIFY" && (
            <View className="gap-6 mt-10">
              <View className="items-center gap-2">
                <Text className="text-2xl font-bold text-center text-grey-900">
                  Vérifiez votre boîte mail
                </Text>
                <Text className="px-4 text-center text-grey-600">
                  Nous avons envoyé un code de confirmation à :{"\n"}
                  <Text className="font-bold text-primary">
                    {registeredEmail}
                  </Text>
                </Text>
              </View>

              <FormInput
                control={controlVerify}
                name="code"
                label="Code à 6 chiffres"
                testID="input-verify-code"
                helperText="Format : 123456"
                keyboardType="number-pad"
                maxLength={6}
                required
                autoFocus
              />

              <Button
                testID="btn-submit-verify-code"
                onPress={handleSubmitVerify(onVerifySubmit)}
                loading={isSubmitting}
                className="w-full"
              >
                Valider
              </Button>

              <View className="items-center mt-2">
                <Button
                  variant="secondary"
                  onPress={handleResendCode}
                  disabled={resendTimer > 0}
                  loading={isResending}
                  className="w-full"
                >
                  {resendTimer > 0
                    ? `Renvoyer le code (${resendTimer}s)`
                    : "Je n'ai pas reçu le code"}
                </Button>

                <Text className="mt-4 text-xs text-center text-grey-600">
                  Vérifiez également vos courriers indésirables (spams).
                </Text>
              </View>
            </View>
          )}

          <View className="h-10" />
        </View>
      </ScrollView>
    </>
  );
}
