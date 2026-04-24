import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { Text } from "@/components/ui/text/text";
import { MissionFormFields } from "@/components/ui/mission-form-fields/MissionFormFields";
import { MissionFormLayout } from "@/components/ui/mission-form-fields/MissionFormLayout";
import { colors } from "@/components/ui/theme/tokens";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import { MissionService } from "@/services/mission.service";
import { getAssociation } from "@/services/association.service";
import { useMissionStepper } from "@/hooks/useMissionStepper";
import { CreateMissionSchema } from "@repo/shared";
import type { CreateMissionFormValues, Address } from "@repo/shared";
import type { RefItem } from "@/services/mission.service";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function CreerMissionScreen() {
  const router = useRouter();
  usePageTitle("Créer une mission");

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;

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

  const form = useForm<CreateMissionFormValues>({
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

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const { step, setStep, activityType, handleNext, handleBack, mapServerErrorsToFields } =
    useMissionStepper(form, associationAddress);

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

        setError("root", {
          message: apiError?.message ?? "Création impossible.",
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
    <MissionFormLayout
      title="Créer une mission"
      submitLabel="Créer"
      step={step}
      isSubmitting={isSubmitting}
      onBack={handleBack}
      onNext={handleNext}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => router.back()}
      errorMessage={errors.root?.message}
    >
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
    </MissionFormLayout>
  );
}
