# Session Expiry Testing Guide

## Overview
The session expiry has been changed from 2 hours to 20 minutes, with a client-side auto-logout timer and warning system.

## Changes Made

### 1. Server-Side Changes
- **Login Function**: Changed `SESSION_MAX_AGE_SEC` from `60 * 60 * 2` (2 hours) to `60 * 20` (20 minutes)
- **Location**: `netlify/functions/login.mjs`

### 2. Client-Side Changes
- **Session Timer Hook**: `src/hooks/useSessionTimer.js`
  - Parses JWT session token to get expiry time
  - Updates every second with remaining time
  - Shows warning 5 minutes before expiry
  - Auto-logout when session expires

- **Session Warning Component**: `src/components/SessionWarning.js`
  - Shows warning banner 5 minutes before expiry
  - Provides "Refresh Session" and "Logout Now" buttons
  - Auto-redirects to login when session expires

- **Navigation Integration**: `src/components/Navigation.js`
  - Shows session timer in navigation bar
  - Changes color to yellow when warning time approaches

- **App Integration**: `src/App.js`
  - Includes SessionWarning component globally

## Testing Instructions

### 1. Test Session Expiry (20 minutes)
```bash
# 1. Start the development server
npm run dev

# 2. Login with valid credentials
# 3. Check the navigation bar - you should see a session timer
# 4. Wait 20 minutes (or modify the code temporarily for faster testing)
# 5. Verify auto-logout occurs
```

### 2. Test Warning System (5 minutes before expiry)
```bash
# 1. Login and wait 15 minutes
# 2. You should see:
#    - Yellow warning banner in top-right corner
#    - Session timer in navigation turns yellow
#    - Warning message with remaining time
```

### 3. Test Manual Logout
```bash
# 1. When warning appears, click "Logout Now"
# 2. Should redirect to login page immediately
```

### 4. Test Session Token Parsing
```bash
# 1. Login and check browser console
# 2. Should see session timer updating every second
# 3. No parsing errors should occur
```

## Quick Test (Modify for Testing)

To test faster, temporarily modify the session duration:

```javascript
// In src/hooks/useSessionTimer.js, change:
const SESSION_DURATION_MS = 20 * 60 * 1000; // 20 minutes
// To:
const SESSION_DURATION_MS = 2 * 60 * 1000; // 2 minutes for testing

// And change warning time:
const WARNING_TIME_MS = 5 * 60 * 1000; // 5 minutes before
// To:
const WARNING_TIME_MS = 30 * 1000; // 30 seconds before
```

## Expected Behavior

1. **Login**: Session starts with 20-minute timer
2. **15 minutes**: Warning appears (5 minutes before expiry)
3. **20 minutes**: Auto-logout with redirect to login
4. **Navigation**: Timer always visible, changes color when warning
5. **Server calls**: Will fail after 20 minutes, redirect to login

## Troubleshooting

### Session Timer Not Showing
- Check browser console for JWT parsing errors
- Verify session cookie exists
- Check if user is logged in

### Warning Not Appearing
- Verify warning time calculation (5 minutes before expiry)
- Check if SessionWarning component is rendered
- Look for JavaScript errors in console

### Auto-logout Not Working
- Check if session expiry detection is working
- Verify redirect logic in useSessionTimer hook
- Check for JavaScript errors

## Production Deployment

After testing locally:

```bash
git add .
git commit -m "Add 20-minute session expiry with client-side auto-logout timer

- Change session duration from 2 hours to 20 minutes
- Add useSessionTimer hook for client-side session management
- Add SessionWarning component with 5-minute warning
- Integrate session timer into Navigation component
- Auto-logout when session expires with smooth UX"
git push origin main
```

Wait for Netlify deployment to complete, then test in production.
