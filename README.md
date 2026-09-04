# English Garden

A vocabulary app built around images, context, stories and active recall. Words live in
**folders**, and folders can be shared — either with one specific person by username, or
published publicly so anyone can find them on the Discover page.

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-cp7cpaqd)

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

In your Supabase project, open the **SQL Editor** and run the whole of:

```
supabase/migrations/20260815000000_accounts_folders_sharing.sql
```

It is idempotent — safe to run on an empty project, and safe to re-run. It creates the
tables, the Row Level Security policies, and the sharing functions.

### 3. Turn off email confirmation

**Authentication → Sign In / Providers → Email**, and switch **Confirm email** off.

Accounts here are username-only: each username maps to a synthetic address like
`sasha@users.englishgarden.local`, which no one can receive mail at. With confirmation
left on, sign-up creates an account that can never log in.

### 4. Add your credentials

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
**Project Settings → API**.

### 5. Run

```bash
npm run dev
```

## How sharing works

Every word, folder and review belongs to exactly one user, enforced in the database by
Row Level Security rather than by the frontend.

A folder has a **visibility** of `private` or `public`, and independently of that it can
be shared with named individuals:

| | Who can see it |
|---|---|
| Private | Only the owner |
| Private + shared with `@amir` | The owner and `@amir` |
| Public | Every signed-in user, listed on Discover |

Shared access is strictly **read-only**. A recipient can browse the folder and press
*Copy to my garden*, which clones the words into their own account as a brand new folder
with spaced-repetition progress reset to zero. Their studying never touches the
original, and the owner's later edits never touch the copy.

## Schema notes

- `categories` is the folders table (it kept its original name).
- `folder_shares` holds one row per (folder, recipient) pair.
- `usernames` maps an auth user to their public handle.
- Cross-user reads go through `SECURITY DEFINER` functions (`list_public_folders`,
  `list_shared_with_me`, `share_folder`, `copy_folder_to_my_garden`, …) so that the
  `usernames` table can't be enumerated in bulk, and so the RLS policies on
  `categories` and `folder_shares` don't recurse into each other.
Hello
