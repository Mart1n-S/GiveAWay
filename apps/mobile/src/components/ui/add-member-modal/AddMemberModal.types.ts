import { AddMemberDto } from "@repo/shared";

export interface AddMemberModalProps {
  visible: boolean;
  onAdd: (dto: AddMemberDto) => Promise<void>;
  onClose: () => void;
}
