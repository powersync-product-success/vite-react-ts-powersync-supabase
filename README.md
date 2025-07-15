# Vite + React + TS + PowerSync + Supabase

![App Demo](assets/demo.gif)

A templated Vite, TS, React, PowerSync and Supabase project to get you started quickly with building offline-first applications with PowerSync and Supabase.

## Requirements

| Tool/Service     | Version / Info             | Notes                                                  |
|------------------|----------------------------|--------------------------------------------------------|
| Node.js (via nvm)| `v20.19.0`                 | Ensure you run `nvm use` to match the project version |
| PowerSync        | Active account required    | [Sign up here](https://www.powersync.com)             |
| Supabase         | Active project/account     | [Get started](https://supabase.com)                   |


## Getting Started

You have 4 options to get started with this template.
We recommend using the first option for a quick start.

1. Generate a repository from this [template](https://github.com/powersync-community/vite-react-ts-powersync-supabase/generate)
2. Use [degit](https://github.com/Rich-Harris/degit) to scaffold the project:

   ```bash
   npx degit powersync-community/vite-react-ts-powersync-supabase
   ```

> **Note**: `degit` is a tool that downloads the latest version of a repository without the git history, giving you a clean starting point. Add a second argument to specify your project name (e.g., my-app).

3. Clone the repository directly and install dependencies:

   ```bash
   git clone https://github.com/powersync-community/vite-react-ts-powersync-supabase.git
   ```

4. Start the project using [bolt.new](https://bolt.new):

- Open this [link](https://bolt.new/github.com/powersync-community/vite-react-ts-powersync-supabase/tree/main) to load the project.
  - You will see a configuration error in the preview window because the `.env` file has not yet been defined.
- Create a new `.env` file and populate it with the appropriate Supabase and PowerSync credentials, as specified in the `.env.local.template` file included in this repository.
- Save the file — the app should launch automatically.

## Usage

After cloning the repository, navigate to the project directory and install the dependencies:

   ```bash
   cd vite-react-ts-powersync-supabase
   npm install
   npm run dev
   ```

## Setup Backend

### 1. Setup Supabase
Follow these steps to set up your backend with Supabase and PowerSync (Or you can follow the [guide](https://docs.powersync.com/integration-guides/supabase-+-powersync)).

#### Setup using the Supabase Dashboard
1. [Create a new project on the Supabase dashboard](https://supabase.com/dashboard/projects).
2. Go to the Supabase SQL Editor for your new project and execute the SQL statements in [`database.pgsql`](database.pgsql) to create the database schema, database functions, and publication needed for PowerSync.
3. Enable "anonymous sign-ins" for the project [here](https://supabase.com/dashboard/project/_/auth/providers) (demo specific)

#### Setup using the Supabase CLI (optional)
If you prefer using the Supabase CLI, you can set up your project as follows:
1. Login to your Supabase Account `npx supabase login`
2. Initialize your project `npx supabase init`
3. Enable "anonymous sign-ins" for the project [here](https://supabase.com/dashboard/project/_/auth/providers)
4. Copy your project ID from the Supabase dashboard [here](https://supabase.com/dashboard/project/_/settings/general)
5. Link your local project `npx supabase link --project-ref <project-id>`
6. Create your first migration with `npx supabase migration new create_powersync_tables` and then copy the contents of [`database.pgsql`](database.pgsql) into the newly created migration file in the `supabase/migrations` directory.
7. Push your tables to the cloud db
   ```shell
   npx supabase db push
   ```

### 2. Create PowerSync Instance and Connect to Supabase

You can set up your PowerSync instance using either the Dashboard or CLI approach:

#### Option 1: Using PowerSync [CLI](https://docs.powersync.com/usage/tools/cli)

> This PowerSync CLI only works with **PowerSync Cloud instances.**		
> The CLI currently does not support **self-hosted PowerSync instances.**

If you don't have a PowerSync account yet, [sign up here](https://accounts.journeyapps.com/portal/powersync-signup).

1. **Get your Personal Access Token:**
   - Go to the [PowerSync dashboard](https://powersync.journeyapps.com/)
   - Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac)
   - Search for "Create Personal Access Token"
   - Give it "owner" policy and a descriptive label
   - Copy the generated token

2. **Initialize the CLI and authenticate:**
   ```bash
   npx powersync init
   ```
Paste your Personal Access Token when prompted.

3. **Create a new PowerSync instance:**
   ```bash
   npx powersync instance create
   ```
Follow the prompts to configure:
- Instance name (e.g., "supabase-staging")
- Region (e.g., "EU")
- Database connection details from your Supabase project (use the **direct connection**, not pooling)
- When asked about Supabase auth, answer:
   - `? Are you using Supabase auth? Yes`
   - `? Do you want to add audiences? No`

4. **Deploy sync rules:**
   ```bash
   npx powersync instance sync-rules deploy -f sync-rules.yaml
   ```

> After deploying sync rules via CLI, the changes might not be reflected in the dashboard. If you want to see them in the dashboard, simply copy the contents of your `sync-rules.yaml` file and paste them into the dashboard's sync-rules editor, then redeploy.

#### Option 2: Using PowerSync Dashboard

If you prefer using the web interface:

1. In the [PowerSync dashboard](https://powersync.journeyapps.com/), create a new PowerSync instance:
   - Right-click on 'PowerSync Project' in the project tree on the left and click "Create new instance"
   - Pick a name for the instance e.g. "Yjs Demo Test" and proceed.

2. In the "Edit Instance" dialog that follows, click on the "Connections" tab:
   - Click on the "+" button to create a new database connection.
   - Input the credentials from the project you created in Supabase. In the Supabase dashboard, under your project you can go to "Project Settings" and then "Database" and choose "URI" under "Connection string", **untick the "Use connection pooling" option** to use the direct connection, and then copy & paste the connection string into the PowerSync dashboard "URI" field, and then enter your database password at the "Password" field.
   - Click the "Test connection" button and you should see "Connection success!"

3. Click on the "Credentials" tab of the "Edit Instance" dialog:
   - Tick the "Use Supabase Auth" checkbox and configure the JWT secret.
   - Click "Save" to save all the changes to your PowerSync instance. The instance will now be deployed — this may take a minute or two.

### 3. Deploy Sync Rules

#### Option 1: Using CLI (if you used CLI setup above)
The sync rules are already deployed if you followed the CLI setup steps above.

#### Option 2: Using Dashboard
1. Open the [`sync-rules.yaml`](sync-rules.yaml) in this repo and copy the contents.
2. In the [PowerSync dashboard](https://powersync.journeyapps.com/), paste that into the 'sync-rules.yaml' editor panel.
3. Click the "Deploy sync rules" button and select your PowerSync instance from the drop-down list.