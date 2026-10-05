import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import {
  db,
  firebaseConfigured
} from "../firebase";
import { useAuth } from "./AuthContext";

const MessageContext = createContext(null);

function friendlyError(error) {
  const code = error?.code || "";

  if (
    code === "permission-denied" ||
    code === "PERMISSION_DENIED"
  ) {
    return new Error(
      "You do not have permission to access this conversation."
    );
  }

  return error;
}

function normalizeMessage(item) {
  const data = item.data();

  return {
    id: item.id,
    ...data,
    senderId:
      data.senderId ||
      data.from ||
      "",
    receiverId:
      data.receiverId ||
      data.to ||
      "",
    from:
      data.from ||
      data.senderId ||
      "",
    to:
      data.to ||
      data.receiverId ||
      "",
    text: data.text || "",
    read: data.read === true,
    createdAt:
      data.createdAt || null
  };
}

export function MessageProvider({
  children
}) {
  const { user } = useAuth();

  const [messages, setMessages] =
    useState([]);

  useEffect(() => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id
    ) {
      setMessages([]);
      return undefined;
    }

    const messageQuery = query(
      collection(db, "messages"),
      where(
        "participants",
        "array-contains",
        user.id
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );

    return onSnapshot(
      messageQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map(
            normalizeMessage
          )
        );
      },
      () => {
        setMessages([]);
      }
    );
  }, [user?.id]);

  const sendMessage =
    useCallback(
      async (from, to, text) => {
        const clean =
          String(text || "").trim();

        if (
          !clean ||
          !from ||
          !to
        ) {
          return;
        }

        if (
          !firebaseConfigured ||
          !db
        ) {
          throw new Error(
            "Firebase is not configured yet."
          );
        }

        try {
          await addDoc(
            collection(
              db,
              "messages"
            ),
            {
              senderId: from,
              receiverId: to,
              from,
              to,
              participants: [
                from,
                to
              ],
              text: clean,
              read: false,
              createdAt:
                serverTimestamp()
            }
          );
        } catch (error) {
          throw friendlyError(
            error
          );
        }
      },
      []
    );

  const unsendMessage =
    useCallback(
      async (messageId) => {
        if (
          !firebaseConfigured ||
          !db ||
          !user?.id ||
          !messageId
        ) {
          return;
        }

        const message =
          messages.find(
            (item) =>
              item.id ===
              messageId
          );

        if (!message) {
          throw new Error(
            "Message could not be found."
          );
        }

        if (
          message.senderId !==
          user.id
        ) {
          throw new Error(
            "You can only unsend your own messages."
          );
        }

        try {
          await deleteDoc(
            doc(
              db,
              "messages",
              messageId
            )
          );
        } catch (error) {
          throw friendlyError(
            error
          );
        }
      },
      [
        messages,
        user?.id
      ]
    );

  const markMessageAsRead =
    useCallback(
      async (messageId) => {
        if (
          !firebaseConfigured ||
          !db ||
          !user?.id ||
          !messageId
        ) {
          return;
        }

        const message =
          messages.find(
            (item) =>
              item.id ===
              messageId
          );

        if (!message) {
          return;
        }

        if (
          message.receiverId !==
          user.id
        ) {
          return;
        }

        if (
          message.read === true
        ) {
          return;
        }

        setMessages(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                messageId
                  ? {
                      ...item,
                      read: true
                    }
                  : item
            )
        );

        try {
          await updateDoc(
            doc(
              db,
              "messages",
              messageId
            ),
            {
              read: true
            }
          );
        } catch (error) {
          setMessages(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  messageId
                    ? {
                        ...item,
                        read: false
                      }
                    : item
              )
          );

          throw friendlyError(
            error
          );
        }
      },
      [
        messages,
        user?.id
      ]
    );

  const markConversationAsRead =
    useCallback(
      async (otherUserId) => {
        if (
          !firebaseConfigured ||
          !db ||
          !user?.id ||
          !otherUserId
        ) {
          return;
        }

        const unreadConversationMessages =
          messages.filter(
            (message) =>
              message.receiverId ===
                user.id &&
              message.senderId ===
                otherUserId &&
              message.read !== true
          );

        if (
          unreadConversationMessages.length ===
          0
        ) {
          return;
        }

        const messageIds =
          unreadConversationMessages.map(
            (message) =>
              message.id
          );

        setMessages(
          (current) =>
            current.map(
              (message) =>
                messageIds.includes(
                  message.id
                )
                  ? {
                      ...message,
                      read: true
                    }
                  : message
            )
        );

        try {
          await Promise.all(
            unreadConversationMessages.map(
              (message) =>
                updateDoc(
                  doc(
                    db,
                    "messages",
                    message.id
                  ),
                  {
                    read: true
                  }
                )
            )
          );
        } catch (error) {
          setMessages(
            (current) =>
              current.map(
                (message) =>
                  messageIds.includes(
                    message.id
                  )
                    ? {
                        ...message,
                        read: false
                      }
                    : message
              )
          );

          throw friendlyError(
            error
          );
        }
      },
      [
        messages,
        user?.id
      ]
    );

  const unreadMessages =
    useMemo(() => {
      if (!user?.id) {
        return [];
      }

      return messages.filter(
        (message) =>
          message.receiverId ===
            user.id &&
          message.read !== true
      );
    }, [
      messages,
      user?.id
    ]);

  const unreadMessageCount =
    unreadMessages.length;

  const unreadCountByUser =
    useMemo(() => {
      const counts = {};

      unreadMessages.forEach(
        (message) => {
          const senderId =
            message.senderId;

          if (!senderId) {
            return;
          }

          counts[senderId] =
            (counts[senderId] || 0) +
            1;
        }
      );

      return counts;
    }, [unreadMessages]);

  const getUnreadCountForUser =
    useCallback(
      (userId) => {
        if (!userId) {
          return 0;
        }

        return (
          unreadCountByUser[
            userId
          ] || 0
        );
      },
      [unreadCountByUser]
    );

  const getConversationMessages =
    useCallback(
      (otherUserId) => {
        if (
          !user?.id ||
          !otherUserId
        ) {
          return [];
        }

        return messages.filter(
          (message) => {
            return (
              (
                message.senderId ===
                  user.id &&
                message.receiverId ===
                  otherUserId
              ) ||
              (
                message.senderId ===
                  otherUserId &&
                message.receiverId ===
                  user.id
              )
            );
          }
        );
      },
      [
        messages,
        user?.id
      ]
    );

  return (
    <MessageContext.Provider
      value={{
        messages,
        sendMessage,
        unsendMessage,
        markMessageAsRead,
        markConversationAsRead,
        unreadMessages,
        unreadMessageCount,
        unreadCountByUser,
        getUnreadCountForUser,
        getConversationMessages
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages =
  () =>
    useContext(
      MessageContext
    );

