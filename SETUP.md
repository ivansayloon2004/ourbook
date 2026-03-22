## Supabase Setup

1. Create a new Supabase project.
2. In the Supabase dashboard, open the SQL editor and run [supabase-setup.sql](C:\Users\ryzen\Desktop\storybook\supabase-setup.sql).
3. In `Authentication` > `Providers` > `Email`, keep email/password enabled.
4. If you want users to sign in immediately after registration, disable email confirmation in your Supabase auth settings. If you prefer email confirmation, leave it on.
5. In `Project Settings` > `API`, copy:
   - Project URL
   - `anon` public key
6. Open [script.js](C:\Users\ryzen\Desktop\storybook\script.js) and replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
7. Deploy the updated site to Render.

## How To Use

1. One of you signs up with:
   - your own email
   - your own password
   - a shared space code like `ivan-and-her`
2. The other person signs up with a different email, but the exact same shared space code.
3. After that, both accounts will see the same synced memories and uploaded photos.
