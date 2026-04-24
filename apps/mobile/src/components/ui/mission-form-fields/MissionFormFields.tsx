import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Controller, FieldValues, useWatch } from "react-hook-form";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { FormInput } from "@/components/form/form-input";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormDateInput } from "@/components/form/form-date-input";
import { ToggleRow } from "@/components/ui/toggle-row/toggle-row";
import { MultiSelectList } from "@/components/ui/multi-select-list/multi-select-list";
import { AddressAutocomplete } from "@/components/ui/form-tools/address-autocomplete";
import type { ActivityType } from "@repo/shared";
import type { MissionFormFieldsProps } from "./MissionFormFields.types";

import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import GlobeIconSource from "@assets/icons/ic_globe.svg";
import HomeIconSource from "@assets/icons/ic_home.svg";
import BriefcaseIconSource from "@assets/icons/ic_briefcase.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const GlobeIcon = cssInterop(GlobeIconSource, iconConfig);
const HomeIcon = cssInterop(HomeIconSource, iconConfig);
const BriefcaseIcon = cssInterop(BriefcaseIconSource, iconConfig);

type IconComponent = React.ComponentType<{ className?: string }>;

const ACTIVITY_OPTIONS: { value: ActivityType; label: string; Icon: IconComponent }[] = [
  { value: "MISSION", label: "Mission", Icon: HandHeartIcon },
  { value: "EVENT", label: "Événement", Icon: CalendarIcon },
  { value: "COLLECT", label: "Collecte", Icon: BoxIcon },
  { value: "INFO", label: "Information", Icon: InfoIcon },
];

const AVAILABILITY_OPTIONS: { value: "REMOTE" | "ON_SITE" | "HYBRID"; label: string; Icon: IconComponent }[] = [
  { value: "REMOTE", label: "À distance", Icon: GlobeIcon },
  { value: "ON_SITE", label: "En présentiel", Icon: HomeIcon },
  { value: "HYBRID", label: "Hybride", Icon: BriefcaseIcon },
];

const FREQUENCY_OPTIONS = [
  { value: "ONCE", label: "Ponctuelle" },
  { value: "DAILY", label: "Quotidienne" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuelle" },
] as const;

// Descriptions affichées dans la bulle d'info des types d'activité
const ACTIVITY_INFO: { Icon: IconComponent; title: string; desc: string }[] = [
  {
    Icon: HandHeartIcon,
    title: "Mission",
    desc: "Activité bénévole terrain : aide alimentaire, accompagnement, soutien scolaire…",
  },
  {
    Icon: CalendarIcon,
    title: "Événement",
    desc: "Manifestation ponctuelle ouverte au public : festival, marché solidaire, portes ouvertes…",
  },
  {
    Icon: BoxIcon,
    title: "Collecte",
    desc: "Recueil de dons physiques (nourriture, vêtements, matériel) dans un lieu physique.",
  },
  {
    Icon: InfoIcon,
    title: "Information",
    desc: "Simple annonce sur l'association. Aucune inscription ni déplacement requis.",
  },
];

function PillRadio({
  label,
  selected,
  onPress,
  Icon,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  Icon?: IconComponent;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      className={clsx(
        "px-3 py-2 rounded-lg border flex-row items-center gap-1.5 transition-all",
        "web:cursor-pointer web:outline-none",
        "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        disabled && "opacity-50",
        selected
          ? "bg-white-active border-primary"
          : "bg-white border-grey-200 hover:bg-grey-50 hover:border-grey-300 active:bg-grey-100",
      )}
    >
      {Icon && (
        <Icon className={clsx("w-4 h-4", selected ? "text-primary" : "text-grey-500")} />
      )}
      <Text className={clsx("text-xs font-semibold", selected ? "text-primary" : "text-grey-700")}>
        {label}
      </Text>
    </Pressable>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="text-xs font-medium text-error-100">{message}</Text>;
}

function InfoNote({ children }: { children: string }) {
  return (
    <View className="flex-row items-start gap-2 p-3 border border-blue-100 rounded-lg bg-blue-50">
      <InfoIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <Text className="flex-1 text-xs text-grey-700">{children}</Text>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────
// Composant principal
// Tous les steps sont rendus simultanément (display:none pour les inactifs)
// afin que les Controllers restent montés et que les valeurs du formulaire
// ne soient jamais perdues lors des transitions de step.
// ───────────────────────────────────────────────────────────────────

export function MissionFormFields<T extends FieldValues>({
  step,
  control,
  skills,
  causes,
  publicTypes,
  volunteerTypes,
  activityType,
}: MissionFormFieldsProps<T>) {
  const isInfo = activityType === "INFO";
  const isCollect = activityType === "COLLECT";

  const [showActivityInfo, setShowActivityInfo] = useState(false);

  const availabilityType = useWatch({
    control,
    name: "availabilityType" as any,
  }) as "REMOTE" | "ON_SITE" | "HYBRID" | undefined;

  const hasRegistration = useWatch({
    control,
    name: "hasRegistration" as any,
  }) as boolean | undefined;

  const isRemote = availabilityType === "REMOTE";
  const showVolunteersNeeded = !isCollect && (hasRegistration ?? true);

  return (
    <>
      {/* ── Step 1 : Informations ───────────────────────────────── */}
      <View style={{ display: step === 1 ? "flex" : "none" }}>
        <View className="gap-6">
          <FormInput
            control={control}
            name={"title" as any}
            label="Titre"
            placeholder="Ex: Distribution alimentaire"
            required
          />

          <FormTextarea
            control={control}
            name={"description" as any}
            label="Description"
            placeholder="Décrivez la mission, les activités prévues..."
            numberOfLines={5}
            required
          />

          {/* ── Type d'activité + bulle d'info ── */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-grey-800">
                Type d'activité <Text className="text-error-100">*</Text>
              </Text>
              <Pressable
                onPress={() => setShowActivityInfo((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="web:cursor-pointer"
              >
                <InfoIcon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    showActivityInfo ? "text-primary" : "text-grey-400",
                  )}
                />
              </Pressable>
            </View>

            {showActivityInfo && (
              <View className="p-3 bg-blue-50 rounded-lg border border-blue-100 gap-2.5">
                {ACTIVITY_INFO.map(({ Icon, title, desc }) => (
                  <View key={title} className="flex-row items-start gap-2">
                    <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-grey-800">
                        {title}
                      </Text>
                      <Text className="text-xs leading-4 text-grey-600">
                        {desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Controller
              control={control}
              name={"type" as any}
              render={({ field, fieldState }) => (
                <View className="gap-1">
                  <View className="flex-row flex-wrap gap-2">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <PillRadio
                        key={opt.value}
                        label={opt.label}
                        selected={field.value === opt.value}
                        onPress={() => field.onChange(opt.value)}
                        Icon={opt.Icon}
                      />
                    ))}
                  </View>
                  <FieldError message={fieldState.error?.message} />
                </View>
              )}
            />
          </View>

          {!isInfo && (
            <View className="gap-3">
              <Text className="text-sm font-bold text-grey-800">
                Modalité <Text className="text-error-100">*</Text>
              </Text>
              <Controller
                control={control}
                name={"availabilityType" as any}
                render={({ field, fieldState }) => (
                  <View className="gap-1">
                    <View className="flex-row flex-wrap gap-2">
                      {AVAILABILITY_OPTIONS.map((opt) => {
                        // COLLECT : uniquement EN_SITE (pas de REMOTE ni HYBRID)
                        const disabled = isCollect && opt.value !== "ON_SITE";
                        return (
                          <PillRadio
                            key={opt.value}
                            label={opt.label}
                            selected={field.value === opt.value}
                            onPress={() => field.onChange(opt.value)}
                            Icon={opt.Icon}
                            disabled={disabled}
                          />
                        );
                      })}
                    </View>
                    <FieldError message={fieldState.error?.message} />
                    {isCollect && (
                      <Text className="text-xs text-grey-500">
                        Une collecte implique un lieu physique (en présentiel
                        uniquement).
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </View>

      {/* ── Step 2 : Détails ────────────────────────────────────── */}
      <View style={{ display: step === 2 ? "flex" : "none" }}>
        {isInfo ? (
          <View className="items-center justify-center gap-3 py-10">
            <InfoIcon className="w-10 h-10 text-grey-300" />
            <Text className="text-sm text-center text-grey-500">
              Une information n'a pas de modalité logistique.{"\n"}
              Passez directement à l'étape suivante pour y associer des tags.
            </Text>
          </View>
        ) : (
          <View className="gap-6">
            {/* Inscription obligatoire — masqué pour les collectes */}
            {!isCollect && (
              <Controller
                control={control}
                name={"hasRegistration" as any}
                render={({ field, fieldState }) => (
                  <ToggleRow
                    label="Inscription obligatoire"
                    description="Les bénévoles devront s'inscrire pour participer"
                    value={field.value ?? true}
                    onValueChange={field.onChange}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            )}

            {showVolunteersNeeded && (
              <FormInput
                control={control}
                name={"volunteersNeeded" as any}
                label="Nombre de bénévoles souhaité"
                placeholder="Ex: 10"
                keyboardType="numeric"
                required
              />
            )}

            <FormInput
              control={control}
              name={"durationInt" as any}
              label="Durée (en heures)"
              placeholder="Ex: 2 ou 1.5 pour 1h30"
              keyboardType="numeric"
            />

            <View className="gap-3">
              <Text className="text-sm font-bold text-grey-800">Fréquence</Text>
              <Controller
                control={control}
                name={"frequency" as any}
                render={({ field, fieldState }) => (
                  <View className="gap-1">
                    <View className="flex-row flex-wrap gap-2">
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <PillRadio
                          key={opt.value}
                          label={opt.label}
                          selected={field.value === opt.value}
                          onPress={() =>
                            field.onChange(
                              field.value === opt.value ? null : opt.value,
                            )
                          }
                        />
                      ))}
                    </View>
                    <FieldError message={fieldState.error?.message} />
                  </View>
                )}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormDateInput
                  control={control}
                  name={"startDate" as any}
                  label="Date de début"
                />
              </View>
              <View className="flex-1">
                <FormDateInput
                  control={control}
                  name={"endDate" as any}
                  label="Date de fin"
                />
              </View>
            </View>

            {/* Adresse — masquée pour les missions 100 % à distance */}
            {isRemote ? (
              <InfoNote>
                Pour les missions à distance, l'adresse de l'association sera
                utilisée pour l'affichage sur la carte.
              </InfoNote>
            ) : (
              <Controller
                control={control}
                name={"address" as any}
                render={({ field, fieldState }) => (
                  <View className="gap-1">
                    <Text className="text-sm font-bold text-grey-800">
                      Adresse
                    </Text>
                    <AddressAutocomplete
                      value={field.value ?? undefined}
                      onSelect={(result) => {
                        if (!result) {
                          field.onChange(null);
                          return;
                        }
                        field.onChange({
                          street: result.street,
                          postalCode: result.postcode,
                          city: result.city,
                          latitude: result.latitude || undefined,
                          longitude: result.longitude || undefined,
                        });
                      }}
                      error={fieldState.error as any}
                      testIDPrefix="mission"
                    />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* ── Step 3 : Tags ───────────────────────────────────────── */}
      <View style={{ display: step === 3 ? "flex" : "none" }}>
        <View className="gap-6">
          <View className="gap-3">
            <Text className="text-sm font-bold text-grey-800">
              Compétences recherchées
            </Text>
            <Controller
              control={control}
              name={"skillIds" as any}
              render={({ field }) => (
                <MultiSelectList
                  items={skills}
                  selectedIds={field.value ?? []}
                  onChange={field.onChange}
                  variant="blue"
                />
              )}
            />
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-grey-800">
              Causes associées
            </Text>
            <Controller
              control={control}
              name={"causeIds" as any}
              render={({ field }) => (
                <MultiSelectList
                  items={causes}
                  selectedIds={field.value ?? []}
                  onChange={field.onChange}
                  variant="orange"
                />
              )}
            />
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-grey-800">
              Publics ciblés
            </Text>
            <Controller
              control={control}
              name={"publicTypeIds" as any}
              render={({ field }) => (
                <MultiSelectList
                  items={publicTypes}
                  selectedIds={field.value ?? []}
                  onChange={field.onChange}
                  variant="orange"
                />
              )}
            />
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-grey-800">
              Types de bénévoles
            </Text>
            <Controller
              control={control}
              name={"volunteerTypeIds" as any}
              render={({ field }) => (
                <MultiSelectList
                  items={volunteerTypes}
                  selectedIds={field.value ?? []}
                  onChange={field.onChange}
                  variant="blue"
                />
              )}
            />
          </View>
        </View>
      </View>
    </>
  );
}
