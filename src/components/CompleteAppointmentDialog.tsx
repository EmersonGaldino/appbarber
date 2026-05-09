import React from 'react';
import { NotesDialog } from './NotesDialog';
import { colors } from '../theme';

interface CompleteAppointmentDialogProps {
  visible: boolean;
  initialNotes?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (notes: string) => void | Promise<void>;
}

export function CompleteAppointmentDialog({
  visible,
  initialNotes,
  loading,
  onCancel,
  onConfirm,
}: CompleteAppointmentDialogProps) {
  return (
    <NotesDialog
      visible={visible}
      title="Concluir atendimento"
      subtitle="Deseja adicionar uma observação? O cliente receberá uma notificação."
      inputLabel="Observação (opcional)"
      placeholder="Ex.: Próximo retoque em 3 semanas."
      confirmLabel="Concluir"
      iconName="check-decagram"
      iconColor={colors.success}
      iconBackground={colors.successSoft}
      confirmBackground={colors.success}
      maxLength={240}
      initialValue={initialNotes}
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
