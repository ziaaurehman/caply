# Caply Next.js

Caply Next.js is a web application built using Next.js and Tailwind CSS. This project serves as a template for creating modern web applications with a focus on performance and developer experience.

## Features

- **Next.js**: A powerful React framework for building server-rendered applications.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **TypeScript**: Strongly typed programming language that builds on JavaScript.
- **Zustand**: A small, fast state-management solution for React.
- **Lucide Icons**: A collection of beautiful icons for your application.
- **NextAuth.js**: Authentication for Next.js applications.
- **Supabase**: Open source Firebase alternative with authentication and database.

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/caply-nextjs.git
   cd caply-nextjs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase**:
   - Create a new project on [Supabase](https://supabase.com/)
   - Enable Email/Password authentication and Google OAuth
   - Get your project URL and anon key from the API settings

5. **Set up Google OAuth**:
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
   - Set up OAuth consent screen
   - Create OAuth credentials (Web application)
   - Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Get your client ID and client secret

6. **Run the development server**:
   ```bash
   npm run dev
   ```

7. **Open your browser**:
   Navigate to `http://localhost:3000` to see your application in action.

## Authentication

This project uses NextAuth.js with Supabase as the authentication provider. It supports:

- Email/password authentication
- Google OAuth login
- Session management
- Protected routes

## Project Structure

```
caply-nextjs
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components
│   │   ├── ui
│   │   └── shared
│   ├── lib
│   │   └── utils.ts
│   └── store
│       └── index.ts
├── public
│   └── favicon.svg
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
├── .eslintrc.json
└── README.md
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.