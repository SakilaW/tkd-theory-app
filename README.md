# tkd-theory-app

A static Taekwon-Do theory study app. Open `index.html` to set up and take a quiz, `progress.html` to review saved progress, or `question-bank.html` to search the question bank.

The pages share question data in `data.js`, common styling in `styles.css`, and browser storage helpers in `shared.js`. Progress is always saved in this browser; sign in to sync it between devices.

## Sync progress with Supabase

The app is already connected to its Supabase project. Users only need to open **Sync progress across devices**, enter an email and password, and choose **Create account** or **Sign in**. If email confirmation is enabled, confirm the account using the email Supabase sends. Configure the app's local and deployed URLs in Supabase Auth URL settings so confirmation links return to the app.

For a new deployment or a fork using a different Supabase project, update the project URL and public publishable key in `SUPABASE_CONFIG` in [`auth.js`](./auth.js). Run [`supabase-setup.sql`](./supabase-setup.sql) in that project's SQL Editor to create the progress table and its row-level security policy. Use only a publishable key (or legacy anon key) in browser code; never use a `service_role` key. The project owner must also add the app's local and deployed URLs to the Supabase Auth URL settings.

On a browser without an account-linked progress record, its existing local progress is combined with the account's cloud progress. If you practise while signed out, those new attempts are merged the next time you sign back in to the same account. Progress already linked to a different account is not transferred. Completed quizzes and the latest 10 quiz reviews sync to the signed-in account; when signed out, progress continues to save locally.

Supabase Free projects may pause after a week of inactivity; resume the project from the Supabase dashboard if sign-in or sync stops responding.
