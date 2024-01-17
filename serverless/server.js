const express = require('express')
const AWS = require('aws-sdk')
const cors = require('cors')
const http = require('http');
const { Server } = require('socket.io');


AWS.config.update({region: 'us-east-1'})

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS({ apiVersion: '2024-01-08'})
const queueURL = "https://sqs.us-east-1.amazonaws.com/527864851720/missmeQue";
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); 
});
const userSocketMap = {};

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
  console.log(req.body)
  // Define DynamoDB query parameters
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
    console.log(missCount)
    // Increment missCount
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

    // Notify other user in the session via WebSocket
    // Note: You need to implement logic to find the otherUserId based on sessionId
    // io.to(otherUserId).emit('missCountUpdated', missCount);

    res.send('missCount updated');
  } catch (error) {
    console.error('Error updating missCount:', error);
    res.status(500).send('Error updating missCount');
  }
  // const otherUserId = findOtherUserInSession(sessionId, userId);
  // if (otherUserId && userSocketMap[otherUserId]) {
  //   io.to(userSocketMap[otherUserId]).emit('missCountUpdated', { userId, missCount });
  // }

  // res.send('missCount updated');
});

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  // Listen for a custom event to join a session (you can name this event as per your requirement)
  socket.on('joinSession', ({ user, sessionId }) => {
    // Store the mapping of the user and the socket id
    userSocketMap[user] = socket.id;

    // You can use 'rooms' in Socket.IO to manage sessions
    socket.join(sessionId);
    console.log(`User ${user} joined session ${sessionId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
    // Remove the user from the map
    Object.keys(userSocketMap).forEach(user => {
      if (userSocketMap[user] === socket.id) {
        delete userSocketMap[user];
      }
    });
  });
});