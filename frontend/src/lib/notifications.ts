import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

interface NotificationData {

  userId: string;

  title: string;

  message: string;

  type?: string;
}

export const createNotification =
  async ({
    userId,
    title,
    message,
    type = "general",
  }: NotificationData) => {

    try {

      await addDoc(
        collection(
          db,
          "notifications"
        ),

        {
          userId,

          title,

          message,

          type,

          isRead: false,

          createdAt:
            serverTimestamp(),
        },
      );

    } catch (error) {

      console.log(
        "NOTIFICATION ERROR:",
        error
      );
    }
};