import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Button, Snackbar } from '@mui/material';
import { NotificationContext } from './notification-context.js';

export function NotificationProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((text, severity = 'success', action = null) => {
    setNotice({ text, severity, action, key: Date.now() });
    setOpen(true);
  }, []);

  const handleClose = (_event, reason) => {
    if (reason !== 'clickaway') setOpen(false);
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        key={notice?.key}
        open={open}
        autoHideDuration={notice?.action ? 8000 : 5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert
            severity={notice.severity}
            variant="filled"
            onClose={handleClose}
            sx={{ width: '100%' }}
            action={
              notice.action ? (
                <Button
                  color="inherit"
                  size="small"
                  component={RouterLink}
                  to={notice.action.to}
                  onClick={() => setOpen(false)}
                >
                  {notice.action.label}
                </Button>
              ) : undefined
            }
          >
            {notice.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}
