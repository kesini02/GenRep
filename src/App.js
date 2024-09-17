import React, { useState } from 'react';
import AWS from 'aws-sdk';

import moment from 'moment';

// Configure AWS SDK
AWS.config.update({
  region: 'your-region', // e.g., 'us-east-1'
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'your-identity-pool-id', // Replace with your Cognito Identity Pool ID
  }),
});

const lexruntime = new AWS.LexRuntime();
const genesysApiUrl = 'https://api.mypurecloud.com/v2/analytics/conversations/details/query';

const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  const handleAccessTokenChange = (e) => {
    setAccessToken(e.target.value);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setData([]);
    setError('');

    try {
      // Send query to AWS Lex
      const lexParams = {
        botAlias: '$LATEST',
        botName: 'YourBotName', // Replace with your Lex bot name
        inputText: query,
        userId: 'user-id', // Unique user ID
      };

      lexruntime.postText(lexParams, async (err, data) => {
        if (err) {
          console.error('Error from Lex:', err);
          setError('Error processing request.');
        } else {
          console.log('Lex response:', data);

          // Extract the date from Lex's response
          const dateSlot = data.slots && data.slots.date; // Adjust slot name if different
          const date = dateSlot ? moment(dateSlot, 'MMMM D').toDate() : new Date();

          // Query Genesys Cloud
          const geneSysParams = {
            startDate: date.toISOString(),
            endDate: date.toISOString(),
          };

          try {
            const response = await fetch(genesysApiUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              params: new URLSearchParams(geneSysParams).toString(),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Genesys Cloud response:', responseData);
            setData(responseData.conversations || []); // Adjust based on actual response structure
          } catch (error) {
            console.error('Error from Genesys Cloud:', error);
            setError('Error retrieving interactions.');
          }
        }
      });
    } catch (error) {
      console.error('Error during processing:', error);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div>
      <h1>Genesys Cloud and AWS Lex Integration</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Access Token:</label>
          <input
            type="text"
            value={accessToken}
            onChange={handleAccessTokenChange}
            placeholder="Enter Genesys Cloud Access Token"
          />
        </div>
        <div>
          <label>Search Query:</label>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type your query here..."
          />
        </div>
        <button type="submit">Submit</button>
      </form>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      {data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Interaction ID</th>
              <th>Start Time</th>
              <th>End Time</th>
              {/* Add more columns as needed */}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.id}</td>
                <td>{moment(item.startTime).format('YYYY-MM-DD HH:mm:ss')}</td>
                <td>{moment(item.endTime).format('YYYY-MM-DD HH:mm:ss')}</td>
                {/* Add more data fields as needed */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default App;


