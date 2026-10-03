import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { initials } from "../utils";

export function Avatar({ u }) {
  return (
    <div className="avatar">
      {u?.avatar ? (
        <img src={u.avatar} alt="" />
      ) : (
        initials(u?.name || u?.email || "User")
      )}
    </div>
  );
}

export default function ClientMessages() {
  const { user, users } = useAuth();
  const { messages, sendMessage, unsendMessage } = useMessages();

  const [text, setText] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  const peer = users.find(
    (item) =>
      item.role === "engineer" &&
      item.status !== "inactive"
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
          <h1>Messages</h1>
          <p>
            Direct conversation with the Municipal Agricultural
            and Biosystems Engineer.
          </p>
        </div>
      </div>

      <div className="messenger card">
        {peer ? (
          <>
            <div className="chat-head">
              <Avatar u={peer} />

              <div className="chat-person">
                <strong>{peer.name}</strong>
                <span>
                  {peer.profileBio || "Engineer"}
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
                        mine ? "message-bubble-mine" : ""
                      }`}
                    >
                      <div
                        className={`bubble ${
                          mine ? "mine" : "theirs"
                        }`}
                      >
                        <p>{message.text}</p>

                        {mine && (
                          <button
                            type="button"
                            className="unsend-message-btn"
                            onClick={() =>
                              handleUnsend(message.id)
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
                      : "Send a message to the engineer."}
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
            <strong>
              No engineer account is available yet.
            </strong>

            <span>
              Please contact the system administrator.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}