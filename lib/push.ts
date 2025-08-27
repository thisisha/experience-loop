import webpush from 'web-push';
import { PushSubscription } from './types';

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_KEY!,
  privateKey: process.env.VAPID_PRIVATE!,
};

webpush.setVapidDetails(
  'mailto:admin@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: {
    title: string;
    body: string;
    url: string;
  }
) {
  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        url: payload.url,
      },
    });

    await webpush.sendNotification(subscription, pushPayload);
    return { success: true };
  } catch (error) {
    console.error('Push notification failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkPushNotifications(
  subscriptions: PushSubscription[],
  payload: {
    title: string;
    body: string;
    url: string;
  }
) {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPushNotification(sub, payload))
  );

  const successful = results.filter(
    result => result.status === 'fulfilled' && result.value.success
  ).length;

  const failed = results.length - successful;

  return {
    total: results.length,
    successful,
    failed,
    results,
  };
}
