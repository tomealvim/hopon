import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

export type PushPermission = "default" | "denied" | "granted";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [subscribed, setSubscribed] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    // Pedir permissão se ainda não foi dada
    const perm = await Notification.requestPermission();
    setPermission(perm as PushPermission);
    if (perm !== "granted") return;

    try {
      // Buscar a VAPID public key do servidor
      const { publicKey } = await apiRequest<{ publicKey: string }>("/push/vapid-key");
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      });

      const json = sub.toJSON();
      await apiRequest("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("[usePushNotifications] subscribe failed:", err);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("/push/unsubscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("[usePushNotifications] unsubscribe failed:", err);
    }
  }, [isSupported]);

  // Verificar estado inicial da subscrição
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, [isSupported, permission]);

  return { isSupported, permission, subscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
