# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the Stock Tracker app.

## Prerequisites
- A Google account
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "stock-tracker-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, select your project
2. Click on "Authentication" in the left sidebar
3. Click "Get started"
4. Go to the "Sign-in method" tab
5. Click on "Email/Password"
6. Toggle "Enable" to turn it on
7. Optionally, toggle "Email link (passwordless sign-in)"
8. Click "Save"

## Step 3: Get Your Firebase Configuration

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the "</>" (Web) icon to add a web app
5. Register your app with a nickname (e.g., "Stock Tracker Web")
6. You'll see your Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## Step 4: Update Your Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values with your actual Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

## Step 5: Configure Firebase Security Rules (Optional but Recommended)

1. In Firebase Console, go to "Authentication" > "Settings" > "Authorized domains"
2. Add your production domain (e.g., `yourdomain.com`)
3. `localhost` is already authorized by default for development

## Step 6: Set up Password Reset Email Template (Optional)

1. In Firebase Console, go to "Authentication" > "Templates"
2. Click on "Password reset"
3. Customize the email template as needed
4. You can customize the sender name, subject, and message

## Step 7: Test the Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/register`
3. Create a new account
4. Try logging in at `http://localhost:3000/login`
5. Test the "Forgot password" functionality

## Security Best Practices

1. **Never commit your `.env.local` file** - It's already in `.gitignore`
2. **Enable App Check** in production to prevent abuse
3. **Set up proper security rules** in Firestore if you plan to use it
4. **Monitor your usage** in the Firebase Console to prevent unexpected charges
5. **Enable 2FA** for your Firebase account

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Double-check your API key in `.env.local`
   - Ensure there are no extra spaces or quotes

2. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to authorized domains in Firebase Console
   - For development, ensure you're using `localhost`

3. **"Cannot read property 'auth' of undefined"**
   - Ensure Firebase is properly initialized
   - Check that all environment variables are set correctly

## Additional Features

You can extend the authentication with:
- Google Sign-In
- Facebook Login
- GitHub Authentication
- Phone Authentication
- Anonymous Authentication

To enable these, go to Firebase Console > Authentication > Sign-in method and enable the desired providers.

## Production Deployment

When deploying to production:
1. Add your production domain to Firebase authorized domains
2. Set up environment variables in your hosting platform
3. Consider implementing rate limiting
4. Enable Firebase App Check for additional security
5. Monitor authentication logs and set up alerts

## Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Auth for Web](https://firebase.google.com/docs/auth/web/start)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)