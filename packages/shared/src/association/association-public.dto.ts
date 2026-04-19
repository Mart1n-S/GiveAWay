export interface AssociationPublicItem {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  category: string | null;
  city: string | null;
  activeMissionsCount: number;
}

export interface AssociationPublicAddress {
  street: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AssociationPublicProfile {
  id: number;
  name: string;
  description: string | null;
  object: string | null;
  legalStatus: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  category: string | null;
  address: AssociationPublicAddress | null;
  activeMissionsCount: number;
  createdAt: Date | string;
}

export interface AssociationPublicListResponse {
  associations: AssociationPublicItem[];
  total: number;
  page: number;
  pageSize: number;
}
