const express = require('express')
const AWS = require('aws-sdk')
const cors = require('cors')
const http = require('http');
const { Server } = require('socket.io');


AWS.config.update({region: 'us-east-1'})

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const app = express()

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",  // Allow your client origin
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json())
app.use(cors())

const sessionParticipantsMap = {};

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); 
});
const userSocketMap = {};

io.on('connection', (socket) => {
  socket.on('joinSession', ({ user, sessionId }) => {
    userSocketMap[user] = socket.id;
    socket.join(sessionId);
    if (!sessionParticipantsMap[sessionId]) {
      sessionParticipantsMap[sessionId] = new Set();
    }
    sessionParticipantsMap[sessionId].add(user);
    console.log(`User ${user} joined session ${sessionId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
    Object.keys(userSocketMap).forEach(user => {
      if (userSocketMap[user] === socket.id) {
        delete userSocketMap[user];
      }
    });
  });
});

function findOtherUserInSession(currentUser) {
    if(currentUser == 'user1') {
      return 'user2'
    } else {
      return 'user1'
    }
}

app.get('/sessionIds', async (req, res) => {
  const params = {
    TableName: 'sessionIds',
  };

  try {
    const data = await dynamoDb.scan(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data from DynamoDB');
  }
});

app.post('/sessionId', async (req, res) => {
  
  const params = {
    TableName: 'sessionIds',
    Item: {
      "SessionId" : req.body.sessionId,
    }
  }
  try {
    await dynamoDb.put(params).promise();
    res.send('Item inserted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error inserting item into DynamoDB');
  }
})

app.post('/update-misscount', async (req, res) => {
  const { sessionId, user } = req.body;  
  const getParams = {
    TableName: 'missCount',
    Key: {
      'SessionId': sessionId,
      'UserId': user,
    }
  };

  try {
    // Get the current missCount
    const data = await dynamoDb.get(getParams).promise();
    let missCount = (data.Item && typeof data.Item.missCount === 'number') ? data.Item.missCount : 0;
    missCount += 1;

    // Update DynamoDB with the new missCount
    const updateParams = {
      TableName: 'missCount',
      Key: {
        'SessionId': sessionId,
        'UserId': user,
      },
      UpdateExpression: 'set missCount = :m',
      ExpressionAttributeValues: {
        ':m': missCount,
      },
      ReturnValues: 'UPDATED_NEW'
    };

    await dynamoDb.update(updateParams).promise();
    const otherUserId = findOtherUserInSession(user);
    if (otherUserId) {
      const otherUserSocketId = userSocketMap[otherUserId];
    if (otherUserSocketId) {
    io.to(otherUserSocketId).emit('missCountUpdated', { sessionId, missCount });
  }
}
    res.send('missCount updated');
  } catch (error) {
    console.error('Error updating missCount:', error);
    res.status(500).send('Error updating missCount');
  }
});