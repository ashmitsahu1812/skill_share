const socketIo = require('socket.io');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // handled by express cors in a real prod app, but for simplicity here
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins their own room to receive private notifications/messages
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
    });

    // User joins a specific conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    // Handle incoming messages
    socket.on('send_message', async (data) => {
      const { conversationId, senderId, text, receiverId } = data;

      try {
        const message = await Message.create({
          conversationId,
          sender: senderId,
          text
        });

        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: { text, sender: senderId, createdAt: message.createdAt },
            // increment unread count for receiver would go here in a full app
          },
          { new: true }
        );

        // Broadcast to the conversation room
        io.to(`conv_${conversationId}`).emit('new_message', message);
        
        // Also notify the receiver directly in case they are not in the conversation room
        io.to(`user_${receiverId}`).emit('message_notification', {
          conversationId,
          message
        });

      } catch (err) {
        console.error('Socket message error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIo };
