import { MessagingEvents } from './messaging.events';
import { WsEvents } from '@repo/shared';

describe('MessagingEvents', () => {
  let events: MessagingEvents;
  let chain: { to: jest.Mock; emit: jest.Mock };

  beforeEach(() => {
    events = new MessagingEvents();
    chain = {
      to: jest.fn(),
      emit: jest.fn(),
    };
    chain.to.mockReturnValue(chain);
  });

  it('broadcastNewMessage est no-op sans serveur', () => {
    expect(() =>
      events.broadcastNewMessage(1, 10, 20, {
        id: 1,
        conversationId: 1,
        senderId: 10,
        content: 'x',
        createdAt: '2026-01-01T10:00:00Z',
        readAt: null,
      }),
    ).not.toThrow();
  });

  it('broadcastNewMessage cible les deux user rooms et émet 2 events', () => {
    const fakeServer = {
      to: chain.to,
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);

    const msg = {
      id: 1,
      conversationId: 1,
      senderId: 10,
      content: 'x',
      createdAt: '2026-01-01T10:00:00Z',
      readAt: null,
    };
    events.broadcastNewMessage(1, 10, 20, msg);

    expect(chain.to).toHaveBeenCalledWith('user:10');
    expect(chain.to).toHaveBeenCalledWith('user:20');
    expect(chain.emit).toHaveBeenCalledWith(WsEvents.SERVER_MESSAGE_NEW, {
      conversationId: 1,
      message: msg,
    });
    expect(chain.emit).toHaveBeenCalledWith(
      WsEvents.SERVER_CONVERSATION_UPDATED,
      { conversationId: 1, lastMessageAt: msg.createdAt },
    );
  });

  it('broadcastMessageRead émet à tous les expéditeurs', () => {
    const fakeServer = {
      to: chain.to,
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);

    const readAt = new Date('2026-01-01T11:00:00Z');
    events.broadcastMessageRead(1, 5, [10, 20], [100, 101], readAt);

    expect(chain.to).toHaveBeenCalledWith('user:10');
    expect(chain.to).toHaveBeenCalledWith('user:20');
    expect(chain.emit).toHaveBeenCalledWith(WsEvents.SERVER_MESSAGE_READ, {
      conversationId: 1,
      messageIds: [100, 101],
      readAt: readAt.toISOString(),
      readerId: 5,
    });
  });

  it('broadcastConversationDeleted cible la room du user et inclut reason', () => {
    const fakeServer = {
      to: chain.to,
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);

    events.broadcastConversationDeleted(42, 7, 'user_deleted');
    expect(chain.to).toHaveBeenCalledWith('user:42');
    expect(chain.emit).toHaveBeenCalledWith(
      WsEvents.SERVER_CONVERSATION_DELETED,
      { conversationId: 7, reason: 'user_deleted' },
    );
  });

  it('broadcastConversationDeleted sans reason omet la clé', () => {
    const fakeServer = {
      to: chain.to,
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);

    events.broadcastConversationDeleted(42, 7);
    expect(chain.emit).toHaveBeenCalledWith(
      WsEvents.SERVER_CONVERSATION_DELETED,
      { conversationId: 7 },
    );
  });

  it('broadcastConversationDeleted est no-op sans serveur', () => {
    expect(() =>
      events.broadcastConversationDeleted(42, 7, 'member_left'),
    ).not.toThrow();
  });

  it('sendUnreadCount cible la room du user', () => {
    const fakeServer = {
      to: chain.to,
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);

    events.sendUnreadCount(42, 7);
    expect(chain.to).toHaveBeenCalledWith('user:42');
    expect(chain.emit).toHaveBeenCalledWith(WsEvents.SERVER_UNREAD_COUNT, {
      count: 7,
    });
  });

  it('isUserInConversationRoom retourne false sans serveur', async () => {
    const res = await events.isUserInConversationRoom(1, 42);
    expect(res).toBe(false);
  });

  it('isUserInConversationRoom retourne true si user présent', async () => {
    const sockets = new Map<string, unknown>();
    sockets.set('sid-1', { data: { user: { id: 42 } } });
    const rooms = new Map<string, Set<string>>();
    rooms.set('conv:1', new Set(['sid-1']));
    // Namespace shape : adapter direct, sockets = Map<SocketId, Socket>
    const fakeServer = {
      to: chain.to,
      adapter: { rooms },
      sockets,
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);
    const res = await events.isUserInConversationRoom(1, 42);
    expect(res).toBe(true);
  });

  it('isUserInConversationRoom retourne false si user absent de la room', async () => {
    const sockets = new Map<string, unknown>();
    sockets.set('sid-1', { data: { user: { id: 99 } } });
    const rooms = new Map<string, Set<string>>();
    rooms.set('conv:1', new Set(['sid-1']));
    const fakeServer = {
      to: chain.to,
      adapter: { rooms },
      sockets,
    } as unknown as import('socket.io').Server;
    events.setServer(fakeServer);
    const res = await events.isUserInConversationRoom(1, 42);
    expect(res).toBe(false);
  });

  it('userRoom et conversationRoom produisent des noms cohérents', () => {
    expect(events.userRoom(42)).toBe('user:42');
    expect(events.conversationRoom(7)).toBe('conv:7');
  });
});
