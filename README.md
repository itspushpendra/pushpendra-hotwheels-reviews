# Pushpendra's Hot Wheels Reviews

A dark, responsive public review website. Customers can rate packaging, delivery, pricing and communication, write a review, and upload up to three photos. All submissions are **pending** until the site owner approves them in the private Admin Garage.

## Free hosting and backend

- Frontend: GitHub Pages (free for public repositories).
- Database and photo storage: Supabase Free plan (subject to current plan quotas and policies).
- No paid domain is required. GitHub Pages gives you a free `https://YOUR-USERNAME.github.io/REPOSITORY/` address.

This folder is the website source code. It is not online or connected to a database until you complete the setup below.

## 1. Create the free Supabase backend

1. Create a project at https://supabase.com/.
2. In the Supabase project, open **SQL Editor**.
3. Open `schema.sql` from this folder, copy all of it into the SQL Editor, and run it.
4. Open **Project Settings → API** (or API Keys, depending on the dashboard version). Copy the Project URL and the `anon` / publishable public key.
5. Edit `config.js` and replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with those values.
   - It is normal for the browser to contain the anon/publishable key. The database security policies in `schema.sql` protect the data.
   - NEVER paste a `service_role` or secret key into `config.js` or any public repository.

## 2. Set up your administrator login

1. In Supabase, open **Authentication → Users** and add your own email as a user (or use the sign-in flow once and then find the user here).
2. Copy that user's UUID.
3. In SQL Editor, run this command after replacing the placeholder:
   ```sql
   insert into public.review_admins(user_id)
   values ('PASTE-ADMIN-USER-UUID-HERE');
   ```
4. In **Authentication → URL Configuration**, add your eventual GitHub Pages URL to the allowed redirect URLs, for example:
   `https://YOUR-USERNAME.github.io/REPOSITORY/`
5. Open the site, go to **Admin Garage**, enter your admin email and click **Send sign-in link**. Open the email link on the same browser/device.

Only user IDs in `review_admins` can approve or reject reviews.

## 3. Publish free with GitHub Pages

1. Sign in at https://github.com/ and create a **public** repository, e.g. `hotwheels-reviews`.
2. Upload all files in this folder (`index.html`, `styles.css`, `app.js`, `config.js`, `schema.sql`, `README.md`) to the repository root.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Wait for GitHub Pages to publish. Open the URL shown in Pages settings.
5. Add that exact URL to Supabase Authentication's allowed redirect URLs if you have not already.

## 4. Test before sharing

- Submit a test review with a photo.
- Confirm it does **not** appear in public reviews yet.
- Open Admin Garage, sign in, and approve it.
- Refresh the public page and confirm it appears with the category ratings and photo.
- Test a rejected review too.

## Important notes

- Reviewers' names, review text, ratings and approved photos become public. Order references are kept in the database and are not displayed on public cards.
- Do not ask customers to upload parcel labels, addresses, phone numbers or other personal information.
- The website does not independently verify purchases. The optional order reference helps you manually verify them before approval.
- A rejected review remains in the database for your admin records; it is not shown publicly.
- Supabase and GitHub free-tier limits, availability and terms can change. Photo uploads consume storage.
- The public review photo bucket allows public viewing by design. Only upload images intended for public display.
