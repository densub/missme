import { useEffect, useState } from 'react';
import './missMe.css';
import { useLocation } from 'react-router-dom';
import heart from './assets/heart.png'
import axios from 'axios'
import io from 'socket.io-client';

function MissMe() {
  const SOCKET_SERVER_URL = 'http://52.23.157.77:3000';
  const [socket, setSocket] = useState(null);
  const [missCount, setMissCount] = useState(0);
  const location = useLocation();
  const sessionId = location.state?.missMeId
  const user = location.state?.user || 'user2'
  
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, { query: { sessionId, user } });
    newSocket.emit('joinSession', { user, sessionId });
    newSocket.on('missCountUpdated', (data) => {
      if (data.sessionId === sessionId) {
        setMissCount(data.missCount);
      }
    });

    return () => newSocket.close();
  }, [sessionId, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await axios.post(`${SOCKET_SERVER_URL}/update-misscount`, { sessionId: sessionId, user: user});
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="App">
      <div className='sessionId'>SessionId: {sessionId}</div>
      <div className="heart-icon">
        <img src={heart} alt="Heart" />
      </div>
      <div className="notification-count">{missCount}</div>
      <div onClick={handleSubmit} className="circle-button"></div>
    </div>
  );
}

export default MissMe;