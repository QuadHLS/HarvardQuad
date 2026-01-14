
  # New Quad iOS

  This is a code bundle for New Quad iOS. The original project is available at https://www.figma.com/design/2PmbRIj2F9KaIY28OukqE2/New-Quad-iOS.

  ## Setup

  ### Installation

  Run `npm i` to install the dependencies.

  ### Environment Variables

  Create a `.env` file in the root directory with the following variables:

  ```
  VITE_SUPABASE_URL=your_supabase_project_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

  Get these values from your Supabase project settings: https://app.supabase.com/project/_/settings/api

  ### Running the code

  Run `npm run dev` to start the development server.

  ## Deployment

  ### Vercel

  This project is configured for Vercel deployment. The `vercel.json` file contains the necessary configuration.

  To deploy:
  1. Connect your GitHub repository to Vercel
  2. Add environment variables in Vercel dashboard (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
  3. Deploy automatically on push to main branch

  ### GitHub

  The repository is connected to: https://github.com/QuadHLS/TheQuad.git

  ### Supabase

  Supabase client is configured in `src/lib/supabase.ts`. Import and use it in your components:

  ```typescript
  import { supabase } from '@/lib/supabase';
  ```
  