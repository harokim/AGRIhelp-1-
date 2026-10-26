import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { Avatar } from "./ClientMessages";

function messageTime(value) {
  if (!value) return "";

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila"
  });
}

function messageTimestamp(message) {
  if (!message?.createdAt) return 0;

  const date = message.createdAt?.toDate
    ? message.createdAt.toDate()
    : new Date(message.createdAt);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

export default function EngineerMessages() {
  const { user, users } = useAuth();

  const {
    messages,
    sendMessage,
    markConversationAsRead,
    getUnreadConversationCount,
    unreadMessageCount
  } = useMessages();

  const clients = useMemo(
    () =>
      users.filter(
        (item) =>
          item.role === "client" &&
          item.status !== "inactive"
      ),
    [users]
  );

  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");

  const sortedClients = useMemo(() => {
    return [...clients].sort((firstClient, secondClient) => {
      const firstLatest = messages
        .filter(
          (message) =>
            (
              message.from === user?.id &&
              message.to === firstClient.id
            ) ||
            (
              message.from === firstClient.id &&
              message.to === user?.id
            )
        )
        .reduce(
          (latest, message) =>
            messageTimestamp(message) >
            messageTimestamp(latest)
              ? message
              : latest,
          null
        );

      const secondLatest = messages
        .filter(
          (message) =>
            (
              message.from === user?.id &&
              message.to === secondClient.id
            ) ||
            (
              message.from === secondClient.id &&
              message.to === user?.id
            )
        )
        .reduce(
          (latest, message) =>
            messageTimestamp(message) >
            messageTimestamp(latest)
              ? message
              : latest,
          null
        );

      return (
        messageTimestamp(secondLatest) -
        messageTimestamp(firstLatest)
      );
    });
  }, [clients, messages, user?.id]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return sortedClients;
    }

    return sortedClients.filter((client) => {
      const profileMatches = [
        client.name,
        client.email,
        client.association,
        client.profileBio,
        client.contactNumber
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );

      if (profileMatches) {
        return true;
      }

      return messages.some((message) => {
        const belongsToConversation =
          (
            message.from === user?.id &&
            message.to === client.id
          ) ||
          (
            message.from === client.id &&
            message.to === user?.id
          );

        return (
          belongsToConversation &&
          String(message.text || "").toLowerCase().includes(term)
        );
      });
    });
  }, [sortedClients, messages, user?.id, search]);

  useEffect(() => {
    if (!selected && sortedClients.length > 0) {
      setSelected(sortedClients[0].id);
    }

    if (
      selected &&
      !sortedClients.some((client) => client.id === selected)
    ) {
      setSelected(sortedClients[0]?.id || "");
    }
  }, [sortedClients, selected]);

  const peer = sortedClients.find(
    (item) => item.id === selected
  );

  const thread = useMemo(() => {
    if (!peer || !user?.id) {
      return [];
    }

    return messages
      .filter(
        (message) =>
          (
            message.from === user.id &&
            message.to === peer.id
          ) ||
          (
            message.from === peer.id &&
            message.to === user.id
          )
      )
      .sort(
        (a, b) =>
          messageTimestamp(a) - messageTimestamp(b)
      );
  }, [messages, peer?.id, user?.id]);

  const handleSelectClient = async (clientId) => {
    setSelected(clientId);

    try {
      await markConversationAsRead(clientId);
    } catch (error) {
      console.error(
        "Unable to mark conversation as read:",
        error
      );
    }
  };

  useEffect(() => {
    if (!selected || !user?.id) return;

    const selectedClientExists = clients.some(
      (client) => client.id === selected
    );

    if (!selectedClientExists) return;

    const markSelectedConversation = async () => {
      try {
        await markConversationAsRead(selected);
      } catch (error) {
        console.error(
          "Unable to mark conversation as read:",
          error
        );
      }
    };

    markSelectedConversation();
  }, [selected, clients, user?.id, markConversationAsRead]);

  const submit = async (event) => {
    event.preventDefault();

    if (!peer || !text.trim()) {
      return;
    }

    try {
      await sendMessage(
        user.id,
        peer.id,
        text.trim()
      );

      setText("");
    } catch (error) {
      alert(
        error?.message ||
          "The message could not be sent."
      );
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">MESSENGER</span>

          <h1>Messages</h1>

          <p>
            Communicate directly with registered clients.
          </p>
        </div>
      </div>

      <div className="ig-messenger">
        <aside className="ig-sidebar">
          <div className="ig-sidebar-header">
            <strong>Messages</strong>

            {unreadMessageCount > 0 ? (
              <span className="ig-unread-total">
                {unreadMessageCount > 99
                  ? "99+"
                  : unreadMessageCount}
              </span>
            ) : (
              <span>{filteredClients.length}</span>
            )}
          </div>

          <div className="messenger-search">
            <span
              className="messenger-search-icon"
              aria-hidden="true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search clients or messages..."
              aria-label="Search clients and messages"
            />

            {search && (
              <button
                type="button"
                className="messenger-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="ig-conversation-list">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const unreadCount =
                  getUnreadConversationCount
                    ? getUnreadConversationCount(client.id)
                    : messages.filter(
                        (message) =>
                          message.from === client.id &&
                          message.to === user?.id &&
                          message.read === false
                      ).length;

                const latestMessage = messages
                  .filter(
                    (message) =>
                      (
                        message.from === user?.id &&
                        message.to === client.id
                      ) ||
                      (
                        message.from === client.id &&
                        message.to === user?.id
                      )
                  )
                  .reduce(
                    (latest, message) =>
                      messageTimestamp(message) >
                      messageTimestamp(latest)
                        ? message
                        : latest,
                    null
                  );

                return (
                  <button
                    type="button"
                    key={client.id}
                    className={`ig-conversation ${
                      selected === client.id ? "active" : ""
                    }`}
                    onClick={() =>
                      handleSelectClient(client.id)
                    }
                  >
                    <Avatar u={client} />

                    <span className="ig-conversation-info">
                      <strong>
                        {client.name || "Client"}
                      </strong>

                      <small>
                        {latestMessage?.text ||
                          client.association ||
                          client.email ||
                          "Client"}
                      </small>
                    </span>

                    {unreadCount > 0 && (
                      <span className="ig-unread-badge">
                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="ig-empty-sidebar">
                {search.trim()
                  ? "No clients or messages match your search."
                  : "No clients found."}
              </div>
            )}
          </div>
        </aside>

        <section className="ig-chat">
          {peer ? (
            <>
              <header className="ig-chat-header">
                <Avatar u={peer} />

                <div>
                  <strong>{peer.name || "Client"}</strong>

                  <span>
                    {peer.association || "Client"}
                  </span>
                </div>
              </header>

              <div className="ig-chat-body">
                <div className="ig-profile-intro">
                  <Avatar u={peer} small />

                  <strong>{peer.name || "Client"}</strong>

                  <span>{peer.email || "Client account"}</span>

                  {peer.contactNumber && (
                    <small>{peer.contactNumber}</small>
                  )}

                  {peer.association && (
                    <small>{peer.association}</small>
                  )}
                </div>

                {thread.length === 0 ? (
                  <div className="ig-no-messages">
                    <div className="ig-message-icon">✉</div>

                    <strong>Start a conversation</strong>

                    <span>
                      Send a message to this client.
                    </span>
                  </div>
                ) : (
                  thread.map((message) => (
                    <div
                      key={message.id}
                      className={`ig-message-row ${
                        message.from === user.id
                          ? "mine"
                          : "theirs"
                      }`}
                    >
                      {message.from !== user.id && (
                        <Avatar u={peer} small />
                      )}

                      <div>
                        <div className="ig-bubble">
                          {message.text}
                        </div>

                        <small className="ig-time">
                          {messageTime(message.createdAt)}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                className="ig-compose"
                onSubmit={submit}
              >
                <input
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                  placeholder="Message..."
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={!text.trim()}
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="ig-no-messages">
              <div className="ig-message-icon">✉</div>

              <strong>Select a conversation</strong>

              <span>
                Choose a client to start messaging.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}