import React, { useState, useMemo, useEffect, useRef } from "react";
import { useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { ActivityType, Address } from "@repo/shared";

export const STEP_LABELS = ["Informations", "Détails", "Tags"];

type StepVariant = "default" | "info";

export const STEP_FIELDS_BY_TYPE: Record<StepVariant, Record<1 | 2 | 3, string[]>> = {
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

export const FIELD_TO_STEP: Record<string, 1 | 2 | 3> = {
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

export function useMissionStepper(
  form: UseFormReturn<any>,
  associationAddress: Address | null,
  addressAutoSetReady?: React.MutableRefObject<boolean>,
) {
  const { control, trigger, clearErrors, setError, setValue, getValues, watch } =
    form;
  const { errors } = form.formState;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const activityType: ActivityType | undefined = useWatch({ control, name: "type" });
  const availabilityType = useWatch({ control, name: "availabilityType" }) as
    | "REMOTE"
    | "ON_SITE"
    | "HYBRID"
    | null
    | undefined;
  const hasRegistration = useWatch({
    control,
    name: "hasRegistration",
  }) as boolean | undefined;

  const stepFields = useMemo(
    () =>
      activityType === "INFO"
        ? STEP_FIELDS_BY_TYPE.info
        : STEP_FIELDS_BY_TYPE.default,
    [activityType],
  );

  useEffect(() => {
    if (!activityType) return;
    const current = getValues("availabilityType");
    if (activityType === "INFO") {
      if (current != null)
        setValue("availabilityType", undefined, { shouldValidate: false });
    } else if (activityType === "COLLECT") {
      if (current != null && current !== "ON_SITE")
        setValue("availabilityType", "ON_SITE", { shouldValidate: true });
    }
  }, [activityType, getValues, setValue]);

  useEffect(() => {
    if (hasRegistration === false)
      setValue("volunteersNeeded", undefined, { shouldValidate: false });
  }, [hasRegistration, setValue]);

  const errorsRef = useRef(errors);
  useEffect(() => {
    errorsRef.current = errors;
  });
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;
      if (errorsRef.current.root) clearErrors("root");
      const topKey = name.split(".")[0];
      if (errorsRef.current[topKey]) trigger(name);
    });
    return () => subscription.unsubscribe();
  }, [watch, trigger, clearErrors]);

  useEffect(() => {
    if (!activityType || !associationAddress) return;
    if (addressAutoSetReady && !addressAutoSetReady.current) return;
    const isInfo = activityType === "INFO";
    const isRemote = availabilityType === "REMOTE";
    if (isInfo || isRemote) {
      setValue(
        "address",
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

  const mapServerErrorsToFields = (
    properties: Record<string, any>,
  ): 1 | 2 | 3 | null => {
    let firstErrorStep: 1 | 2 | 3 | null = null;
    let mapped = false;
    Object.entries(properties).forEach(([field, payload]) => {
      const msg = payload?.errors?.[0];
      if (!msg) return;
      setError(field, { type: "server", message: msg });
      mapped = true;
      const s = FIELD_TO_STEP[field] ?? 1;
      if (firstErrorStep === null || s < firstErrorStep) firstErrorStep = s;
    });
    return mapped ? firstErrorStep : null;
  };

  return {
    step,
    setStep,
    stepFields,
    activityType,
    availabilityType,
    handleNext,
    handleBack,
    mapServerErrorsToFields,
  };
}
