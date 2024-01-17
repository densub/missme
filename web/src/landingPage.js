import React, { useState } from 'react';
import cuid from 'cuid';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './landingPage.css';

function LandingPage() {
    let navigate = useNavigate();
    const [missMeId, setMissMeId] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [showInput, setShowInput] = useState(false);

    const handleOpenSession = async () => {
        try {
            let response = await axios.get('http://localhost:3000/sessionIds');
            console.log(response)
            if(response.data?.find(x => x.SessionId === inputValue) !== undefined) {
                navigate('/app', {state: {missMeId: inputValue}});
            } else {
                alert('No Session Id found')
            }
          } catch (error) {
            console.error('Error fetching sessionIDs:', error);
          }
    }
  
    const handleCreateMissMe = async () => {
      const id = cuid();
      setMissMeId(id);
      try {
        await axios.post('http://localhost:3000/sessionId', {sessionId: id});
      } catch (error) {
        console.error('Error fetching sessionIDs:', error);
      }
      navigate('/app', {state: {missMeId: id, user: 'user1'}});
    };
  
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
      };

    const handleEnterMissMe = () => {
      setShowInput(true);
    };
  
    return (
      <div className="landing-page">
        <button onClick={handleCreateMissMe} className="button">Create MissMe</button>
        {!showInput && (
          <button onClick={handleEnterMissMe} className="button">I have a code</button>
        )}
  
        {showInput && (
          <div className="input-container">
            <input
              type="text"
              placeholder="Enter MissMe ID"
              value={inputValue}
              onChange={handleInputChange}
              className="input-field"
            />
            <button onClick={handleOpenSession} className="button">Enter</button>
          </div>
        )}
      </div>
    );
  }

export default LandingPage;