'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

interface Conversation {
  _id: string;
  participants: { _id: string; displayName: string; photoURL: string }[];
  lastMessage?: { text: string; sender: { _id: string; displayName: string }; createdAt: string };
  updatedAt: string;
}

interface Message {
  _id: string;
  sender: { _id: string; displayName: string; photoURL: string };
  text: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket
  useEffect(() => {
    if (!user) return;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    
    // Connect to socket server
    const newSocket = io(backendUrl, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_user_room', user._id);
    });

    newSocket.on('message_notification', (data: any) => {
      if (!activeConv || activeConv._id !== data.conversationId) {
        // Just show toast for background message
        toast(`New message from ${data.message.sender.displayName}`);
        fetchConversations();
      }
    });

    return () => { newSocket.disconnect(); };
  }, [user]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    try {
      const data = await api.get<Conversation[]>('/api/messages/conversations');
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv || !user || !socket) return;
    
    const loadMessages = async () => {
      try {
        const data = await api.get<Message[]>(`/api/messages/${activeConv._id}`);
        setMessages(data);
        socket.emit('join_conversation', activeConv._id);
      } catch (err) {
        toast.error('Could not load messages');
      }
    };
    loadMessages();

    const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      fetchConversations();
    };

    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [activeConv, user, socket]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !user || !socket) return;
    
    const targetParticipant = activeConv.participants.find(p => p._id !== user._id);
    if (!targetParticipant) return;

    socket.emit('send_message', {
      conversationId: activeConv._id,
      senderId: user._id,
      receiverId: targetParticipant._id,
      text: newMessage.trim(),
    });
    
    setNewMessage('');
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8" style={{ height: 'calc(100vh - var(--header-height) - 40px)' }}>
      <div className="card" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        
        {/* Sidebar - Conversation List */}
        <div style={{ width: '320px', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Messages</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No messages yet.</div>
            ) : (
              conversations.map(conv => {
                const otherUser = conv.participants.find(p => p._id !== user._id);
                if (!otherUser) return null;
                const isActive = activeConv?._id === conv._id;
                
                return (
                  <div
                    key={conv._id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isActive ? 'var(--bg-glass-light)' : 'transparent',
                      transition: 'background 0.2s',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center'
                    }}
                  >
                    <img src={otherUser.photoURL || '/placeholder-avatar.png'} alt="Avatar" className="avatar avatar-md" />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{otherUser.displayName}</div>
                      <div className="truncate-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {conv.lastMessage?.text || 'New conversation'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)' }}>
                {(() => {
                  const otherUser = activeConv.participants.find(p => p._id !== user._id);
                  return (
                    <>
                      <img src={otherUser?.photoURL || '/placeholder-avatar.png'} alt="Avatar" className="avatar avatar-sm" />
                      <strong style={{ fontSize: 16 }}>{otherUser?.displayName}</strong>
                    </>
                  );
                })()}
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, i) => {
                  const isMe = msg.sender._id === user._id;
                  return (
                    <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-lg)',
                        background: isMe ? 'var(--gradient-brand)' : 'var(--bg-secondary)',
                        color: isMe ? '#fff' : 'var(--text-primary)',
                        borderBottomRightRadius: isMe ? 4 : 'var(--radius-lg)',
                        borderBottomLeftRadius: !isMe ? 4 : 'var(--radius-lg)',
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} style={{ padding: 20, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
