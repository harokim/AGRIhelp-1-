import {
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { initials } from "../utils";

export function Avatar({
  u,
  small = false
}) {
  return (
    <div
      className={`ig-avatar ${
        small ? "small" : ""
      }`}
    >
      {u?.avatar ? (
        <img
          src={u.avatar}
          alt=""
        />
      ) : (
        initials(
          u?.name ||
            u?.email ||
            "User"
        )
      )}
    </div>
  );
}

function messageTime(value) {
  if (!value) {
    return "";
  }

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function messageTimestamp(
  message
) {
  if (!message?.createdAt) {
    return 0;
  }

  const date =
    message.createdAt?.toDate
      ? message.createdAt.toDate()
      : new Date(
          message.createdAt
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 0;
  }

  return date.getTime();
}

export default function ClientMessages() {
  const {
    user,
    users
  } = useAuth();

  const {
    messages,
    sendMessage,
    markConversationAsRead,
    getUnreadCountForUser
  } = useMessages();

  const [
    text,
    setText
  ] = useState("");

  const [
    selected,
    setSelected
  ] = useState("");

  const engineers = useMemo(
    () =>
      users.filter(
        (item) =>
          item.role ===
            "engineer" &&
          item.status !==
            "inactive"
      ),
    [users]
  );

  const sortedEngineers =
    useMemo(() => {
      return [...engineers].sort(
        (
          firstEngineer,
          secondEngineer
        ) => {
          const firstLatest =
            messages
              .filter(
                (message) =>
                  (
                    message.from ===
                      user?.id &&
                    message.to ===
                      firstEngineer.id
                  ) ||
                  (
                    message.from ===
                      firstEngineer.id &&
                    message.to ===
                      user?.id
                  )
              )
              .sort(
                (a, b) =>
                  messageTimestamp(
                    b
                  ) -
                  messageTimestamp(
                    a
                  )
              )[0];

          const secondLatest =
            messages
              .filter(
                (message) =>
                  (
                    message.from ===
                      user?.id &&
                    message.to ===
                      secondEngineer.id
                  ) ||
                  (
                    message.from ===
                      secondEngineer.id &&
                    message.to ===
                      user?.id
                  )
              )
              .sort(
                (a, b) =>
                  messageTimestamp(
                    b
                  ) -
                  messageTimestamp(
                    a
                  )
              )[0];

          return (
            messageTimestamp(
              secondLatest
            ) -
            messageTimestamp(
              firstLatest
            )
          );
        }
      );
    }, [
      engineers,
      messages,
      user?.id
    ]);

  useEffect(() => {
    if (
      !selected &&
      sortedEngineers.length >
        0
    ) {
      setSelected(
        sortedEngineers[0].id
      );
    }

    if (
      selected &&
      !sortedEngineers.some(
        (engineer) =>
          engineer.id ===
          selected
      )
    ) {
      setSelected(
        sortedEngineers[0]?.id ||
          ""
      );
    }
  }, [
    sortedEngineers,
    selected
  ]);

  const peer =
    sortedEngineers.find(
      (engineer) =>
        engineer.id ===
        selected
    );

  const thread = useMemo(() => {
    if (
      !user?.id ||
      !peer?.id
    ) {
      return [];
    }

    return messages
      .filter(
        (message) =>
          (
            message.from ===
              user.id &&
            message.to ===
              peer.id
          ) ||
          (
            message.from ===
              peer.id &&
            message.to ===
              user.id
          )
      )
      .sort(
        (a, b) =>
          messageTimestamp(a) -
          messageTimestamp(b)
      );
  }, [
    messages,
    peer?.id,
    user?.id
  ]);

  useEffect(() => {
    if (
      !peer?.id ||
      !user?.id
    ) {
      return;
    }

    const unreadCount =
      getUnreadCountForUser(
        peer.id
      );

    if (unreadCount > 0) {
      markConversationAsRead(
        peer.id
      ).catch(() => {});
    }
  }, [
    peer?.id,
    user?.id,
    getUnreadCountForUser,
    markConversationAsRead
  ]);

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !peer ||
      !text.trim()
    ) {
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
            Message the agricultural
            engineering office.
          </p>
        </div>
      </div>

      <div className="ig-messenger">
        <aside className="ig-sidebar">
          <div className="ig-sidebar-header">
            <strong>
              Messages
            </strong>

            <span>
              {sortedEngineers.length}
            </span>
          </div>

          <div className="ig-conversation-list">
            {sortedEngineers.length >
            0 ? (
              sortedEngineers.map(
                (engineer) => {
                  const latestMessage =
                    messages
                      .filter(
                        (message) =>
                          (
                            message.from ===
                              user?.id &&
                            message.to ===
                              engineer.id
                          ) ||
                          (
                            message.from ===
                              engineer.id &&
                            message.to ===
                              user?.id
                          )
                      )
                      .sort(
                        (a, b) =>
                          messageTimestamp(
                            b
                          ) -
                          messageTimestamp(
                            a
                          )
                      )[0];

                  const unreadCount =
                    getUnreadCountForUser(
                      engineer.id
                    );

                  return (
                    <button
                      type="button"
                      key={
                        engineer.id
                      }
                      className={`ig-conversation ${
                        selected ===
                        engineer.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setSelected(
                          engineer.id
                        )
                      }
                    >
                      <Avatar
                        u={
                          engineer
                        }
                      />

                      <span>
                        <strong>
                          {engineer.name ||
                            "Agricultural Engineer"}
                        </strong>

                        <small>
                          {latestMessage
                            ? latestMessage.text
                            : engineer.profileBio ||
                              engineer.email ||
                              "Agricultural Engineer"}
                        </small>
                      </span>

                      {unreadCount >
                        0 && (
                        <span className="ig-conversation-badge">
                          {unreadCount >
                          99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                }
              )
            ) : (
              <div className="ig-empty-sidebar">
                No engineer account is
                available.
              </div>
            )}
          </div>
        </aside>

        <section className="ig-chat">
          {peer ? (
            <>
              <header className="ig-chat-header">
                <Avatar
                  u={peer}
                />

                <div>
                  <strong>
                    {peer.name ||
                      "Agricultural Engineer"}
                  </strong>

                  <span>
                    {peer.profileBio ||
                      "Agricultural Engineer"}
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
                    {peer.name ||
                      "Agricultural Engineer"}
                  </strong>

                  <span>
                    {peer.email ||
                      "Agricultural Engineering Office"}
                  </span>

                  {peer.contactNumber && (
                    <small>
                      {
                        peer.contactNumber
                      }
                    </small>
                  )}

                  {peer.association && (
                    <small>
                      {
                        peer.association
                      }
                    </small>
                  )}
                </div>

                {thread.length ===
                0 ? (
                  <div className="ig-no-messages">
                    <div className="ig-message-icon">
                      ✉
                    </div>

                    <strong>
                      Start a conversation
                    </strong>

                    <span>
                      Send a message to
                      the agricultural
                      engineer.
                    </span>
                  </div>
                ) : (
                  thread.map(
                    (message) => (
                      <div
                        key={
                          message.id
                        }
                        className={`ig-message-row ${
                          message.from ===
                          user.id
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
                            {
                              message.text
                            }
                          </div>

                          <small className="ig-time">
                            {messageTime(
                              message.createdAt
                            )}
                          </small>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              <form
                className="ig-compose"
                onSubmit={submit}
              >
                <input
                  value={text}
                  onChange={(
                    event
                  ) =>
                    setText(
                      event.target.value
                    )
                  }
                  placeholder="Message..."
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={
                    !text.trim()
                  }
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
                Choose an engineer to
                start messaging.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

