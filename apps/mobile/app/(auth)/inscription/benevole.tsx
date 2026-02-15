import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import clsx from "clsx";
import { Stack, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import {
  RegisterSchema,
  RegisterDto,
  VerifyEmailSchema,
  VerifyEmailDto,
  ResendVerificationDto,
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
import { AuthService } from "@/services/auth.service";
import { cssInterop } from "nativewind";
import AddIconSource from "@assets/icons/ic_add.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import EmailIconSource from "@assets/icons/ic_email.svg";
import LockIconSource from "@assets/icons/ic_lock.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";
import { isAxiosError } from "axios";

const CameraPlaceholder = () => <Text className="text-4xl">📷</Text>;

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

type RegisterFormInput = z.input<typeof RegisterSchema>;
type RegisterFormCode = z.input<typeof VerifyEmailSchema>;
type Step = "REGISTER" | "VERIFY";

export default function RegisterBenevoleScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // --- ÉTATS ---
  const [step, setStep] = useState<Step>("REGISTER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const payload: ResendVerificationDto = {
        email: registeredEmail,
      };

      // On utilise l'email stocké lors de la step 1
      await AuthService.resendVerificationEmail(payload);

      setResendTimer(60); // On bloque pendant 60 secondes

      Toast.show({
        type: "success",
        text1: "Code renvoyé",
        text2: "Un nouveau code a été envoyé à votre adresse email.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Erreur lors du renvoi.";
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

  // Initialisation du Formulaire
  const {
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      acceptTerms: false,
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      biography: "",
      age: "",
      address: undefined,
    },
  });

  // Vérification email (step 2)
  const {
    control: controlVerify,
    handleSubmit: handleSubmitVerify,
    setError: setErrorVerify,
  } = useForm<RegisterFormCode>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  const passwordValue = watch("password");
  const profilePicture = watch("profilePicture");
  const acceptTerms = watch("acceptTerms");

  useEffect(() => {
    // On s'abonne aux changements du formulaire
    const subscription = watch(() => {
      // Dès que l'utilisateur modifie N'IMPORTE QUEL champ :
      if (errors.root) {
        clearErrors("root");
      }
    });

    // Nettoyage de l'abonnement quand le composant est démonté
    return () => subscription.unsubscribe();
  }, [watch, errors.root, clearErrors]);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Gestion de l'image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      // 1. On nettoie l'erreur (si elle existait) car l'utilisateur a fait une nouvelle action
      clearErrors("profilePicture");

      // 2. On met à jour la valeur
      setValue("profilePicture", result.assets[0].uri, {
        shouldValidate: true,
      });
    }
  };

  const removeImage = () => {
    // 1. On nettoie l'erreur
    clearErrors("profilePicture");

    // 2. On remet à undefined
    setValue("profilePicture", undefined, {
      shouldValidate: true,
    });
  };

  // Soumission du formulaire d'inscription (step 1)
  const onRegisterSubmit = async (data: RegisterFormInput) => {
    setIsSubmitting(true);
    // On nettoie les erreurs globales précédentes pour éviter qu'elles ne restent affichées si le problème est réglé
    // Note: React Hook Form nettoie déjà les erreurs de champ quand on retape dedans, mais pas l'erreur 'root'
    setError("root", { message: undefined });

    try {
      const validData = data as unknown as RegisterDto;
      await AuthService.register(validData, data.profilePicture);

      // Succès : on mémorise l'email et on passe au code
      setRegisteredEmail(data.email);
      Toast.show({
        type: "info",
        text1: "Inscription réussie",
        text2: `Un code a été envoyé à ${data.email}`,
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      setStep("VERIFY");
      scrollToTop();
    } catch (error: any) {
      if (isAxiosError(error) && error.response) {
        const apiError = error.response.data;
        const status = error.response.status;

        setError("root", {
          message: "Une erreur est survenue. Veuillez vérifier votre saisie.",
        });
        scrollToTop();

        // Cas erreur spécifique pour la photo de profil (422 Unprocessable Entity)
        if (status === 422) {
          setError("profilePicture", {
            type: "server",
            message: apiError.message || "Image invalide.",
          });
          return;
        }

        // Cas erreurs de validation (400 Bad Request) avec détails dans "errors.properties"
        if (status === 400 && apiError?.errors?.properties) {
          const properties = apiError.errors.properties;

          let hasMappedError = false;

          // On boucle sur chaque champ en erreur renvoyé par le backend
          Object.keys(properties).forEach((field) => {
            const errorMsg = properties[field]?.errors?.[0];
            if (errorMsg) {
              // Gestion spéciale pour l'adresse (objet imbriqué)
              if (field === "address") {
                setError("address", { type: "server", message: errorMsg });
                hasMappedError = true;
              }
              // Gestion des champs standards
              else {
                setError(field as keyof RegisterFormInput, {
                  type: "server",
                  message: errorMsg,
                });
                hasMappedError = true;
              }
            }
          });

          if (hasMappedError) return;
        }

        // Cas d'erreur de conflit (409) ou message d'erreur mentionnant l'email : on affiche une erreur spécifique sur le champ email
        const errorMessage = apiError?.message || "Une erreur est survenue.";
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

        // Cas d'autres erreurs : on affiche le message d'erreur globalement
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
        // Erreur Réseau
        setError("root", {
          message:
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
        });
        scrollToTop();
        // Erreur réseau / Pas de réponse
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

  // Soumission du formulaire de vérification du code (step 2)
  const onVerifySubmit = async (data: RegisterFormCode) => {
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

        // Si c'est une erreur 401 (Code invalide) ou 400 (Zod)
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
          headerTitle: step === "REGISTER" ? "Bénévole" : "Vérification",
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
          {/* --- STEP 1 : INSCRIPTION --- */}
          {step === "REGISTER" && (
            <>
              {errors.root?.message && (
                <View className="p-3 mb-4 border border-red-200 rounded-md bg-red-50">
                  <Text className="text-sm font-medium text-center text-red-600">
                    {errors.root.message}
                  </Text>
                </View>
              )}

              {/* AVATAR */}
              <View className="items-center mb-8">
                <View className="relative">
                  <AvatarButton
                    size="xl"
                    onPress={pickImage}
                    imageUrl={profilePicture}
                    isGuest={!profilePicture}
                    guestIcon={<CameraPlaceholder />}
                    accessibilityLabel={
                      profilePicture ? "Modifier la photo" : "Ajouter une photo"
                    }
                    className="bg-grey-100 border-grey-200"
                  />

                  {/* GESTION DU BADGE */}
                  {!profilePicture ? (
                    <View className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 border-2 border-white rounded-full pointer-events-none bg-primary">
                      <AddIcon className="w-4 h-4 text-white" />
                    </View>
                  ) : (
                    <Button
                      onPress={removeImage}
                      variant="primary"
                      icon={<TrashIcon className="w-3 h-3 text-white" />}
                      className="!absolute !bottom-0 !right-0 !w-6 !h-6 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Supprimer la photo"
                    />
                  )}
                </View>
                {/* --- AFFICHAGE DE L'ERREUR OU DU TEXTE D'AIDE --- */}
                {errors.profilePicture ? (
                  <Text className="mt-2 text-sm text-center text-error-100">
                    {errors.profilePicture.message as string}
                  </Text>
                ) : (
                  <Text className="mt-2 text-sm text-grey-500">
                    {profilePicture
                      ? "Modifier la photo"
                      : "Ajouter une photo (optionnel)"}
                  </Text>
                )}
              </View>

              {/* FORMULAIRE */}
              <View className="flex-col gap-4 md:flex-row">
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="firstName"
                    label="Prénom"
                    required
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="lastName"
                    label="Nom"
                    required
                  />
                </View>
              </View>

              <FormInput
                control={control}
                name="email"
                label="Email"
                helperText="Format : jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <EmailIcon width={20} height={20} color={colors.grey[600]} />
                }
                required
              />
              {/* --- DETAILS --- */}
              <FormInput
                control={control}
                name="age"
                label="Âge"
                keyboardType="numeric"
                required
              />

              {/* --- ADRESSE --- */}
              <Controller
                control={control}
                name="address"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <AddressAutocomplete
                    label="Adresse"
                    value={value as any}
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
                  />
                )}
              />

              {/* --- BIOGRAPHIE --- */}
              <FormTextarea
                control={control}
                name="biography"
                label="Biographie (Optionnel)"
                placeholder="Dites-nous en plus sur vous..."
                maxLength={1000}
                showCharacterCount={true}
              />

              {/* --- SÉCURITÉ --- */}
              <View className="gap-4 mt-4">
                <FormInput
                  control={control}
                  name="password"
                  label="Mot de passe"
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

              {/* --- CGU --- */}
              <Controller
                control={control}
                name="acceptTerms"
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <TermsCheckbox
                    checked={value as any}
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
                    color={!acceptTerms ? "#6B7280" : colors.grey[400]}
                  />
                ) : (
                  <Text
                    className={clsx(
                      "font-bold text-base",
                      !acceptTerms ? "text-grey-400" : "text-white",
                    )}
                  >
                    Créer mon compte
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* --- STEP 2 : VÉRIFICATION CODE --- */}
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
                helperText="Format : 123456"
                keyboardType="number-pad"
                maxLength={6}
                required
                autoFocus
              />

              <Button
                onPress={handleSubmitVerify(onVerifySubmit)}
                loading={isSubmitting}
                className="w-full"
              >
                Valider
              </Button>

              {/* --- SECTION RESEND AVEC BOUTON SECONDARY --- */}
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
