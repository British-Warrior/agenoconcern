import { useState, useEffect, useCallback } from "react";
import { savePushSubscription, removePushSubscription } from "../api/notifications.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_KEY;

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_KEY) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY).buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();
    await savePushSubscription({
      endpoint: json.endpoint!,
      keys: {
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      },
    });
    setIsSubscribed(true);
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await removePushSubscription(endpoint);
    setIsSubscribed(false);
  }, []);

  return { subscribe, unsubscribe, isSubscribed, isSupported };
}
