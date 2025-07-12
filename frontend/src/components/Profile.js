import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    headline: '',
    summary: '',
    location: '',
    industry: '',
    experience_years: '',
    skills: '',
    education: [],
    experience: []
  });
  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree: '',
    field: '',
    start_year: '',
    end_year: ''
  });
  const [newExperience, setNewExperience] = useState({
    company: '',
    position: '',
    description: '',
    start_date: '',
    end_date: '',
    current: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/me`);
      setProfile(response.data);
      setEditForm({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        headline: response.data.headline || '',
        summary: response.data.summary || '',
        location: response.data.location || '',
        industry: response.data.industry || '',
        experience_years: response.data.experience_years || '',
        skills: response.data.skills?.join(', ') || '',
        education: response.data.education || [],
        experience: response.data.experience || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        ...editForm,
        skills: editForm.skills.split(',').map(skill => skill.trim()).filter(skill => skill),
        experience_years: editForm.experience_years ? parseInt(editForm.experience_years) : null
      };
      
      const response = await axios.put(`${API}/users/me`, updateData);
      setProfile(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const addEducation = () => {
    if (newEducation.institution && newEducation.degree) {
      setEditForm({
        ...editForm,
        education: [...editForm.education, { ...newEducation, id: Date.now() }]
      });
      setNewEducation({
        institution: '',
        degree: '',
        field: '',
        start_year: '',
        end_year: ''
      });
    }
  };

  const removeEducation = (index) => {
    setEditForm({
      ...editForm,
      education: editForm.education.filter((_, i) => i !== index)
    });
  };

  const addExperience = () => {
    if (newExperience.company && newExperience.position) {
      setEditForm({
        ...editForm,
        experience: [...editForm.experience, { ...newExperience, id: Date.now() }]
      });
      setNewExperience({
        company: '',
        position: '',
        description: '',
        start_date: '',
        end_date: '',
        current: false
      });
    }
  };

  const removeExperience = (index) => {
    setEditForm({
      ...editForm,
      experience: editForm.experience.filter((_, i) => i !== index)
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isEditing ? (
          /* View Mode */
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-pink-500 to-purple-600"></div>
              <div className="relative px-6 pb-6">
                <div className="flex items-center space-x-6">
                  <div className="relative -mt-16">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-pink-500 border-4 border-white shadow-lg">
                      {getInitials(profile?.first_name, profile?.last_name)}
                    </div>
                  </div>
                  <div className="flex-1 pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                          {profile?.first_name} {profile?.last_name}
                        </h1>
                        {profile?.headline && (
                          <p className="text-lg text-gray-600 mt-1">{profile.headline}</p>
                        )}
                        <div className="flex items-center space-x-4 text-gray-500 mt-2">
                          {profile?.location && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {profile.location}
                            </span>
                          )}
                          {profile?.industry && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                              </svg>
                              {profile.industry}
                            </span>
                          )}
                          <span className="text-pink-500 font-medium">{profile?.connections_count} connections</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition duration-200"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            {profile?.summary && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
              </div>
            )}

            {/* Experience Section */}
            {profile?.experience?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Experience</h2>
                <div className="space-y-6">
                  {profile.experience.map((exp, index) => (
                    <div key={index} className="border-l-2 border-pink-200 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-pink-600 font-medium">{exp.company}</p>
                      <p className="text-gray-500 text-sm">
                        {exp.start_date} - {exp.current ? 'Present' : exp.end_date}
                      </p>
                      {exp.description && (
                        <p className="text-gray-700 mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education Section */}
            {profile?.education?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Education</h2>
                <div className="space-y-4">
                  {profile.education.map((edu, index) => (
                    <div key={index} className="border-l-2 border-pink-200 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">{edu.institution}</h3>
                      <p className="text-gray-600">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                      <p className="text-gray-500 text-sm">
                        {edu.start_year} - {edu.end_year}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Section */}
            {profile?.skills?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit Mode */
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Headline</label>
                <input
                  type="text"
                  value={editForm.headline}
                  onChange={(e) => setEditForm({...editForm, headline: e.target.value})}
                  placeholder="e.g., Software Engineer at Tech Company"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="City, Country"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({...editForm, industry: e.target.value})}
                    placeholder="e.g., Technology"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={editForm.experience_years}
                    onChange={(e) => setEditForm({...editForm, experience_years: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.skills}
                  onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                  placeholder="e.g., JavaScript, React, Node.js"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Experience Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Experience</label>
                {editForm.experience.map((exp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{exp.position} at {exp.company}</h4>
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{exp.start_date} - {exp.current ? 'Present' : exp.end_date}</p>
                  </div>
                ))}
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Add Experience</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Company"
                      value={newExperience.company}
                      onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={newExperience.position}
                      onChange={(e) => setNewExperience({...newExperience, position: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Start Date"
                      value={newExperience.start_date}
                      onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="End Date"
                      value={newExperience.end_date}
                      onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                      disabled={newExperience.current}
                      className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
                    />
                  </div>
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={newExperience.current}
                      onChange={(e) => setNewExperience({...newExperience, current: e.target.checked})}
                      className="mr-2"
                    />
                    Current position
                  </label>
                  <textarea
                    placeholder="Description"
                    value={newExperience.description}
                    onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
                  />
                  <button
                    type="button"
                    onClick={addExperience}
                    className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                  >
                    Add Experience
                  </button>
                </div>
              </div>

              {/* Education Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Education</label>
                {editForm.education.map((edu, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{edu.degree} from {edu.institution}</h4>
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{edu.start_year} - {edu.end_year}</p>
                  </div>
                ))}
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Add Education</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Institution"
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Degree"
                      value={newEducation.degree}
                      onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Field of Study"
                      value={newEducation.field}
                      onChange={(e) => setNewEducation({...newEducation, field: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Start Year"
                      value={newEducation.start_year}
                      onChange={(e) => setNewEducation({...newEducation, start_year: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="End Year"
                      value={newEducation.end_year}
                      onChange={(e) => setNewEducation({...newEducation, end_year: e.target.value})}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                  >
                    Add Education
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition duration-200"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;