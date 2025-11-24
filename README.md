# Empleo Safari 

A modern employment support platform built with Next.js and powered by Cloudflare's edge computing infrastructure.

## Architecture Overview

This project implements a **serverless-first architecture** using Cloudflare's edge computing stack:

- **Frontend**: Next.js 15 with App Router and Tailwind CSS
- **Backend**: Cloudflare Workers for API logic
- **Database**: D1 (SQLite at the edge) for relational data
- **Storage**: R2 for file storage (resumes, images)
- **Cache**: KV for sessions and configuration
- **CDN**: Cloudflare Pages for global distribution

### Why Cloudflare Edge Stack?

- **Global Performance**: Sub-100ms response times worldwide
- **Zero Cold Starts**: Workers run at the edge, no container spin-up time
- **Cost Effective**: Pay only for what you use, no server maintenance
- **Built-in Security**: DDoS protection, WAF, and bot management included
- **Simplified Operations**: No infrastructure to manage

## Features

- 🔐 **JWT Authentication** - Secure user authentication with Workers
- 👥 **User Management** - Profile management and role-based access
- 💼 **Job Management** - Post, search, and apply for jobs
- 📁 **File Storage** - Resume and document upload with R2
- 🌐 **Global Edge** - Fast response times worldwide
- 📱 **Responsive Design** - Mobile-first UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Cloudflare credentials
   ```

3. **Create Cloudflare resources**:
   ```bash
   # Create D1 database
   npm run db:create
   
   # Create KV namespaces
   wrangler kv:namespace create "SESSIONS"
   wrangler kv:namespace create "CONFIG"
   
   # Create R2 bucket
   wrangler r2 bucket create apoyoalempleo-storage
   ```

4. **Update wrangler.toml** with your resource IDs

5. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

### Development

```bash
# Start Next.js development server
npm run dev

# Build and preview with Cloudflare
npm run preview
```

### Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run build
npm run wrangler:deploy
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Home page
├── functions/               # Cloudflare Workers
│   ├── _worker.js          # Main Worker entry point
│   ├── api/                # API route handlers
│   │   ├── auth.js         # Authentication endpoints
│   │   └── users.js        # User management endpoints
│   └── utils/              # Utility functions
│       ├── cors.js         # CORS handling
│       ├── jwt.js          # JWT authentication
│       ├── database.js     # D1 database operations
│       └── storage.js      # R2 file operations
├── migrations/             # Database migrations
│   └── init.sql           # Initial schema
├── wrangler.toml          # Cloudflare configuration
└── next.config.js         # Next.js configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - List all users (admin only)

## Database Schema

The platform uses a comprehensive schema with the following main entities:

- **Users** - User accounts and profiles
- **Companies** - Employer profiles
- **Job Posts** - Job listings
- **Applications** - Job applications
- **Sessions** - User sessions
- **Notifications** - User notifications

See `migrations/init.sql` for the complete schema.

## Environment Variables

Key environment variables (see `env.example`):

- `JWT_SECRET` - Secret for JWT token signing
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `DATABASE_ID` - D1 database ID
- `SESSIONS_KV_ID` - Sessions KV namespace ID
- `R2_BUCKET_NAME` - R2 bucket name

## Security Features

- **JWT Authentication** - Secure stateless authentication
- **Password Hashing** - Secure password storage
- **CORS Protection** - Proper cross-origin resource sharing
- **Input Validation** - Server-side request validation
- **SQL Injection Prevention** - Parameterized queries
- **Rate Limiting** - Built-in Cloudflare protection

## Performance Optimizations

- **Edge Computing** - Logic runs at 280+ locations worldwide
- **Static Generation** - Pre-built pages for faster loading
- **Image Optimization** - Cloudflare Image Resizing
- **Caching Strategy** - Multi-layer caching with KV and Cache API
- **CDN Distribution** - Global content delivery

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions and support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Next.js and Cloudflare Edge Computing