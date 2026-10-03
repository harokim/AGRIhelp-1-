import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { Avatar } from "./ClientMessages";

export default function EngineerMessages() {
  const { user, users } = useAuth();
  const {
    messages,
    sendMessage,
    unsendMessage
  } = useMessages();

  const clients = users.filter(
    (item) =>
      item.role === "client" &&
      item.status !== "inactive"
  );

  const [selected, setSelected] = useState(
    clients[0]?.id || ""
  );

  const [text, setText] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  useEffect(() => {
    if (
      selected &&
      clients.some((client) => client.id === selected)
    ) {
      return;
    }

    setSelected(clients[0]?.id || "");
  }, [clients, selected]);

  const filteredClients = useMemo(() => {
    const searchValue = clientSearch
      .trim()
      .toLowerCase();

    return clients.filter((client) => {
      if (!searchValue) return true;

      return `${client.name || ""} ${
        client.email || ""
      } ${client.association || ""}`
        .toLowerCase()
        .includes(searchValue);
    });
  }, [clients, clientSearch]);

  const peer = clients.find(
    (client) => client.id === selected
  );

  const thread = useMemo(() => {
    if (!peer) return [];

    const searchValue = messageSearch
      .trim()
      .toLowerCase();

    return messages
      .filter(
        (message) =>
          (message.from === user.id &&
            message.to === peer.id) ||
          (message.from === peer.id &&
            message.to === user.id)
      )
      .filter((message) =>
        searchValue
          ? String(message.text || "")
              .toLowerCase()
              .includes(searchValue)
          : true
      );
  }, [
    messages,
    user?.id,
    peer?.id,
    messageSearch
  ]);

  const submit = async (event) => {
    event.preventDefault();

    if (!peer || !text.trim()) return;

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

  const handleUnsend = async (messageId) => {
    const confirmed = window.confirm(
      "Unsend this message?"
    );

    if (!confirmed) return;

    try {
      await unsendMessage(messageId);
    } catch (error) {
      alert(
        error?.message ||
          "The message could not be unsent."
      );
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">MESSENGER</span>

          <h1>Client messages</h1>

          <p>
            Pick a client and switch conversations whenever
            you need.
          </p>
        </div>
      </div>

      <div className="messenger-layout card">
        <aside className="conversation-list">
          <div className="conversation-title">
            <strong>Clients</strong>
            <span>{clients.length}</span>
          </div>

          <div className="conversation-search">
            <input
              type="search"
              value={clientSearch}
              onChange={(event) =>
                setClientSearch(event.target.value)
              }
              placeholder="Search clients..."
            />
          </div>

          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <button
                type="button"
                className={
                  selected === client.id
                    ? "conversation-item selected"
                    : "conversation-item"
                }
                key={client.id}
                onClick={() => {
                  setSelected(client.id);
                  setMessageSearch("");
                }}
              >
                <Avatar u={client} />

                <span className="conversation-info">
                  <strong>{client.name}</strong>

                  <small>
                    {client.association || "Client"}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <div className="conversation-empty">
              No clients found.
            </div>
          )}
        </aside>

        <section className="chat-pane">
          {peer ? (
            <>
              <div className="chat-head">
                <Avatar u={peer} />

                <div className="chat-person">
                  <strong>{peer.name}</strong>

                  <span>
                    {peer.association || "Client"}
                  </span>
                </div>
              </div>

              <div className="message-search">
                <input
                  type="search"
                  value={messageSearch}
                  onChange={(event) =>
                    setMessageSearch(event.target.value)
                  }
                  placeholder="Search messages..."
                />
              </div>

              <div className="chat-body">
                {thread.length > 0 ? (
                  thread.map((message) => {
                    const mine =
                      message.from === user.id ||
                      message.senderId === user.id;

                    return (
                      <div
                        key={message.id}
                        className={`message-bubble-row ${
                          mine
                            ? "message-bubble-mine"
                            : ""
                        }`}
                      >
                        <div
                          className={`bubble ${
                            mine
                              ? "mine"
                              : "theirs"
                          }`}
                        >
                          <p>{message.text}</p>

                          {mine && (
                            <button
                              type="button"
                              className="unsend-message-btn"
                              onClick={() =>
                                handleUnsend(
                                  message.id
                                )
                              }
                            >
                              Unsend
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <strong>
                      {messageSearch
                        ? "No matching messages"
                        : "No messages yet"}
                    </strong>

                    <span>
                      {messageSearch
                        ? "Try another search."
                        : "Start the conversation with this client."}
                    </span>
                  </div>
                )}
              </div>

              <form
                className="message-compose"
                onSubmit={submit}
              >
                <input
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                  placeholder="Write a message..."
                />

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <strong>Select a client</strong>

              <span>
                Choose a client from the list to open the
                conversation.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}