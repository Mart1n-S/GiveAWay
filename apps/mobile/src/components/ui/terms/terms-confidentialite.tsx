import React from "react";
import { View, Text } from "react-native";

export const PrivacyPolicyContent = () => {
  return (
    <View className="mb-4">
      <Text className="mb-4 text-base font-bold leading-6 text-primary">
        POLITIQUE DE CONFIDENTIALITÉ {"\n"}
        Plateforme GiveAWay
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        La présente Politique de confidentialité a pour objectif d’informer les
        utilisateurs de la plateforme GiveAWay sur la manière dont leurs données
        personnelles sont collectées, utilisées et protégées, conformément à la
        réglementation applicable, notamment le Règlement Général sur la
        Protection des Données (RGPD).
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        1. Responsable du traitement
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Le responsable du traitement des données personnelles est l’éditeur de
        la plateforme GiveAWay, dans le cadre d’un projet non lucratif et
        pédagogique.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        2. Données collectées
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Les données personnelles susceptibles d’être collectées sont :{"\n"}•
        Pour les bénévoles : nom, prénom, âge, adresse postale, localisation
        (approximative ou précise), centres d’intérêt, mot de passe chiffré.
        {"\n"}• Pour les associations : nom, numéro RNA, numéro SIRET, adresse,
        logo et statut juridique.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        3. Finalités du traitement
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Les données collectées sont utilisées exclusivement pour :{"\n"}• la
        création et la gestion des comptes utilisateurs,
        {"\n"}• la mise en relation entre bénévoles et associations,
        {"\n"}• l’affichage géolocalisé des annonces,
        {"\n"}• l’amélioration du fonctionnement de la plateforme.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        4. Géolocalisation
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        La géolocalisation est utilisée uniquement afin de proposer des annonces
        pertinentes à proximité de l’utilisateur. L’activation de la
        localisation précise est facultative et soumise au consentement
        explicite de l’utilisateur, qui peut la désactiver à tout moment.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        5. Cookies et traceurs
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        La plateforme utilise uniquement des cookies strictement nécessaires à
        son fonctionnement, notamment des cookies d’authentification (JWT,
        refresh token). Aucun cookie publicitaire ou de suivi commercial n’est
        utilisé.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        6. Partage des données
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Les données personnelles ne sont ni vendues, ni louées, ni cédées à des
        tiers. Elles peuvent uniquement être accessibles aux associations dans
        le cadre strict de la mise en relation avec les bénévoles.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        7. Durée de conservation
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Les données personnelles sont conservées pendant la durée d’existence du
        compte utilisateur. Elles sont supprimées lors de la suppression du
        compte, sauf obligation légale de conservation.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        8. Droits des utilisateurs
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        Conformément à la réglementation en vigueur, chaque utilisateur dispose
        d’un droit d’accès, de rectification, d’effacement, d’opposition et de
        limitation du traitement de ses données personnelles.
      </Text>

      <Text className="mb-2 text-lg font-bold text-grey-900">
        9. Sécurité des données
      </Text>
      <Text className="mb-4 text-base leading-6 text-grey-700">
        GiveAWay met en œuvre des mesures techniques et organisationnelles
        raisonnables afin de protéger les données personnelles contre tout accès
        non autorisé, perte ou divulgation.
      </Text>

      <Text className="mt-4 text-base font-bold text-grey-900">
        En utilisant la plateforme GiveAWay, vous reconnaissez avoir pris
        connaissance de la présente Politique de confidentialité.
      </Text>

      <Text className="mt-8 text-sm italic text-center text-grey-500">
        Dernière mise à jour : février 2026
      </Text>
    </View>
  );
};
