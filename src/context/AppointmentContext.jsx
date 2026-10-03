import { createContext, useContext, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { sendSemaphoreSMS } from "../services/semaphoreService";
import { todayISO } from "../utils";
import { useAuth } from "./AuthContext";

const AppointmentContext = createContext(null);

export function AppointmentProvider({ children }) {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [appointmentNotifications, setAppointmentNotifications] =
    useState([]);

  useEffect(() => {
    if (!firebaseConfigured || !db || !user?.id) {
      setAppointments([]);
      setBlockedDates([]);
      setAppointmentNotifications([]);
      return;
    }

    const appointmentQuery =
      user.role === "engineer"
        ? collection(db, "appointments")
        : query(
            collection(db, "appointments"),
            where("clientId", "==", user.id)
          );

    const unsubAppointments = onSnapshot(
      appointmentQuery,
      (snapshot) =>
        setAppointments(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data()
            }))
            .sort((a, b) =>
              `${a.date}${a.time}`.localeCompare(
                `${b.date}${b.time}`
              )
            )
        ),
      () => setAppointments([])
    );

    const unsubBlocked = onSnapshot(
      collection(db, "blockedDates"),
      (snapshot) =>
        setBlockedDates(
          snapshot.docs.map((item) => item.id)
        ),
      () => setBlockedDates([])
    );

    const notificationQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.id)
    );

    const unsubNotifications = onSnapshot(
      notificationQuery,
      (snapshot) =>
        setAppointmentNotifications(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data()
            }))
            .filter(
              (item) =>
                item.read === false &&
                item.appointmentId
            )
        ),
      () => setAppointmentNotifications([])
    );

    return () => {
      unsubAppointments();
      unsubBlocked();
      unsubNotifications();
    };
  }, [user?.id, user?.role]);

  const checkAppointmentSlot = (
    date,
    time,
    excludeId = null
  ) => {
    if (!date) {
      return "date";
    }

    if (date < todayISO()) {
      return "past";
    }

    if (blockedDates.includes(date)) {
      return "blocked";
    }

    const occupied = appointments.some(
      (item) =>
        item.id !== excludeId &&
        item.date === date &&
        item.time === time &&
        item.status !== "Cancelled"
    );

    if (occupied) {
      return "time";
    }

    return null;
  };

  const addAppointment = async (data) => {
    const error = checkAppointmentSlot(
      data.date,
      data.time
    );

    if (error) {
      return { error };
    }

    const client = await getDoc(
      doc(db, "users", data.clientId)
    );

    const clientName = client.exists()
      ? client.data().name
      : "Client";

    const clientPhone = client.exists()
      ? client.data().contactNumber
      : "";

    const result = await addDoc(
      collection(db, "appointments"),
      {
        ...data,
        clientName,
        status: "Approved",
        createdBy: user?.id || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    const message = `Your AGRIhelp appointment is approved for ${data.date} at ${data.time}. ${data.title}`;

    await addDoc(
      collection(db, "notifications"),
      {
        userId: data.clientId,
        title: "Appointment approved",
        message,
        appointmentId: result.id,
        read: false,
        createdAt: serverTimestamp()
      }
    );

    if (clientPhone) {
      try {
        await sendSemaphoreSMS({
          phoneNumber: clientPhone,
          message: `AGRIhelp: ${message}`
        });
      } catch {}
    }

    return {
      id: result.id,
      ...data,
      status: "Approved"
    };
  };

  const deleteAppointment = async (id) => {
    await deleteDoc(
      doc(db, "appointments", id)
    );
  };

  const updateAppointment = async (
    id,
    patch
  ) => {
    const current = appointments.find(
      (item) => item.id === id
    );

    if (!current) {
      return {
        error: "not-found"
      };
    }

    const newDate =
      patch.date !== undefined
        ? patch.date
        : current.date;

    const newTime =
      patch.time !== undefined
        ? patch.time
        : current.time;

    const slotError = checkAppointmentSlot(
      newDate,
      newTime,
      id
    );

    if (slotError) {
      return {
        error: slotError
      };
    }

    await updateDoc(
      doc(db, "appointments", id),
      {
        ...patch,
        updatedAt: serverTimestamp()
      }
    );

    return {
      success: true
    };
  };

  const toggleBlocked = async (date) => {
    if (!date) {
      return {
        error: "date"
      };
    }

    const ref = doc(
      db,
      "blockedDates",
      date
    );

    if (blockedDates.includes(date)) {
      await deleteDoc(ref);

      return {
        success: true,
        action: "available"
      };
    }

    if (date < todayISO()) {
      return {
        error: "past"
      };
    }

    const hasAppointment = appointments.some(
      (item) =>
        item.date === date &&
        item.status !== "Cancelled"
    );

    if (hasAppointment) {
      return {
        error: "appointment"
      };
    }

    await setDoc(ref, {
      date,
      createdBy: user?.id || "",
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      action: "blocked"
    };
  };

  const unreadAppointmentCount =
    appointmentNotifications.length;

  const markAppointmentNotificationsAsRead =
    async () => {
      if (
        !firebaseConfigured ||
        !db ||
        !user?.id
      ) {
        return;
      }

      await Promise.all(
        appointmentNotifications.map(
          (notification) =>
            updateDoc(
              doc(
                db,
                "notifications",
                notification.id
              ),
              {
                read: true
              }
            )
        )
      );
    };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        blockedDates,
        addAppointment,
        deleteAppointment,
        updateAppointment,
        toggleBlocked,
        appointmentNotifications,
        unreadAppointmentCount,
        markAppointmentNotificationsAsRead
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export const useAppointments = () =>
  useContext(AppointmentContext);