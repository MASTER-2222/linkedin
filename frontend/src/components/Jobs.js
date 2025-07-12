import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    query: '',
    location: '',
    job_type: '',
    remote_allowed: ''
  });
  const [showPostJob, setShowPostJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    location: '',
    job_type: 'Full-time',
    salary_min: '',
    salary_max: '',
    remote_allowed: false,
    experience_level: 'Mid-level'
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await axios.get(`${API}/jobs?${params}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const jobData = {
        ...newJob,
        requirements: newJob.requirements.split('\n').filter(req => req.trim()),
        salary_min: newJob.salary_min ? parseInt(newJob.salary_min) : null,
        salary_max: newJob.salary_max ? parseInt(newJob.salary_max) : null
      };
      
      await axios.post(`${API}/jobs`, jobData);
      setShowPostJob(false);
      setNewJob({
        title: '',
        company: '',
        description: '',
        requirements: '',
        location: '',
        job_type: 'Full-time',
        salary_min: '',
        salary_max: '',
        remote_allowed: false,
        experience_level: 'Mid-level'
      });
      fetchJobs();
    } catch (error) {
      console.error('Error posting job:', error);
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      await axios.post(`${API}/jobs/${jobId}/apply`);
      alert('Application submitted successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to apply for job');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
            <p className="text-gray-600">Discover your next career opportunity</p>
          </div>
          {user?.role === 'recruiter' && (
            <button
              onClick={() => setShowPostJob(true)}
              className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition duration-200"
            >
              Post a Job
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              name="query"
              placeholder="Search jobs..."
              value={filters.query}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="text"
              name="location"
              placeholder="Location"
              value={filters.location}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <select
              name="job_type"
              value={filters.job_type}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
            </select>
            <select
              name="remote_allowed"
              value={filters.remote_allowed}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Locations</option>
              <option value="true">Remote</option>
              <option value="false">On-site</option>
            </select>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-6">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition duration-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                    <p className="text-gray-600 mb-2">{job.company}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        {job.job_type}
                      </span>
                      {job.remote_allowed && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Remote
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        {job.experience_level}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                    {job.salary_min && job.salary_max && (
                      <p className="text-gray-600 mb-4">
                        Salary: ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{job.applications_count} applications</span>
                      <span>{job.views_count} views</span>
                      <span>{new Date(job.posted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="ml-6">
                    {user?.role === 'job_seeker' && (
                      <button
                        onClick={() => handleApplyJob(job.id)}
                        className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition duration-200"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      {showPostJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Post a Job</h2>
              <button
                onClick={() => setShowPostJob(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePostJob} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={newJob.title}
                  onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={newJob.company}
                  onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>
              <textarea
                placeholder="Job Description"
                value={newJob.description}
                onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
              <textarea
                placeholder="Requirements (one per line)"
                value={newJob.requirements}
                onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Location"
                  value={newJob.location}
                  onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <select
                  value={newJob.job_type}
                  onChange={(e) => setNewJob({...newJob, job_type: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Min Salary"
                  value={newJob.salary_min}
                  onChange={(e) => setNewJob({...newJob, salary_min: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                  type="number"
                  placeholder="Max Salary"
                  value={newJob.salary_max}
                  onChange={(e) => setNewJob({...newJob, salary_max: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newJob.remote_allowed}
                    onChange={(e) => setNewJob({...newJob, remote_allowed: e.target.checked})}
                    className="form-checkbox h-4 w-4 text-pink-500"
                  />
                  <span className="ml-2 text-gray-700">Remote work allowed</span>
                </label>
                <select
                  value={newJob.experience_level}
                  onChange={(e) => setNewJob({...newJob, experience_level: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Entry-level">Entry-level</option>
                  <option value="Mid-level">Mid-level</option>
                  <option value="Senior-level">Senior-level</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition duration-200"
                >
                  Post Job
                </button>
                <button
                  type="button"
                  onClick={() => setShowPostJob(false)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;