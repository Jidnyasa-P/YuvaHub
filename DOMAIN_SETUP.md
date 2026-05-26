# Custom Domain Setup for YuvaHub.xyz

Congratulations on acquiring **yuvahub.xyz**! To fully transition from the system-generated URLs to your custom domain and fix the login issues, please follow these steps:

## 1. Firebase Authentication (Crucial for Login)
Google Login will fail on your new domain until you authorize it in the Firebase Console.
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **Authentication** > **Settings** > **Authorized Domains**.
4. Click **Add Domain** and enter `yuvahub.xyz`.
5. Also add `www.yuvahub.xyz` if you plan to use the www prefix.

## 2. Pointing your Domain
If you are using Google Cloud or a similar service to host the app:
1. Go to your Domain Registrar (where you bought the domain).
2. Update the **DNS Records**:
   - Add an **A Record** pointing to the IP address provided by your hosting provider (e.g., Cloud Run load balancer).
   - Or add a **CNAME Record** if your provider uses a specific hostname.

## 3. Redirecting genclang (System URLs)
If "genclang" appears in your preview or sharing URLs, these are managed by the platform. Once you have pointed your custom domain to the production build of this app, you can simply share `https://yuvahub.xyz` with your users.

## 4. Troubleshooting Login
If you still see "Invalid Login" on the new domain:
- Ensure the **Authorized Domains** list in Firebase includes the exact domain shown in the browser address bar.
- Clear browser cache or try an Incognito window.
- Make sure you are using the HTTPS version of your site.
