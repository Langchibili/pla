'use client';
import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemText, Typography,
} from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/useToast';
import { fmtDate } from '@/lib/format';

export default function NotificationCenter() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useApi('notifications', endpoints.notifications);
  const [olderNotifications, setOlderNotifications] = useState({ base: null, items: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const olderItems = data?.notifications === olderNotifications.base ? olderNotifications.items : [];
  const notifications = [...(data?.notifications ?? []), ...olderItems];
  const unread = Number(data?.unread) || 0;
  const hasMore = notifications.length < Number(data?.pagination?.total ?? 0);

  useEffect(() => {
    const refresh = () => { void reload(); };
    window.addEventListener('pla:notification-updated', refresh);
    return () => window.removeEventListener('pla:notification-updated', refresh);
  }, [reload]);

  const loadMore = async () => {
    if (loadingMore || !data?.notifications) return;
    setLoadingMore(true);
    try {
      const nextPage = await endpoints.notifications(notifications.length);
      setOlderNotifications((current) => ({
        base: data.notifications,
        items: [
          ...(current.base === data.notifications ? current.items : []),
          ...(nextPage.notifications ?? []),
        ],
      }));
    } catch (readError) {
      toast(readError.message || 'Could not load more notifications', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const markAllRead = async () => {
    try {
      await endpoints.readAllNotifications();
      await reload();
    } catch (readError) {
      toast(readError.message || 'Could not update notifications', 'error');
    }
  };

  const setRead = async (event, notification) => {
    event.stopPropagation();
    try {
      await endpoints.setNotificationRead(notification.documentId, Boolean(notification.read_at));
      await reload();
    } catch (readError) {
      toast(readError.message || 'Could not update notification', 'error');
    }
  };

  const openNotification = async (notification) => {
    try {
      if (!notification.read_at) await endpoints.readNotification(notification.documentId);
      await reload();
      setOpen(false);
      const route = notification.data?.route;
      if (typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')) {
        router.push(route);
      }
    } catch (readError) {
      toast(readError.message || 'Could not open notification', 'error');
    }
  };

  return (
    <>
      <IconButton
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={() => { setOpen(true); void reload(); }}
        sx={{ width: 42, height: 42, color: 'secondary.main' }}
      >
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsNoneRoundedIcon />
        </Badge>
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 'min(100vw, 420px)', pt: 'env(safe-area-inset-top)' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Box>
            <Typography variant="h6">Notifications</Typography>
            <Typography variant="caption" color="text.secondary">{unread} unread</Typography>
          </Box>
          <Button size="small" onClick={markAllRead} disabled={!unread}>Mark all read</Button>
        </Box>
        <Divider />
        {error && <Typography color="error" sx={{ p: 2 }}>Notifications could not be loaded.</Typography>}
        {!error && !loading && notifications.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>You’re all caught up.</Typography>
        )}
        <List disablePadding>
          {notifications.map((notification) => (
            <Box key={notification.documentId}>
              <ListItemButton
                onClick={() => openNotification(notification)}
                sx={{ alignItems: 'flex-start', gap: 1.25, py: 1.75, pr: 0.5 }}
              >
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: notification.read_at ? 'transparent' : 'secondary.main', mt: 0.8, flexShrink: 0 }} />
                <ListItemText
                  primary={notification.title}
                  secondary={(
                    <>
                      <Typography component="span" variant="body2" display="block" color="text.secondary">{notification.body}</Typography>
                      <Typography component="span" variant="caption" color="text.secondary">{fmtDate(notification.createdAt)}</Typography>
                    </>
                  )}
                  primaryTypographyProps={{ fontWeight: notification.read_at ? 600 : 800 }}
                />
                <IconButton
                  aria-label={notification.read_at ? 'Mark unread' : 'Mark read'}
                  onClick={(event) => setRead(event, notification)}
                  size="small"
                >
                  {notification.read_at ? <MarkEmailUnreadRoundedIcon fontSize="small" /> : <MarkEmailReadRoundedIcon fontSize="small" />}
                </IconButton>
              </ListItemButton>
            </Box>
          ))}
        </List>
        {hasMore && (
          <Button fullWidth onClick={loadMore} disabled={loadingMore} sx={{ my: 1 }}>{loadingMore ? 'Loading…' : 'Load more'}</Button>
        )}
      </Drawer>
    </>
  );
}
