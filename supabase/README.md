# Secure AI editing setup

The owner panel's AI tab uses the `admin-ai` Supabase Edge Function. The OpenAI key is stored in a private database table and is never returned to the browser.

## One-time Supabase setup

1. Open the Supabase project used by the website: https://supabase.com/dashboard/project/mtmubvapntzsozpmbmer
2. Open **SQL Editor**, create a new query, paste the contents of `supabase/migrations/20261120000000_admin_ai_secrets.sql`, and run it.
3. Deploy the Edge Function in `supabase/functions/admin-ai/index.ts`.

## Deploy the function with Supabase CLI

From a terminal with this repository checked out:

```sh
npm install --global supabase
supabase login
supabase link --project-ref mtmubvapntzsozpmbmer
supabase functions deploy admin-ai
```

The function uses the standard Supabase environment variables supplied to Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not put the service-role key or OpenAI key in the website source.

## Use it

1. Open the site's `/admin` page and sign in with the existing owner password.
2. Open **Save**, paste your OpenAI API key, and tap **Save OpenAI key**. The key is stored server-side.
3. Open a page, select the **AI** tab, choose a section, enter an instruction, and tap **Preview change**.
4. Review the preview. Use **Undo preview** if needed, or **Save changes** in the Save tab to publish.

The AI preview itself does not publish anything. The existing Save changes action publishes the edited page.
