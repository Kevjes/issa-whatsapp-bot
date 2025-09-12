# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Scripts
- `npm run dev` - Start development server with hot reload using ts-node-dev
- `npm run build` - Compile TypeScript to JavaScript in dist/ directory
- `npm start` - Run compiled application from dist/app.js
- `npm test` - Run tests using Jest
- `npm run lint` - Run ESLint on TypeScript files in src/

### Additional Test Commands (if available)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode

## Architecture Overview

This is a WhatsApp Banking Bot using Express.js and TypeScript with a modular, dependency injection-based architecture.

### Core Architecture Patterns
- **Dependency Injection Container**: Located in `src/core/di/Container.ts` with service tokens in `src/core/index.ts`
- **Service Layer Pattern**: All external integrations (WhatsApp, Database) are abstracted through interfaces in `src/core/interfaces/`
- **Configuration Management**: Centralized in `src/core/config/ServiceConfig.ts` with environment variables loaded via `src/config/index.ts`

### Key Directories
- `src/core/` - Core framework with DI container, interfaces, error handling, and HTTP client
- `src/services/` - Service implementations (WhatsApp, Database, Menu, Log Management)
- `src/controllers/` - Business logic controllers (Message, Menu)
- `src/middlewares/` - Express middlewares (Rate limiting, Validation)
- `src/webhooks/` - WhatsApp webhook handlers
- `src/routes/` - Express route definitions
- `src/templates/` - Message templates
- `src/utils/` - Utility functions and logger configuration

### Application Entry Point
- Main application class in `src/app.ts` handles Express setup, middleware initialization, and graceful shutdown
- Uses dependency injection to resolve services like `IWhatsAppService`
- Supports both SQLite database and WhatsApp Business API integration

### Configuration
- Environment variables defined in `.env` (see `.env.example` for template)
- Required services: WhatsApp Business API, SQLite database
- Rate limiting configured for different endpoints (general, webhook, admin)

### Key Services
- **WhatsAppService**: Handles WhatsApp Business API integration
- **DatabaseService**: SQLite database operations
- **MenuService**: Interactive menu system for WhatsApp
- **LogManagementService**: Application logging and monitoring

### Testing
- Jest configuration with TypeScript support
- Tests located in `tests/` directory (referenced in jest.config.js)
- Setup file: `tests/setup.ts`
- Coverage collection excludes `src/app.ts` entry point

## Development Notes

### Rate Limiting
Multiple rate limiting strategies implemented:
- General: 100 requests per 15 minutes
- Webhook: 50 messages per minute per user  
- Admin: 20 requests per 15 minutes

### Database
- SQLite database stored in `data/` directory
- Database path configurable via `DB_PATH` environment variable

### Logging
- Winston logger with file rotation
- Logs stored in `logs/` directory
- Multiple log levels and file retention policies configured

### Security Features
- Webhook signature validation for WhatsApp
- Helmet middleware for security headers
- CORS configuration
- Request body size limits (10mb)
- PIN-based authentication system