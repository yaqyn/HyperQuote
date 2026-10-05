# HyperQuote Email Assets

Source PNG assets used by the Supabase authentication email templates.

Expected hosted layout:

- `logos/lyon-black-v2.png`
- `email/auth-icons/*.png`
- `email/footer-icons/*.png`

Email templates require publicly reachable HTTPS PNGs. Avoid SVG, Google Fonts
icons, and `data:` images because email-client support varies.

The historical provider location is recorded in ignored local operator notes.
Before activating email, verify the image URLs in `supabase/templates/` and their
hosting configuration. Creating a new asset-hosting resource requires an
explicit architecture decision.
