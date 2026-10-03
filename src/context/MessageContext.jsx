import { createContext, useContext, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { useAuth } from "./AuthContext";

const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!firebaseConfigured || !db || !user?.id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.id),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data()
          }))
        );
      },
      () => setMessages([])
    );
  }, [user?.id]);

  const sendMessage = async (from, to, text) => {
    const clean = String(text || "").trim();

    if (!clean || !from || !to) return;

    await addDoc(collection(db, "messages"), {
      senderId: from,
      receiverId: to,
      from,
      to,
      participants: [from, to],
      text: clean,
      read: false,
      createdAt: serverTimestamp()
    });
  };

  const unsendMessage = async (messageId) => {
    if (!firebaseConfigured || !db || !user?.id || !messageId) {
      return;
    }

    const message = messages.find(
      (item) => item.id === messageId
    );

    if (!message) {
      throw new Error("Message could not be found.");
    }

    if (message.senderId !== user.id && message.from !== user.id) {
      throw new Error("You can only unsend your own messages.");
    }

    await deleteDoc(doc(db, "messages", messageId));
  };

  return (
    <MessageContext.Provider
      value={{
        messages,
        sendMessage,
        unsendMessage
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages = () => useContext(MessageContext);