import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { colors } from "@/components/ui/theme/tokens";
import { MissionFormFields } from "@/components/ui/mission-form-fields/MissionFormFields";
import { MissionFormLayout } from "@/components/ui/mission-form-fields/MissionFormLayout";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { MissionService } from "@/services/mission.service";
import { getAssociation } from "@/services/association.service";
import { useMissionStepper } from "@/hooks/useMissionStepper";
import { UpdateMissionSchema } from "@repo/shared";
import type {
  UpdateMissionFormValues,
  AssociationMissionItem,
  Address,
} from "@repo/shared";
import type { RefItem } from "@/services/mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ModifierMissionScreen() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  usePageTitle("Modifier la mission");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;
  const id = Number(missionId);

  const [isLoadingMission, setIsLoadingMission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [associationAddress, setAssociationAddress] = useState<Address | null>(
    null,
  );
  const addressAutoSetReady = useRef(false);
  const [refs, setRefs] = useState<{
    skills: RefItem[];
    causes: RefItem[];
    publicTypes: RefItem[];
    volunteerTypes: RefItem[];
  }>({ skills: [], causes: [], publicTypes: [], volunteerTypes: [] });

  const form = useForm<UpdateMissionFormValues>({
    resolver: zodResolver(UpdateMissionSchema) as any,
    mode: "onSubmit",
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const { step, setStep, activityType, handleNext, handleBack, mapServerErrorsToFields } =
    useMissionStepper(form, associationAddress, addressAutoSetReady);

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
      .then(
        ([mission, skills, causes, publicTypes, volunteerTypes, association]) => {
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
          setTimeout(() => {
            addressAutoSetReady.current = true;
          }, 0);
        },
      )
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

  const populateForm = (mission: AssociationMissionItem) => {
    reset({
      title: mission.title,
      description: mission.description,
      type: mission.type,
      availabilityType: mission.availabilityType ?? undefined,
      hasRegistration: mission.hasRegistration,
      volunteersNeeded:
        mission.volunteersNeeded != null
          ? String(mission.volunteersNeeded)
          : ("" as any),
      durationInt:
        mission.durationInt != null
          ? String(mission.durationInt / 60)
          : ("" as any),
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

  const onSubmit = async (data: UpdateMissionFormValues) => {
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

        setError("root", {
          message: apiError?.message ?? "Mise à jour impossible.",
        });
      } else {
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

  if (isLoadingMission) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <MissionFormLayout
      title="Modifier la mission"
      submitLabel="Enregistrer"
      step={step}
      isSubmitting={isSubmitting}
      onBack={handleBack}
      onNext={handleNext}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => router.back()}
      errorMessage={errors.root?.message}
    >
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
    </MissionFormLayout>
  );
}
