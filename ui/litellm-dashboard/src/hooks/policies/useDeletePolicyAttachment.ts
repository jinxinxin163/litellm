import { useTranslation } from "@/i18n/useTranslation";
import { useMutation } from "@tanstack/react-query";
import { deletePolicyAttachmentCall } from "@/components/networking";
import { toast } from "@/lib/toast";

interface UseDeletePolicyAttachmentProps {
  accessToken: string | null;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDeletePolicyAttachment = ({ accessToken, onSuccess, onError }: UseDeletePolicyAttachmentProps) => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!accessToken) {
        throw new Error(t("policiesPage.accessTokenRequired"));
      }
      return deletePolicyAttachmentCall(accessToken, attachmentId);
    },
    onSuccess: () => {
      toast.success(t("policiesPage.attachmentDeletedSuccessfully"));
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error deleting attachment:", error);
      toast.error(t("policiesPage.failedToDeleteAttachment"));
      if (onError) {
        onError(error);
      }
    },
  });
};
