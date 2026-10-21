const initSocketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join doctor's consultation queue room
    socket.on('join:doctor_queue', ({ doctorId }) => {
      if (doctorId) {
        socket.join(`doctor_${doctorId}`);
        console.log(`[Socket.IO] ${socket.id} joined room doctor_${doctorId}`);
      }
    });

    // Join patient's personal appointment tracking room
    socket.on('join:patient_queue', ({ appointmentId }) => {
      if (appointmentId) {
        socket.join(`appointment_${appointmentId}`);
        console.log(`[Socket.IO] ${socket.id} joined room appointment_${appointmentId}`);
      }
    });

    // Join hospital waiting hall display room
    socket.on('join:hospital_queue', ({ hospitalId }) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
        console.log(`[Socket.IO] ${socket.id} joined room hospital_${hospitalId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSocketIO };
