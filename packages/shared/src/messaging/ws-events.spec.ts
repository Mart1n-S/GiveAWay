import { WsEvents } from "./ws-events";

describe("WsEvents", () => {
  it("expose tous les événements client→server", () => {
    expect(WsEvents.CLIENT_JOIN_CONVERSATION).toBe("conversation:join");
    expect(WsEvents.CLIENT_LEAVE_CONVERSATION).toBe("conversation:leave");
    expect(WsEvents.CLIENT_SEND_MESSAGE).toBe("message:send");
    expect(WsEvents.CLIENT_MARK_READ).toBe("message:markRead");
  });

  it("expose tous les événements server→client", () => {
    expect(WsEvents.SERVER_MESSAGE_NEW).toBe("message:new");
    expect(WsEvents.SERVER_MESSAGE_READ).toBe("message:read");
    expect(WsEvents.SERVER_CONVERSATION_UPDATED).toBe("conversation:updated");
    expect(WsEvents.SERVER_UNREAD_COUNT).toBe("unread:count");
    expect(WsEvents.SERVER_ERROR).toBe("error");
  });

  it("garantit l'unicité des noms d'événements", () => {
    const values = Object.values(WsEvents);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
