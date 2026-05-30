import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const q = query(
      collection(db, "notifications"),

      where("userId", "==", user.uid),

      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,

        ...doc.data(),
      }));

      if (notifications.length && snapshot.docs.length > notifications.length) {
        // new Audio("/notification.mp3").play();
        const audio = new Audio("/notification.mp3");

        audio.volume = 1;

        audio.play().catch((err) => {
          console.log("Audio blocked:", err);
        });
      }

      setNotifications(data);
    });

    return () => unsubscribe();
  }, [notifications]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="
        relative
        text-2xl
      "
      >
        🔔
        {notifications.filter((n) => !n.isRead).length > 0 && (
          <span
            className="
            absolute
            -top-1
            -right-1
            bg-red-500
            text-white
            text-xs
            rounded-full
            px-1
          "
          >
            {notifications.filter((n) => !n.isRead).length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
          absolute
          right-0
          mt-2
          w-80
          bg-white
          shadow-lg
          rounded-lg
          border
          z-50
          max-h-96
          overflow-y-auto
        "
        >
          <div
            className="
            p-4
            border-b
            font-semibold
          "
          >
            Notifications
          </div>

          {notifications.length === 0 ? (
            <div
              className="
              p-4
              text-gray-500
            "
            >
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="
                  p-4
                  border-b
                  hover:bg-gray-50
                "
              >
                <h4
                  className="
                    font-semibold
                  "
                >
                  {notification.title}
                </h4>

                <p
                  className="
                    text-sm
                    text-gray-600
                    mt-1
                  "
                >
                  {notification.message}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
