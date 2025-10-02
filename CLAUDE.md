# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Scripts
- `npm run dev` - Start development server with hot reload using ts-node-dev
- `npm run build` - Compile TypeScript to JavaScript in dist/ directory
- `npm start` - Run compiled application from dist/app.js
- `npm test` - Run tests using Jest
- `npm run lint` - Run ESLint on TypeScript files in src/

### Knowledge Base Management
- `npm run init-knowledge` - Initialize knowledge base with ROI Takaful data
- `npm run setup` - Complete setup: build + initialize knowledge base

### Additional Test Commands (if available)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode

## Architecture Overview

This is ISSA, a WhatsApp conversational AI bot for ROI Takaful (Islamic insurance) using Express.js and TypeScript with a modular, dependency injection-based architecture focused on conversational AI and user experience.

### Core Architecture Patterns
- **Dependency Injection Container**: Located in `src/core/di/Container.ts` with service tokens (TOKENS) in `src/core/di/Container.ts`
- **Service Layer Pattern**: All external integrations (WhatsApp, AI, Database) are abstracted through interfaces in `src/core/interfaces/`
- **Conversational State Management**: Users have conversation states (greeting, name_collection, active, idle) managed through ConversationService
- **AI Provider Abstraction**: Supports both OpenAI and DeepSeek with configurable providers
- **Configuration Management**: Centralized in `src/core/config/ServiceConfig.ts` with environment variables loaded via `src/config/index.ts`

### Key Directories
- `src/core/` - Core framework with DI container, interfaces, error handling, and HTTP client
- `src/services/` - Service implementations (ConversationService, AIService, WhatsAppService, DatabaseService, KnowledgeService)
- `src/controllers/` - Business logic controllers (conversational flow management)
- `src/middlewares/` - Express middlewares (Rate limiting, Validation)
- `src/webhooks/` - WhatsApp webhook handlers
- `src/routes/` - Express route definitions
- `src/types/` - TypeScript type definitions for all data models
- `src/scripts/` - Initialization scripts (knowledge base setup)
- `src/utils/` - Utility functions and logger configuration

### Application Entry Point
- Main application class in `src/app.ts` handles Express setup, middleware initialization, and graceful shutdown
- Uses dependency injection to resolve services like `IWhatsAppService`
- Supports both SQLite database and WhatsApp Business API integration

### Configuration
- Environment variables defined in `.env` (see `.env.example` for template)
- Required services: WhatsApp Business API, AI provider (OpenAI/DeepSeek), SQLite database
- Configurable AI provider via `AI_PROVIDER` environment variable
- Rate limiting configured for different endpoints (general, webhook, admin)

### Key Services
- **ConversationService**: Core conversation management, user state tracking, and AI integration orchestration
- **AIService**: Multi-provider AI integration (OpenAI/DeepSeek) with conversation context
- **WhatsAppService**: Handles WhatsApp Business API integration with typing indicators
- **DatabaseService**: SQLite database operations for users, conversations, and knowledge base
- **KnowledgeService**: ROI Takaful knowledge base management and context retrieval
- **InitializationService**: Bootstrap all services and dependencies on startup

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

### Conversation Flow Architecture
- **User States**: greeting → name_collection → active/idle
- **Message Processing**: ConversationService handles all incoming messages with state-aware responses
- **AI Integration**: Conversation history provided to AI with ROI Takaful context
- **Typing Simulation**: Realistic typing indicators during AI processing
- **Name Collection**: Automatic name extraction and storage for personalized conversations
- **Knowledge Base**: Dynamic context injection based on user queries

### Data Models
- **User**: phone number, name, conversation state, interaction history
- **ConversationMessage**: user/bot messages with timestamps and AI provider info
- **KnowledgeBase**: categorized content with keywords for context matching
- **AIResponse**: structured responses with success/error handling and token usage

### Security Features
- Webhook signature validation for WhatsApp
- Helmet middleware for security headers
- CORS configuration
- Request body size limits (10mb)
- Rate limiting per user for conversation endpoints
