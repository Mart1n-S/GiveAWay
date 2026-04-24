import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { colors } from "@/components/ui/theme/tokens";
import { MissionFormFields } from "@/components/ui/mission-form-fields/MissionFormFields";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { MissionService } from "@/services/mission.service";
import { getAssociation } from "@/services/association.service";
import { CreateMissionSchema } from "@repo/shared";
import type { CreateMissionFormValues, ActivityType, Address } from "@repo/shared";
import type { RefItem } from "@/services/mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import CheckIconSource from "@assets/icons/ic_check_small.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const CheckIcon = cssInterop(CheckIconSource, iconConfig);

const STEP_LABELS = ["Informations", "Détails", "Tags"];

// Champs validés à chaque étape du stepper.
const STEP_FIELDS_BY_TYPE: Record<
  "default" | "info",
  Record<1 | 2 | 3, (keyof CreateMissionFormValues)[]>
> = {
  default: {
    1: ["title", "description", "type", "availabilityType"],
    2: [
      "hasRegistration",
      "volunteersNeeded",
      "durationInt",
      "frequency",
      "startDate",
      "endDate",
      "address",
    ],
    3: ["skillIds", "causeIds", "publicTypeIds", "volunteerTypeIds"],
  },
  info: {
    1: ["title", "description", "type"],
    2: [],
    3: ["skillIds", "causeIds", "publicTypeIds", "volunteerTypeIds"],
  },
};

export default function CreerMissionScreen() {
  const router = useRouter();
  usePageTitle("Créer une mission");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [associationAddress, setAssociationAddress] = useState<Address | null>(
    null,
  );
  const [refs, setRefs] = useState<{
    skills: RefItem[];
    causes: RefItem[];
    publicTypes: RefItem[];
    volunteerTypes: RefItem[];
  }>({ skills: [], causes: [], publicTypes: [], volunteerTypes: [] });
  const [refsLoading, setRefsLoading] = useState(true);

  const {
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CreateMissionFormValues>({
    resolver: zodResolver(CreateMissionSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      hasRegistration: true,
      volunteersNeeded: "" as any,
      durationInt: "" as any,
      skillIds: [],
      causeIds: [],
      publicTypeIds: [],
      volunteerTypeIds: [],
    },
  });

  const activityType = useWatch({ control, name: "type" }) as
    | ActivityType
    | undefined;
  const availabilityType = useWatch({
    control,
    name: "availabilityType" as any,
  }) as "REMOTE" | "ON_SITE" | "HYBRID" | null | undefined;
  const hasRegistration = useWatch({ control, name: "hasRegistration" }) as boolean;

  const stepFields = useMemo(() => {
    const table =
      activityType === "INFO"
        ? STEP_FIELDS_BY_TYPE.info
        : STEP_FIELDS_BY_TYPE.default;
    return table;
  }, [activityType]);

  // Réinitialise availabilityType si incompatible avec le nouveau type sélectionné
  useEffect(() => {
    if (!activityType) return;
    const current = getValues("availabilityType");
    if (activityType === "INFO") {
      // On utilise undefined pour laisser Zod et Prisma faire leur travail
      if (current != null)
        setValue("availabilityType", undefined as any, {
          shouldValidate: false,
        });
    } else if (activityType === "COLLECT") {
      if (current != null && current !== "ON_SITE") {
        // On sélectionne automatiquement "ON_SITE" pour l'utilisateur
        setValue("availabilityType", "ON_SITE", { shouldValidate: true });
      }
    }
  }, [activityType, getValues, setValue]);

  // Vide volunteersNeeded quand l'inscription n'est plus obligatoire
  useEffect(() => {
    if (!hasRegistration) {
      setValue("volunteersNeeded", undefined as any, { shouldValidate: false });
    }
  }, [hasRegistration, setValue]);

  useEffect(() => {
    const tasks: Promise<any>[] = [
      MissionService.getSkills(),
      MissionService.getCauses(),
      MissionService.getPublicTypes(),
      MissionService.getVolunteerTypes(),
    ];
    if (associationId) tasks.push(getAssociation(associationId));

    Promise.all(tasks)
      .then(([skills, causes, publicTypes, volunteerTypes, association]) => {
        setRefs({ skills, causes, publicTypes, volunteerTypes });
        if (association?.address) setAssociationAddress(association.address);
      })
      .finally(() => setRefsLoading(false));
  }, [associationId]);

  // Re-valide un champ dès qu'il change, uniquement s'il a déjà une erreur
  const errorsRef = React.useRef(errors);
  useEffect(() => {
    errorsRef.current = errors;
  });
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;
      if (errorsRef.current.root) clearErrors("root");
      const topKey = name.split(".")[0] as keyof typeof errors;
      if (errorsRef.current[topKey]) trigger(name as any);
    });
    return () => subscription.unsubscribe();
  }, [watch, trigger, clearErrors]);

  // Auto-remplit l'adresse avec celle de l'association pour INFO et REMOTE
  useEffect(() => {
    if (!activityType || !associationAddress) return;
    const isInfo = activityType === "INFO";
    const isRemote = availabilityType === "REMOTE";
    if (isInfo || isRemote) {
      setValue(
        "address" as any,
        {
          street: associationAddress.street,
          postalCode: associationAddress.postalCode,
          city: associationAddress.city,
          latitude: associationAddress.latitude ?? undefined,
          longitude: associationAddress.longitude ?? undefined,
        },
        { shouldValidate: false },
      );
    }
  }, [activityType, availabilityType, associationAddress, setValue]);

  const handleNext = async () => {
    clearErrors("root");
    const fields = stepFields[step];
    if (fields.length === 0) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    const valid = await trigger(fields);
    if (!valid) return;
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const FIELD_TO_STEP: Record<string, 1 | 2 | 3> = {
    title: 1,
    description: 1,
    type: 1,
    availabilityType: 1,
    hasRegistration: 2,
    volunteersNeeded: 2,
    durationInt: 2,
    frequency: 2,
    startDate: 2,
    endDate: 2,
    address: 2,
    skillIds: 3,
    causeIds: 3,
    publicTypeIds: 3,
    volunteerTypeIds: 3,
  };

  const mapServerErrorsToFields = (
    properties: Record<string, any>,
  ): 1 | 2 | 3 | null => {
    let firstErrorStep: 1 | 2 | 3 | null = null;
    let mapped = false;
    Object.entries(properties).forEach(([field, payload]) => {
      const msg = (payload as any)?.errors?.[0];
      if (!msg) return;
      setError(field as keyof CreateMissionFormValues, {
        type: "server",
        message: msg,
      });
      mapped = true;
      const s = FIELD_TO_STEP[field] ?? 1;
      if (firstErrorStep === null || s < firstErrorStep) firstErrorStep = s;
    });
    return mapped ? firstErrorStep : null;
  };

  const onSubmit = async (data: CreateMissionFormValues) => {
    if (!associationId) return;
    setIsSubmitting(true);
    clearErrors("root");

    try {
      const payload = {
        ...data,
        durationInt:
          data.durationInt != null
            ? Math.round(Number(data.durationInt) * 60)
            : undefined,
      };
      await AssociationMissionService.create(associationId, payload);
      Toast.show({
        type: "success",
        text1: "Mission publiée !",
        visibilityTime: 3000,
        onPress: () => Toast.hide(),
      });
      router.replace("/association/missions" as any);
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const status = err.response.status;
        const apiError: any = err.response.data;

        if (status === 400 && apiError?.errors?.properties) {
          const firstErrorStep = mapServerErrorsToFields(
            apiError.errors.properties,
          );
          if (firstErrorStep !== null) {
            setError("root", {
              message: "Certains champs nécessitent une correction.",
            });
            setStep(firstErrorStep);
            return;
          }
        }

        // Toute erreur API connue (400, 422…) → affichée dans le formulaire uniquement
        setError("root", {
          message: apiError?.message ?? "Création impossible.",
        });
      } else {
        // Erreur réseau ou inattendue → toast
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de contacter le serveur.";
        setError("root", { message: msg });
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: msg,
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!associationId) {
    return (
      <View className="items-center justify-center flex-1 px-6">
        <Text className="text-base text-center text-grey-500">
          Vous n'êtes membre d'aucune association.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Créer une mission",
          headerShown: Platform.OS !== "web",
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header + stepper */}
        <View className="bg-white border-b border-grey-100">
          {Platform.OS === "web" && (
            <View className="px-4 pt-4">
              <Button
                variant="secondary"
                onPress={() => router.back()}
                className="self-start"
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            </View>
          )}

          <View className="flex-row items-center justify-between px-4 py-3">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = (idx + 1) as 1 | 2 | 3;
              const isActive = stepNum === step;
              const isDone = stepNum < step;
              let stepBg = "bg-grey-100";
              if (isActive) stepBg = "bg-primary";
              else if (isDone) stepBg = "bg-success-100";
              return (
                <View key={label} className="items-center flex-1 gap-1">
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center ${stepBg}`}
                  >
                    {isDone ? (
                      <CheckIcon className="w-4 h-4 text-white" />
                    ) : (
                      <Text className="text-xs font-bold text-white">
                        {stepNum}
                      </Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs ${
                      isActive ? "text-primary font-semibold" : "text-grey-400"
                    }`}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-grey-50"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-2xl gap-4 mx-auto">
            {errors.root?.message && (
              <View className="p-3 border border-red-200 rounded-md bg-red-50">
                <Text className="text-sm font-medium text-center text-red-600">
                  {errors.root.message}
                </Text>
              </View>
            )}

            {refsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary.default}
                className="mt-8"
              />
            ) : (
              <MissionFormFields
                step={step}
                control={control}
                skills={refs.skills}
                causes={refs.causes}
                publicTypes={refs.publicTypes}
                volunteerTypes={refs.volunteerTypes}
                activityType={activityType}
                errors={errors}
              />
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="flex-row gap-3 px-4 py-3 bg-white border-t border-grey-100">
          {step > 1 ? (
            <Button
              variant="secondary"
              onPress={handleBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              Retour
            </Button>
          ) : (
            <Button
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
          )}

          {step < 3 ? (
            <Button
              onPress={handleNext}
              disabled={isSubmitting}
              className="flex-1"
            >
              Suivant
            </Button>
          ) : (
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              className="flex-1"
            >
              Créer
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
