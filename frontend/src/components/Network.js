import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Network = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [connections, setConnections] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworkData();
  }, [activeTab]);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'connections') {
        const response = await axios.get(`${API}/connections`);
        setConnections(response.data);
      } else if (activeTab === 'requests') {
        const response = await axios.get(`${API}/connections/requests`);
        setConnectionRequests(response.data);
      } else if (activeTab === 'discover') {
        const response = await axios.get(`${API}/users?limit=20`);
        setSuggestedUsers(response.data.filter(u => u.id !== user.id));
      }
    } catch (error) {
      console.error('Error fetching network data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.get(`${API}/users?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.filter(u => u.id !== user.id));
      setActiveTab('search');
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendConnectionRequest = async (userId, message = '') => {
    try {
      await axios.post(`${API}/connections/request`, {
        receiver_id: userId,
        message
      });
      alert('Connection request sent!');
      // Refresh the current view
      fetchNetworkData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send connection request');
    }
  };

  const respondToRequest = async (connectionId, accept) => {
    try {
      await axios.put(`${API}/connections/${connectionId}/respond`, { accept });
      alert(`Connection request ${accept ? 'accepted' : 'declined'}!`);
      fetchNetworkData();
    } catch (error) {
      alert('Failed to respond to connection request');
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const UserCard = ({ userData, showConnectButton = false, isRequest = false, requestData = null }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-200">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {getInitials(userData.first_name, userData.last_name)}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {userData.first_name} {userData.last_name}
          </h3>
          {userData.headline && (
            <p className="text-gray-600 text-sm">{userData.headline}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            {userData.location && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {userData.location}
              </span>
            )}
            {userData.industry && (
              <span>• {userData.industry}</span>
            )}
            <span className="text-pink-500">
              {userData.connections_count} connections
            </span>
          </div>
          {userData.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {userData.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
              {userData.skills.length > 3 && (
                <span className="text-gray-500 text-xs">+{userData.skills.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showConnectButton && (
        <div className="mt-4">
          <button
            onClick={() => sendConnectionRequest(userData.id)}
            className="w-full bg-pink-500 text-white py-2 px-4 rounded-lg hover:bg-pink-600 transition duration-200"
          >
            Connect
          </button>
        </div>
      )}
      
      {isRequest && requestData && (
        <div className="mt-4">
          {requestData.message && (
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Message:</span> {requestData.message}
              </p>
            </div>
          )}
          <div className="flex space-x-2">
            <button
              onClick={() => respondToRequest(requestData.id, true)}
              className="flex-1 bg-pink-500 text-white py-2 px-4 rounded-lg hover:bg-pink-600 transition duration-200"
            >
              Accept
            </button>
            <button
              onClick={() => respondToRequest(requestData.id, false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-200"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Network</h1>
          <p className="text-gray-600">Grow your professional network</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search for professionals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleSearch}
              className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition duration-200"
            >
              Search
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'discover', label: 'Discover', count: suggestedUsers.length },
                { id: 'connections', label: 'Connections', count: connections.length },
                { id: 'requests', label: 'Requests', count: connectionRequests.length },
                ...(searchResults.length > 0 ? [{ id: 'search', label: 'Search Results', count: searchResults.length }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <>
              {/* Discover Tab */}
              {activeTab === 'discover' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">People you may know</h2>
                    <p className="text-gray-600">Based on your profile and activity</p>
                  </div>
                  {suggestedUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestedUsers.map((userData) => (
                        <UserCard
                          key={userData.id}
                          userData={userData}
                          showConnectButton={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions available</h3>
                      <p className="mt-1 text-sm text-gray-500">Check back later for new connection suggestions.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Connections Tab */}
              {activeTab === 'connections' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Your connections</h2>
                    <p className="text-gray-600">{connections.length} connections</p>
                  </div>
                  {connections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {connections.map((userData) => (
                        <UserCard key={userData.id} userData={userData} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No connections yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Start building your network by connecting with professionals.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === 'requests' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Connection requests</h2>
                    <p className="text-gray-600">{connectionRequests.length} pending requests</p>
                  </div>
                  {connectionRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {connectionRequests.map((request) => (
                        <UserCard
                          key={request.id}
                          userData={{ id: request.sender_id, first_name: 'Connection', last_name: 'Request' }}
                          isRequest={true}
                          requestData={request}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
                      <p className="mt-1 text-sm text-gray-500">New connection requests will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Search Results Tab */}
              {activeTab === 'search' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Search results</h2>
                    <p className="text-gray-600">Found {searchResults.length} professionals</p>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResults.map((userData) => (
                        <UserCard
                          key={userData.id}
                          userData={userData}
                          showConnectButton={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                      <p className="mt-1 text-sm text-gray-500">Try different search terms or explore suggested connections.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Network;