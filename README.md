# tkd-theory-app

A static Taekwon-Do theory study app. Open `index.html` to set up and take a quiz, `progress.html` to review saved progress, or `question-bank.html` to search the question bank.

The pages share question data in `data.js`, common styling in `styles.css`, and browser storage helpers in `shared.js`. Progress is always saved in this browser; optionally connect a Supabase project and sign in to sync it between devices.

## Sync progress with Supabase

Supabase's free plan includes authentication and a Postgres database. The app connects directly from the browser using Supabase's public publishable key (or legacy anon key); row-level security ensures each signed-in user can access only their own progress.

1. Create a free project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run the contents of [`supabase-setup.sql`](./supabase-setup.sql) to create the progress table and its access policy.
3. In the project's API settings, copy the **Project URL** and **publishable key** (or legacy **anon key**). Never use or share a `service_role` key in this app.
4. Open any app page, expand **Save progress across devices**, and enter the URL and key. The public connection settings are saved in that browser.
5. Create an account with an email and password, then sign in. If email confirmation is enabled, confirm the account using the email Supabase sends.
6. To sign in on another device, open the app there, enter the same project URL and key, and sign in with that account.

On a browser without an account-linked progress record, its existing local progress is combined with the account's cloud progress. If you practise while signed out, those new attempts are merged the next time you sign back in to the same account. Progress already linked to a different account is not transferred. Completed quizzes sync to the signed-in account; when signed out, progress continues to save locally.

For email confirmation, configure the Supabase Auth URL settings to include the app's local and deployed URLs. Supabase Free projects may pause after a week of inactivity; resume the project from the Supabase dashboard if sign-in or sync stops responding.
