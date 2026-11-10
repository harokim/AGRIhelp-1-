
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  db,
  firebaseConfigured
} from "../firebase";
import {
  sendSemaphoreSMS
} from "../services/semaphoreService";
import {
  todayISO
} from "../utils";
import {
  useAuth
} from "./AuthContext";

const AppointmentContext = createContext(null);

export function AppointmentProvider({ children }) {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [fullyBookedDates, setFullyBookedDates] = useState([]);
  const [appointmentNotifications, setAppointmentNotifications] =
    useState([]);

  useEffect(() => {
    if (!firebaseConfigured || !db || !user?.id) {
      setAppointments([]);
      setBlockedDates([]);
      setFullyBookedDates([]);
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
      (snapshot) => {
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
        );
      },
      (error) => {
        console.error(
          "Appointment listener failed:",
          error
        );
        setAppointments([]);
      }
    );

    const unsubBlocked = onSnapshot(
      collection(db, "blockedDates"),
      (snapshot) => {
        setBlockedDates(
          snapshot.docs.map((item) => item.id)
        );
      },
      (error) => {
        console.error(
          "Blocked dates listener failed:",
          error
        );
        setBlockedDates([]);
      }
    );

    const unsubFullyBooked = onSnapshot(
      collection(db, "fullyBookedDates"),
      (snapshot) => {
        setFullyBookedDates(
          snapshot.docs.map((item) => item.id)
        );
      },
      (error) => {
        console.error(
          "Fully booked dates listener failed:",
          error
        );
        setFullyBookedDates([]);
      }
    );

    const notificationQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.id)
    );

    const unsubNotifications = onSnapshot(
      notificationQuery,
      (snapshot) => {
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
        );
      },
      (error) => {
        console.error(
          "Appointment notifications listener failed:",
          error
        );
        setAppointmentNotifications([]);
      }
    );

    return () => {
      unsubAppointments();
      unsubBlocked();
      unsubFullyBooked();
      unsubNotifications();
    };
  }, [user?.id, user?.role]);

  // Only engineers are permitted to remove expired appointments.
  useEffect(() => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user?.role !== "engineer" ||
      appointments.length === 0
    ) {
      return;
    }

    const today = todayISO();

    const expiredAppointments = appointments.filter(
      (appointment) =>
        appointment.date &&
        appointment.date < today
    );

    if (expiredAppointments.length === 0) {
      return;
    }

    Promise.allSettled(
      expiredAppointments.map((appointment) =>
        deleteDoc(
          doc(db, "appointments", appointment.id)
        )
      )
    ).then((results) => {
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "Expired appointment cleanup failed:",
            result.reason
          );
        }
      });
    });
  }, [
    appointments,
    user?.id,
    user?.role
  ]);

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

    if (fullyBookedDates.includes(date)) {
      return "fully-booked";
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
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user.role !== "engineer"
    ) {
      throw new Error(
        "Only an authorized engineer can create appointments."
      );
    }

    if (
      !data?.clientId ||
      !data?.date ||
      !data?.time ||
      !data?.title?.trim()
    ) {
      return {
        error: "required"
      };
    }

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

    if (
      !client.exists() ||
      client.data().role !== "client" ||
      client.data().status !== "active"
    ) {
      return {
        error: "client"
      };
    }

    const clientName =
      client.data().name || "Client";

    const clientPhone =
      client.data().contactNumber || "";

    // Save the appointment first.
    const result = await addDoc(
      collection(db, "appointments"),
      {
        ...data,
        title: data.title.trim(),
        clientName,
        status: "Approved",
        createdBy: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    const message =
      `Your AGRIhelp appointment is approved for ${data.date} at ${data.time}. ${data.title.trim()}`;

    // Notification delivery is independent of appointment creation.
    let notificationSent = false;

    try {
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

      notificationSent = true;
    } catch (notificationError) {
      console.error(
        "Appointment was saved, but notification delivery failed:",
        notificationError
      );
    }

    // SMS delivery is also independent.
    let smsSent = false;

    if (clientPhone) {
      try {
        await sendSemaphoreSMS({
          phoneNumber: clientPhone,
          message: `AGRIhelp: ${message}`
        });

        smsSent = true;
      } catch (smsError) {
        console.error(
          "Appointment was saved, but SMS delivery failed:",
          smsError
        );
      }
    }

    return {
      id: result.id,
      ...data,
      clientName,
      status: "Approved",
      notificationSent,
      smsSent
    };
  };

  const deleteAppointment = async (id) => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user.role !== "engineer"
    ) {
      throw new Error(
        "Only an authorized engineer can delete appointments."
      );
    }

    if (!id) {
      return {
        error: "not-found"
      };
    }

    await deleteDoc(
      doc(db, "appointments", id)
    );

    return {
      success: true
    };
  };

  const updateAppointment = async (
    id,
    patch
  ) => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user.role !== "engineer"
    ) {
      throw new Error(
        "Only an authorized engineer can update appointments."
      );
    }

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
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user.role !== "engineer"
    ) {
      throw new Error(
        "Only an authorized engineer can manage availability."
      );
    }

    if (!date) {
      return {
        error: "date"
      };
    }

    if (date < todayISO()) {
      return {
        error: "past"
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

    if (fullyBookedDates.includes(date)) {
      return {
        error: "fully-booked"
      };
    }

    const appointmentsOnDate = await getDocs(
      query(
        collection(db, "appointments"),
        where("date", "==", date)
      )
    );

    const activeAppointments =
      appointmentsOnDate.docs.filter(
        (appointment) =>
          appointment.data().status !== "Cancelled"
      );

    if (activeAppointments.length > 0) {
      return {
        error: "appointment"
      };
    }

    await setDoc(ref, {
      date,
      createdBy: user.id,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      action: "blocked"
    };
  };

  const toggleFullyBooked = async (date) => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id ||
      user.role !== "engineer"
    ) {
      throw new Error(
        "Only an authorized engineer can manage availability."
      );
    }

    if (!date) {
      return {
        error: "date"
      };
    }

    if (date < todayISO()) {
      return {
        error: "past"
      };
    }

    if (blockedDates.includes(date)) {
      return {
        error: "blocked"
      };
    }

    const ref = doc(
      db,
      "fullyBookedDates",
      date
    );

    if (fullyBookedDates.includes(date)) {
      await deleteDoc(ref);

      return {
        success: true,
        action: "available"
      };
    }

    const appointmentsOnDate = await getDocs(
      query(
        collection(db, "appointments"),
        where("date", "==", date)
      )
    );

    const activeAppointments =
      appointmentsOnDate.docs.filter(
        (appointment) =>
          appointment.data().status !== "Cancelled"
      );

    if (activeAppointments.length === 0) {
      return {
        error: "appointment"
      };
    }

    await setDoc(ref, {
      date,
      createdBy: user.id,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      action: "fully-booked"
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
        fullyBookedDates,
        addAppointment,
        deleteAppointment,
        updateAppointment,
        toggleBlocked,
        toggleFullyBooked,
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
