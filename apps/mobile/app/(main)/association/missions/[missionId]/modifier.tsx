import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
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
import { UpdateMissionSchema } from "@repo/shared";
import type {
  UpdateMissionFormValues,
  AssociationMissionItem,
  ActivityType,
  Address,
} from "@repo/shared";
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

const STEP_FIELDS_BY_TYPE: Record<
  "default" | "info",
  Record<1 | 2 | 3, (keyof UpdateMissionFormValues)[]>
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

export default function ModifierMissionScreen() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  usePageTitle("Modifier la mission");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;
  const id = Number(missionId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoadingMission, setIsLoadingMission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [associationAddress, setAssociationAddress] = useState<Address | null>(null);
  const addressAutoSetReady = useRef(false);
  const [refs, setRefs] = useState<{
    skills: RefItem[];
    causes: RefItem[];
    publicTypes: RefItem[];
    volunteerTypes: RefItem[];
  }>({ skills: [], causes: [], publicTypes: [], volunteerTypes: [] });

  const {
    control,
    handleSubmit,
    trigger,
    reset,
    setError,
    clearErrors,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<UpdateMissionFormValues>({
    resolver: zodResolver(UpdateMissionSchema) as any,
    mode: "onSubmit",
  });

  const activityType = useWatch({ control, name: "type" }) as ActivityType | undefined;
  const availabilityType = useWatch({ control, name: "availabilityType" as any }) as
    | "REMOTE" | "ON_SITE" | "HYBRID" | null | undefined;

  const stepFields = useMemo(
    () =>
      activityType === "INFO"
        ? STEP_FIELDS_BY_TYPE.info
        : STEP_FIELDS_BY_TYPE.default,
    [activityType],
  );

  // Réinitialise availabilityType si incompatible avec le nouveau type sélectionné
  useEffect(() => {
    if (!activityType) return;
    const current = getValues("availabilityType");
    if (activityType === "INFO") {
      if (current != null) setValue("availabilityType", null as any, { shouldValidate: false });
    } else if (activityType === "COLLECT") {
      if (current != null && current !== "ON_SITE") {
        setValue("availabilityType", null as any, { shouldValidate: false });
      }
    }
  }, [activityType, getValues, setValue]);

  useEffect(() => {
    if (!associationId || !id) return;

    Promise.all([
      AssociationMissionService.getOne(associationId, id),
      MissionService.getSkills(),
      MissionService.getCauses(),
      MissionService.getPublicTypes(),
      MissionService.getVolunteerTypes(),
      getAssociation(associationId),
    ])
      .then(([mission, skills, causes, publicTypes, volunteerTypes, association]) => {
        if (mission.status === "ARCHIVED") {
          Toast.show({
            type: "error",
            text1: "Accès refusé",
            text2: "Les missions archivées ne peuvent pas être modifiées.",
            visibilityTime: 4000,
            onPress: () => Toast.hide(),
          });
          router.replace(`/association/missions/${id}` as any);
          return;
        }
        setRefs({ skills, causes, publicTypes, volunteerTypes });
        if (association?.address) setAssociationAddress(association.address);
        populateForm(mission);
        setTimeout(() => { addressAutoSetReady.current = true; }, 0);
      })
      .catch(() => {
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: "Impossible de charger la mission.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      })
      .finally(() => setIsLoadingMission(false));
  }, [associationId, id]);

  // Re-valide un champ dès qu'il change, uniquement s'il a déjà une erreur
  const errorsRef = React.useRef(errors);
  useEffect(() => { errorsRef.current = errors; });
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
  // Le guard addressAutoSetReady évite d'écraser l'adresse existante au chargement
  useEffect(() => {
    if (!addressAutoSetReady.current || !activityType || !associationAddress) return;
    const isInfo = activityType === "INFO";
    const isRemote = availabilityType === "REMOTE";
    if (isInfo || isRemote) {
      setValue("address" as any, {
        street: associationAddress.street,
        postalCode: associationAddress.postalCode,
        city: associationAddress.city,
        latitude: associationAddress.latitude ?? undefined,
        longitude: associationAddress.longitude ?? undefined,
      }, { shouldValidate: false });
    }
  }, [activityType, availabilityType, associationAddress, setValue]);

  const populateForm = (mission: AssociationMissionItem) => {
    reset({
      title: mission.title,
      description: mission.description,
      type: mission.type,
      availabilityType: mission.availabilityType ?? undefined,
      hasRegistration: mission.hasRegistration,
      volunteersNeeded: mission.volunteersNeeded != null ? String(mission.volunteersNeeded) : ("" as any),
      durationInt: mission.durationInt != null ? String(mission.durationInt / 60) : ("" as any),
      frequency: mission.frequency ?? undefined,
      startDate: mission.startDate
        ? new Date(mission.startDate).toISOString()
        : undefined,
      endDate: mission.endDate
        ? new Date(mission.endDate).toISOString()
        : undefined,
      address: mission.address ?? undefined,
      skillIds: mission.skills.map((s) => s.id),
      causeIds: mission.causes.map((c) => c.id),
      publicTypeIds: mission.publicTypes.map((p) => p.id),
      volunteerTypeIds: mission.volunteerTypes.map((v) => v.id),
    });
  };

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
    title: 1, description: 1, type: 1, availabilityType: 1,
    hasRegistration: 2, volunteersNeeded: 2, durationInt: 2,
    frequency: 2, startDate: 2, endDate: 2, address: 2,
    skillIds: 3, causeIds: 3, publicTypeIds: 3, volunteerTypeIds: 3,
  };

  const mapServerErrorsToFields = (properties: Record<string, any>): 1 | 2 | 3 | null => {
    let firstErrorStep: 1 | 2 | 3 | null = null;
    let mapped = false;
    Object.entries(properties).forEach(([field, payload]) => {
      const msg = (payload as any)?.errors?.[0];
      if (!msg) return;
      setError(field as keyof UpdateMissionFormValues, { type: "server", message: msg });
      mapped = true;
      const s = FIELD_TO_STEP[field] ?? 1;
      if (firstErrorStep === null || s < firstErrorStep) firstErrorStep = s;
    });
    return mapped ? firstErrorStep : null;
  };

  const onSubmit = async (data: UpdateMissionFormValues) => {
    if (!associationId) return;
    setIsSubmitting(true);
    clearErrors("root");

    try {
      const payload = {
        ...data,
        durationInt: data.durationInt != null
          ? Math.round(Number(data.durationInt) * 60)
          : undefined,
      };
      await AssociationMissionService.update(associationId, id, payload);
      Toast.show({
        type: "success",
        text1: "Mission mise à jour",
        visibilityTime: 3000,
        onPress: () => Toast.hide(),
      });
      router.back();
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const status = err.response.status;
        const apiError: any = err.response.data;

        if (status === 400 && apiError?.errors?.properties) {
          const firstErrorStep = mapServerErrorsToFields(apiError.errors.properties);
          if (firstErrorStep !== null) {
            setError("root", { message: "Certains champs nécessitent une correction." });
            setStep(firstErrorStep);
            return;
          }
        }

        // Toute erreur API connue (400, 422…) → affichée dans le formulaire uniquement
        setError("root", {
          message: apiError?.message ?? "Mise à jour impossible.",
        });
      } else {
        // Erreur réseau ou inattendue → toast
        const msg = err instanceof Error ? err.message : "Impossible de contacter le serveur.";
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

  if (isLoadingMission) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Modifier la mission", headerShown: Platform.OS !== "web" }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
                <View key={label} className="flex-1 items-center gap-1">
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
                      isActive
                        ? "text-primary font-semibold"
                        : "text-grey-400"
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
          <View className="w-full max-w-2xl mx-auto gap-4">
            {errors.root?.message && (
              <View className="p-3 border border-red-200 rounded-md bg-red-50">
                <Text className="text-sm font-medium text-center text-red-600">
                  {errors.root.message}
                </Text>
              </View>
            )}

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
          </View>
        </ScrollView>

        <View className="flex-row gap-3 px-4 py-3 border-t border-grey-100 bg-white">
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
              Enregistrer
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
