import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterAssociationDto } from '@repo/shared';

export interface AssociationVerificationResult {
  exists: boolean;
  isActive: boolean;
  isConsistent: boolean;
  officialData: Record<string, unknown> | null;
  requiresManualReview: boolean;
  rejectionReason?: string;
}

interface ApiCandidate {
  nom_raison_sociale?: string;
  etat_administratif?: string;
  siege?: {
    siret?: string;
    code_postal?: string;
    [key: string]: unknown;
  };
  complements?: {
    est_association?: boolean;
    identifiant_association?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ApiResponse {
  results: ApiCandidate[];
  total_results: number;
}

@Injectable()
export class AssociationVerificationService {
  private readonly logger = new Logger(AssociationVerificationService.name);

  constructor(private readonly config: ConfigService) {}

  async verifyAssociation(
    dto: RegisterAssociationDto,
  ): Promise<AssociationVerificationResult> {
    const identifier = dto.rna ?? dto.siret;

    // Règle 1 : Ni RNA ni SIRET → revue manuelle directe
    if (!identifier) {
      return {
        exists: false,
        isActive: false,
        isConsistent: false,
        officialData: null,
        requiresManualReview: true,
      };
    }

    const apiUrl = this.config.get<string>('ASSOCIATION_API_URL');

    // Règle 2 : URL absente → impossible d'appeler l'API, revue manuelle
    if (!apiUrl) {
      this.logger.warn(
        'ASSOCIATION_API_URL absent — vérification API ignorée, revue manuelle requise',
      );
      return {
        exists: false,
        isActive: false,
        isConsistent: false,
        officialData: null,
        requiresManualReview: true,
      };
    }

    let candidate: ApiCandidate | null = null;

    try {
      const response = await fetch(
        `${apiUrl}?q=${encodeURIComponent(identifier)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `API a retourné ${response.status} pour l'identifiant ${identifier}`,
        );
        return {
          exists: false,
          isActive: false,
          isConsistent: false,
          officialData: null,
          requiresManualReview: true,
        };
      }

      const body = (await response.json()) as ApiResponse;

      // Aucun résultat → revue manuelle
      if (!body.total_results || !body.results?.length) {
        return {
          exists: false,
          isActive: false,
          isConsistent: false,
          officialData: null,
          requiresManualReview: true,
        };
      }

      candidate = body.results[0];
    } catch (error) {
      this.logger.warn(
        `Erreur lors de l'appel à l'API pour ${identifier}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        exists: false,
        isActive: false,
        isConsistent: false,
        officialData: null,
        requiresManualReview: true,
      };
    }

    // Règle 3 : Le résultat n'est pas une association → revue manuelle
    if (candidate.complements?.est_association !== true) {
      this.logger.debug(
        `L'entité ${identifier} n'est pas identifiée comme une association`,
      );
      return {
        exists: true,
        isActive: false,
        isConsistent: false,
        officialData: candidate as Record<string, unknown>,
        requiresManualReview: true,
      };
    }

    // Règle 4 : Association fermée → blocage de l'inscription
    if (candidate.etat_administratif === 'F') {
      return {
        exists: true,
        isActive: false,
        isConsistent: false,
        officialData: candidate as Record<string, unknown>,
        requiresManualReview: false,
        rejectionReason:
          "L'association est fermée (dissoute). L'inscription n'est pas possible.",
      };
    }

    const isActive = candidate.etat_administratif === 'A';

    // Règle 5 : État inconnu → revue manuelle sans blocage
    if (!isActive) {
      return {
        exists: true,
        isActive: false,
        isConsistent: false,
        officialData: candidate as Record<string, unknown>,
        requiresManualReview: true,
      };
    }

    // Règle 6 : Vérification de cohérence
    const isConsistent = this.checkConsistency(dto, candidate);

    return {
      exists: true,
      isActive: true,
      isConsistent,
      officialData: candidate as Record<string, unknown>,
      requiresManualReview: !isConsistent,
    };
  }

  // ----------------------------------------------------------------
  // Helpers privés
  // ----------------------------------------------------------------

  private checkConsistency(
    dto: RegisterAssociationDto,
    candidate: ApiCandidate,
  ): boolean {
    const normalize = (s: string) =>
      s.trim().toLowerCase().replaceAll(/\s+/g, ' ');

    // Vérification du nom
    if (candidate.nom_raison_sociale) {
      if (normalize(dto.name) !== normalize(candidate.nom_raison_sociale)) {
        this.logger.debug(
          `Nom incohérent : soumis="${dto.name}", officiel="${candidate.nom_raison_sociale}"`,
        );
        return false;
      }
    }

    // Vérification du code postal
    if (dto.address && candidate.siege?.code_postal) {
      if (dto.address.postalCode !== candidate.siege.code_postal) {
        this.logger.debug(
          `Code postal incohérent : soumis="${dto.address.postalCode}", officiel="${candidate.siege.code_postal}"`,
        );
        return false;
      }
    }

    // Vérification croisée du RNA
    if (dto.rna && candidate.complements?.identifiant_association) {
      if (dto.rna !== candidate.complements.identifiant_association) {
        this.logger.debug(
          `RNA incohérent : soumis="${dto.rna}", officiel="${candidate.complements.identifiant_association}"`,
        );
        return false;
      }
    }

    // Vérification croisée du SIRET
    if (dto.siret && candidate.siege?.siret) {
      // Normalisation : supprime les espaces éventuels
      const normalizedSubmitted = dto.siret.replace(/\s/g, '');
      const normalizedOfficial = candidate.siege.siret.replace(/\s/g, '');
      if (normalizedSubmitted !== normalizedOfficial) {
        this.logger.debug(
          `SIRET incohérent : soumis="${dto.siret}", officiel="${candidate.siege.siret}"`,
        );
        return false;
      }
    }

    return true;
  }
}
