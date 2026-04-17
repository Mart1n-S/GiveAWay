/**
 * Mock HTTP server simulant l'API "recherche-entreprises" du gouvernement.
 * Démarré par `tests/global-setup.ts`, arrêté par `tests/global-teardown.ts`.
 *
 * Le service `AssociationVerificationService` utilise la variable d'environnement
 * `ASSOCIATION_API_URL`. La playwright config la pointe vers ce mock,
 * ce qui permet de tester de façon déterministe TOUS les chemins de
 * vérification (validée, incohérente, dissoute, non-association, inconnue).
 *
 * Le mock route les requêtes via le query param `q` :
 *   - W100000001 → Association valide & cohérente (NO manual review)
 *   - W100000002 → Association valide mais nom incohérent → manual review
 *   - W900000001 → Association DISSOUTE → blocage (rejectionReason)
 *   - W900000002 → Entité existante mais PAS une association → manual review
 *   - W900000003 → État administratif inconnu → manual review
 *   - tout autre  → aucun résultat → manual review
 *
 * Pour les tests qui ont besoin d'un siret valide, on accepte également
 * des SIRET avec les mêmes suffixes (ex: 10000000100001 → valide).
 */

import http from "node:http";
import type { AddressInfo } from "node:net";

export const MOCK_PORT = 4555;

// Données canoniques cohérentes utilisées par les tests
export const MOCK_VALID_NAME = "Les Amis du Quartier";
export const MOCK_VALID_POSTAL = "75011";

interface MockCandidate {
  nom_raison_sociale?: string;
  etat_administratif?: string;
  siege?: { code_postal?: string };
  complements?: {
    est_association?: boolean;
    identifiant_association?: string;
  };
}

function buildResponse(candidate: MockCandidate | null) {
  if (!candidate) {
    return { results: [], total_results: 0 };
  }
  return { results: [candidate], total_results: 1 };
}

function lookupCandidate(identifier: string): MockCandidate | null {
  // Normalise les SIRETs commençant par les mêmes patterns
  const key = identifier.startsWith("W")
    ? identifier
    : identifier.startsWith("1000000001")
      ? "W100000001"
      : identifier.startsWith("1000000002")
        ? "W100000002"
        : identifier.startsWith("9000000001")
          ? "W900000001"
          : identifier.startsWith("9000000002")
            ? "W900000002"
            : identifier.startsWith("9000000003")
              ? "W900000003"
              : identifier;

  switch (key) {
    case "W100000001":
      return {
        nom_raison_sociale: MOCK_VALID_NAME,
        etat_administratif: "A",
        siege: { code_postal: MOCK_VALID_POSTAL },
        complements: {
          est_association: true,
          identifiant_association: "W100000001",
        },
      };

    case "W100000002":
      return {
        nom_raison_sociale: "Nom Officiel Différent",
        etat_administratif: "A",
        siege: { code_postal: MOCK_VALID_POSTAL },
        complements: {
          est_association: true,
          identifiant_association: "W100000002",
        },
      };

    case "W900000001":
      return {
        nom_raison_sociale: MOCK_VALID_NAME,
        etat_administratif: "F", // Fermée / dissoute
        siege: { code_postal: MOCK_VALID_POSTAL },
        complements: {
          est_association: true,
          identifiant_association: "W900000001",
        },
      };

    case "W900000002":
      return {
        nom_raison_sociale: "Entreprise Quelconque SARL",
        etat_administratif: "A",
        siege: { code_postal: MOCK_VALID_POSTAL },
        complements: {
          est_association: false, // Pas une association
        },
      };

    case "W900000003":
      return {
        nom_raison_sociale: MOCK_VALID_NAME,
        etat_administratif: "X", // État inconnu
        siege: { code_postal: MOCK_VALID_POSTAL },
        complements: {
          est_association: true,
          identifiant_association: "W900000003",
        },
      };

    default:
      return null; // Aucun résultat
  }
}

let server: http.Server | null = null;

export function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${MOCK_PORT}`);
      const identifier = url.searchParams.get("q") ?? "";

      const candidate = lookupCandidate(identifier);
      const body = JSON.stringify(buildResponse(candidate));

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(body);
    });

    server.listen(MOCK_PORT, () => {
      console.log(
        `[mock-association-api] Listening on http://localhost:${MOCK_PORT}`,
      );
      const addr = server?.address() as AddressInfo | null;
      if (addr) {
        console.log(`[mock-association-api] Bound port: ${addr.port}`);
      }
      resolve();
    });
  });
}

export function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => {
      console.log("[mock-association-api] Stopped");
      server = null;
      resolve();
    });
  });
}
