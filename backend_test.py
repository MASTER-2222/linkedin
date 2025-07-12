#!/usr/bin/env python3
"""
LINKDEV Backend API Testing Suite
Tests all API endpoints using the public backend URL
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class LinkdevAPITester:
    def __init__(self, base_url="https://f21b49c7-377a-4740-a468-b491fa84446b.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@linkdev.com"
        self.test_recruiter_email = f"test_recruiter_{datetime.now().strftime('%H%M%S')}@linkdev.com"
        self.test_password = "TestPass123!"

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = False) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response_data

        except Exception as e:
            print(f"Request error: {str(e)}")
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.make_request('GET', '')
        self.log_test("Root Endpoint", success, f"- {data.get('message', '')}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": self.test_user_email,
            "password": self.test_password,
            "first_name": "Test",
            "last_name": "User",
            "role": "job_seeker"
        }
        
        success, data = self.make_request('POST', 'auth/register', user_data)
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['id']
            
        self.log_test("User Registration", success, f"- Token received: {'Yes' if self.token else 'No'}")
        return success

    def test_recruiter_registration(self):
        """Test recruiter registration"""
        recruiter_data = {
            "email": self.test_recruiter_email,
            "password": self.test_password,
            "first_name": "Test",
            "last_name": "Recruiter",
            "role": "recruiter"
        }
        
        success, data = self.make_request('POST', 'auth/register', recruiter_data)
        recruiter_token = data.get('access_token') if success else None
        
        self.log_test("Recruiter Registration", success, f"- Token received: {'Yes' if recruiter_token else 'No'}")
        return success, recruiter_token

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data)
        if success and 'access_token' in data:
            self.token = data['access_token']
            
        self.log_test("User Login", success, f"- Token refreshed: {'Yes' if success else 'No'}")
        return success

    def test_get_current_user(self):
        """Test getting current user profile"""
        success, data = self.make_request('GET', 'users/me', auth_required=True)
        user_email_match = data.get('email') == self.test_user_email if success else False
        
        self.log_test("Get Current User", success and user_email_match, 
                     f"- Email match: {user_email_match}")
        return success

    def test_update_user_profile(self):
        """Test updating user profile"""
        update_data = {
            "headline": "Test Software Developer",
            "summary": "Experienced developer with testing expertise",
            "location": "Test City",
            "skills": ["Python", "JavaScript", "Testing"]
        }
        
        success, data = self.make_request('PUT', 'users/me', update_data, auth_required=True)
        headline_updated = data.get('headline') == update_data['headline'] if success else False
        
        self.log_test("Update User Profile", success and headline_updated, 
                     f"- Headline updated: {headline_updated}")
        return success

    def test_search_users(self):
        """Test searching users"""
        success, data = self.make_request('GET', 'users?query=Test', auth_required=True)
        users_found = len(data) > 0 if success and isinstance(data, list) else False
        
        self.log_test("Search Users", success, f"- Users found: {len(data) if success and isinstance(data, list) else 0}")
        return success

    def test_job_creation(self):
        """Test job creation (requires recruiter token)"""
        recruiter_success, recruiter_token = self.test_recruiter_registration()
        if not recruiter_success:
            self.log_test("Job Creation", False, "- Recruiter registration failed")
            return False

        # Switch to recruiter token temporarily
        original_token = self.token
        self.token = recruiter_token

        job_data = {
            "title": "Senior Python Developer",
            "company": "TestCorp Inc",
            "description": "We are looking for a senior Python developer to join our team.",
            "requirements": ["Python", "FastAPI", "MongoDB"],
            "location": "Remote",
            "job_type": "Full-time",
            "salary_min": 80000,
            "salary_max": 120000,
            "remote_allowed": True,
            "experience_level": "Senior"
        }
        
        success, data = self.make_request('POST', 'jobs', job_data, 201, auth_required=True)
        job_id = data.get('id') if success else None
        
        # Restore original token
        self.token = original_token
        
        self.log_test("Job Creation", success, f"- Job ID: {job_id}")
        return success, job_id

    def test_get_jobs(self):
        """Test getting jobs list"""
        success, data = self.make_request('GET', 'jobs')
        jobs_count = len(data) if success and isinstance(data, list) else 0
        
        self.log_test("Get Jobs", success, f"- Jobs found: {jobs_count}")
        return success, data

    def test_job_application(self):
        """Test applying to a job"""
        # First get available jobs
        jobs_success, jobs_data = self.test_get_jobs()
        if not jobs_success or not jobs_data:
            self.log_test("Job Application", False, "- No jobs available to apply to")
            return False

        job_id = jobs_data[0]['id']
        application_data = {
            "cover_letter": "I am very interested in this position and believe my skills are a great match."
        }
        
        success, data = self.make_request('POST', f'jobs/{job_id}/apply', application_data, auth_required=True)
        
        self.log_test("Job Application", success, f"- Applied to job: {job_id}")
        return success

    def test_connection_request(self):
        """Test sending connection request"""
        # First search for users to connect with
        search_success, users = self.make_request('GET', 'users', auth_required=True)
        if not search_success or not users:
            self.log_test("Connection Request", False, "- No users found to connect with")
            return False

        # Find a user that's not ourselves
        target_user = None
        for user in users:
            if user['id'] != self.user_id:
                target_user = user
                break

        if not target_user:
            self.log_test("Connection Request", False, "- No other users found")
            return False

        connection_data = {
            "receiver_id": target_user['id'],
            "message": "I'd like to connect with you!"
        }
        
        success, data = self.make_request('POST', 'connections/request', connection_data, auth_required=True)
        
        self.log_test("Connection Request", success, f"- Sent to user: {target_user['first_name']}")
        return success

    def test_get_connection_requests(self):
        """Test getting connection requests"""
        success, data = self.make_request('GET', 'connections/requests', auth_required=True)
        requests_count = len(data) if success and isinstance(data, list) else 0
        
        self.log_test("Get Connection Requests", success, f"- Requests found: {requests_count}")
        return success

    def test_create_post(self):
        """Test creating a post"""
        post_data = {
            "content": "This is a test post from the API testing suite! 🚀",
            "image_url": None
        }
        
        success, data = self.make_request('POST', 'posts', post_data, auth_required=True)
        post_id = data.get('id') if success else None
        
        self.log_test("Create Post", success, f"- Post ID: {post_id}")
        return success, post_id

    def test_get_posts(self):
        """Test getting posts"""
        success, data = self.make_request('GET', 'posts', auth_required=True)
        posts_count = len(data) if success and isinstance(data, list) else 0
        
        self.log_test("Get Posts", success, f"- Posts found: {posts_count}")
        return success, data

    def test_like_post(self):
        """Test liking a post"""
        # First get posts
        posts_success, posts_data = self.test_get_posts()
        if not posts_success or not posts_data:
            self.log_test("Like Post", False, "- No posts available to like")
            return False

        post_id = posts_data[0]['id']
        success, data = self.make_request('POST', f'posts/{post_id}/like', auth_required=True)
        
        self.log_test("Like Post", success, f"- Liked post: {post_id}")
        return success

    def test_dashboard_stats(self):
        """Test getting dashboard stats"""
        success, data = self.make_request('GET', 'dashboard/stats', auth_required=True)
        has_stats = 'connections' in data and 'posts' in data if success else False
        
        self.log_test("Dashboard Stats", success and has_stats, 
                     f"- Stats keys: {list(data.keys()) if success else []}")
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        success, data = self.make_request('POST', 'auth/login', invalid_login_data, expected_status=401)
        
        self.log_test("Invalid Login", success, "- Correctly rejected invalid credentials")
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, data = self.make_request('GET', 'users/me', expected_status=401, auth_required=True)
        
        # Restore token
        self.token = original_token
        
        self.log_test("Unauthorized Access", success, "- Correctly rejected unauthorized request")
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LINKDEV Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # User management tests
        self.test_get_current_user()
        self.test_update_user_profile()
        self.test_search_users()
        
        # Job tests
        self.test_job_creation()
        self.test_get_jobs()
        self.test_job_application()
        
        # Networking tests
        self.test_connection_request()
        self.test_get_connection_requests()
        
        # Posts tests
        self.test_create_post()
        self.test_get_posts()
        self.test_like_post()
        
        # Dashboard tests
        self.test_dashboard_stats()

        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the issues above.")
            return 1

def main():
    """Main test runner"""
    tester = LinkdevAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())