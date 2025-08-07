# Participant Login Feature Guide

## Overview

The participant login feature provides a secure way for participants to authenticate and access meeting rooms. It includes both a backend API endpoint and a frontend login page that matches the application's design system.

## Features

- **Secure Authentication**: Email and password-based login
- **Glassmorphism UI**: Matches the dashboard's design system
- **Form Validation**: Client and server-side validation
- **Error Handling**: Comprehensive error messages
- **Demo Credentials**: Pre-configured test accounts
- **Responsive Design**: Works on all device sizes
- **Smooth Animations**: Framer Motion animations for better UX

## API Endpoint

### POST `/api/participant-login`

Authenticates a participant and returns access credentials.

#### Request Body
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "participant": {
    "id": "participant-001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "participant",
    "permissions": ["join", "speak", "video"]
  },
  "token": "participant_participant-001_1234567890",
  "message": "Login successful"
}
```

#### Error Responses

**400 Bad Request** - Missing fields
```json
{
  "error": "Email and password are required"
}
```

**401 Unauthorized** - Invalid credentials
```json
{
  "error": "Invalid email or password"
}
```

**500 Internal Server Error** - Server error
```json
{
  "error": "Internal server error"
}
```

## Demo Credentials

The system includes three pre-configured test accounts:

| Name | Email | Password | Permissions |
|------|-------|----------|-------------|
| John Doe | john@example.com | password123 | join, speak, video |
| Jane Smith | jane@example.com | password456 | join, speak, video |
| Bob Wilson | bob@example.com | password789 | join, speak |

## Frontend Page

### Route: `/participant-login`

The participant login page features:

- **Modern Design**: Glassmorphism effects with backdrop blur
- **Interactive Elements**: Hover effects and smooth transitions
- **Password Visibility Toggle**: Show/hide password functionality
- **Loading States**: Spinner animation during authentication
- **Success/Error Messages**: Animated notifications
- **Demo Credentials Display**: Shows available test accounts
- **Navigation**: Link back to dashboard

## Usage

### 1. Access the Login Page

Navigate to `/participant-login` or click the "Participant Login" card on the dashboard.

### 2. Enter Credentials

Use one of the demo credentials or your own account details.

### 3. Authentication

The system will validate your credentials and:
- Store participant data in localStorage
- Generate an access token
- Redirect to the dashboard

### 4. Access Meeting Rooms

Once authenticated, participants can access meeting rooms with their stored permissions.

## Testing

### Manual Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/participant-login`

3. Test with demo credentials:
   - Valid login: `john@example.com` / `password123`
   - Invalid login: `invalid@example.com` / `wrongpassword`

### Automated Testing

Run the test script:
```bash
node test-participant-login.js
```

This will test:
- Valid login scenarios
- Invalid credentials
- Missing fields
- API endpoint availability

## Implementation Details

### Backend (`/app/api/participant-login/route.ts`)

- **Dummy Data**: Hardcoded participant accounts for testing
- **Input Validation**: Checks for required fields
- **Authentication**: Simple email/password matching
- **Token Generation**: Creates session tokens
- **Error Handling**: Comprehensive error responses

### Frontend (`/app/participant-login/page.tsx`)

- **React Hooks**: State management for form data
- **Framer Motion**: Smooth animations and transitions
- **Form Handling**: Controlled inputs with validation
- **API Integration**: Fetch requests to backend
- **Local Storage**: Stores authentication data
- **Responsive Design**: Mobile-friendly layout

### Styling

The login page uses the existing dashboard CSS classes:
- `.dashboard-container`: Main layout
- `.dashboard-background`: Background styling
- Custom inline styles for glassmorphism effects

## Security Considerations

⚠️ **Important**: This is a demo implementation with basic security. For production:

1. **Use HTTPS**: Always use secure connections
2. **Hash Passwords**: Use bcrypt or similar for password hashing
3. **JWT Tokens**: Implement proper JWT authentication
4. **Rate Limiting**: Add rate limiting to prevent brute force attacks
5. **Database**: Store user data in a proper database
6. **Session Management**: Implement proper session handling
7. **Input Sanitization**: Sanitize all user inputs
8. **CORS**: Configure proper CORS policies

## Customization

### Adding New Participants

Edit the `dummyParticipants` array in `/app/api/participant-login/route.ts`:

```javascript
const dummyParticipants = [
  // ... existing participants
  {
    id: 'participant-004',
    name: 'New User',
    email: 'newuser@example.com',
    password: 'newpassword',
    role: 'participant',
    permissions: ['join', 'speak', 'video']
  }
];
```

### Modifying Permissions

Update the permissions array for each participant:

```javascript
permissions: ['join', 'speak', 'video', 'record'] // Add new permissions
```

### Styling Changes

The login page uses inline styles that match the dashboard design. To modify:

1. Update the inline styles in the component
2. Add new CSS classes to `/styles/dashboard.css`
3. Modify the color scheme in the style objects

## Troubleshooting

### Common Issues

1. **Login Fails**: Check if the email and password match the demo credentials
2. **Page Not Loading**: Ensure the development server is running
3. **API Errors**: Check the browser console for network errors
4. **Styling Issues**: Verify that `/styles/dashboard.css` is imported

### Debug Mode

Add console logs to debug authentication:

```javascript
console.log('Login attempt:', { email, password });
console.log('API response:', data);
```

## Future Enhancements

Potential improvements for the participant login system:

1. **Database Integration**: Replace dummy data with real database
2. **Email Verification**: Add email verification for new accounts
3. **Password Reset**: Implement password reset functionality
4. **Remember Me**: Add "remember me" functionality
5. **Multi-factor Authentication**: Add 2FA support
6. **Social Login**: Integrate with Google, GitHub, etc.
7. **User Profiles**: Add user profile management
8. **Audit Logs**: Track login attempts and activities 