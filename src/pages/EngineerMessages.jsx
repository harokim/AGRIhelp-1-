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

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
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

  useEffect(() => {
    if (!selected && clients.length > 0) {
      setSelected(clients[0].id);
    }

    if (
      selected &&
      !clients.some(
        (client) => client.id === selected
      )
    ) {
      setSelected(clients[0]?.id || "");
    }
  }, [clients, selected]);

  const filteredClients = clients.filter((client) =>
    `${client.name || ""} ${
      client.email || ""
    } ${client.association || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const peer = clients.find(
    (item) => item.id === selected
  );

  const thread = peer
    ? messages.filter(
        (message) =>
          (message.from === user.id &&
            message.to === peer.id) ||
          (message.from === peer.id &&
            message.to === user.id)
      )
    : [];

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
    if (!selected) return;

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
  }, [selected]);

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
          <span className="eyebrow">
            MESSENGER
          </span>

          <h1>Messages</h1>

          <p>
            Communicate directly with
            registered clients.
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
              <span>
                {clients.length}
              </span>
            )}
          </div>

          <div className="ig-search">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search"
            />
          </div>

          <div className="ig-conversation-list">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const unreadCount =
                  getUnreadConversationCount
                    ? getUnreadConversationCount(
                        client.id
                      )
                    : messages.filter(
                        (message) =>
                          message.from ===
                            client.id &&
                          message.to ===
                            user.id &&
                          message.read === false
                      ).length;

                return (
                  <button
                    type="button"
                    key={client.id}
                    className={`ig-conversation ${
                      selected === client.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectClient(
                        client.id
                      )
                    }
                  >
                    <Avatar u={client} />

                    <span className="ig-conversation-info">
                      <strong>
                        {client.name}
                      </strong>

                      <small>
                        {client.association ||
                          client.email}
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
                No clients found.
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
                  <strong>
                    {peer.name}
                  </strong>

                  <span>
                    {peer.association ||
                      "Client"}
                  </span>
                </div>
              </header>

              <div className="ig-chat-body">
                <div className="ig-profile-intro">
                  <Avatar
                    u={peer}
                    small
                  />

                  <strong>
                    {peer.name}
                  </strong>

                  <span>
                    {peer.email}
                  </span>
                </div>

                {thread.length === 0 ? (
                  <div className="ig-no-messages">
                    <div className="ig-message-icon">
                      ✉
                    </div>

                    <strong>
                      Start a conversation
                    </strong>

                    <span>
                      Send a message to this
                      client.
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
                      {message.from !==
                        user.id && (
                        <Avatar
                          u={peer}
                          small
                        />
                      )}

                      <div>
                        <div className="ig-bubble">
                          {message.text}
                        </div>

                        <small className="ig-time">
                          {messageTime(
                            message.createdAt
                          )}
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
                    setText(
                      event.target.value
                    )
                  }
                  placeholder="Message..."
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
              <div className="ig-message-icon">
                ✉
              </div>

              <strong>
                Select a conversation
              </strong>

              <span>
                Choose a client to start
                messaging.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

