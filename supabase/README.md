# Secure AI editing setup

The owner panel's AI tab uses the `admin-ai` Supabase Edge Function. The OpenAI key is stored in a private database table and is never returned to the browser.

## One-time setup in Supabase (works from a phone)

1. Open the project: https://supabase.com/dashboard/project/mtmubvapntzsozpmbmer
2. Open **SQL Editor** and create a new query.
3. Open this SQL file in GitHub, copy its contents, paste into SQL Editor, and run it:
   `supabase/migrations/20261120000000_admin_ai_secrets.sql`
4. In the Supabase sidebar, open **Edge Functions**.
5. Tap **Deploy a new function** and choose **Via Editor**. Name it `admin-ai`.
6. Replace the starter code with the complete contents of:
   `supabase/functions/admin-ai/index.ts`
   (open the file in GitHub and copy all its contents).
7. Ensure JWT verification is disabled for this function. The function performs its own owner-password check against the existing `admin_list_reviews` database RPC.
8. Tap **Deploy function**.

Supabase's dashboard supports creating, editing, testing, and deploying Edge Functions without a local development environment: https://supabase.com/docs/guides/functions/quickstart-dashboard

The function uses Supabase's standard Edge Function environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not paste a service-role key into the website or browser.

## Alternative: deploy with Supabase CLI

From a terminal with this repository checked out:

```sh
npm install --global supabase
supabase login
supabase link --project-ref mtmubvapntzsozpmbmer
supabase functions deploy admin-ai
```

## Use the AI editor

1. Open the website's `/admin` page and sign in with the existing owner password.
2. Open **Save**, paste your OpenAI API key, and tap **Save OpenAI key**. The key is stored server-side.
3. Open a page, select the **AI** tab, choose a section, enter an instruction, and tap **Preview change**.
4. Review the preview. Use **Undo preview** if needed, or **Save changes** in the Save tab to publish.

The AI preview itself does not publish anything. The existing Save changes action publishes the edited page.
