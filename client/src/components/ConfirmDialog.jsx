import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

// Підтвердження дії: скасування, відхилення, видалення, зміна ролі (ТЗ, п. 4.1)
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel = 'Назад',
  confirmColor = 'primary',
  onConfirm,
  onClose,
  loading = false,
  error = '',
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        {!error && (
          <Button variant="contained" color={confirmColor} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
