# Invoice Processing System - Execution Plan

## Overview
This document outlines the implementation plan for building an AI-powered invoice processing system using Next.js, SQLite, and AI agents. The system will allow company admins to upload vendor invoices and automatically extract, validate, and manage invoice information.

## Project Goals
- Expand the existing code base to support a conversational interface for invoice processing
- Automatically extract key invoice information using AI
- Prevent duplicate invoice uploads
- Provide a user-friendly interface for invoice management
- Track and optimize AI token usage

## Implementation Phases

### Phase 1: Project Setup and Database Design (1-2 hours)
1. **Review and understand the starter codebase**
   - Analyze existing components and structure
   - Identify areas for enhancement
   - Document current functionality

2. **Set up database schema**
   ```sql
   -- Invoices table
   CREATE TABLE invoices (
     id INTEGER PRIMARY KEY,
     customer_name TEXT,
     vendor_name TEXT,
     invoice_number TEXT,
     invoice_date DATE,
     due_date DATE,
     amount DECIMAL,
     status TEXT CHECK(status IN ('UPLOADED', 'ERROR', 'PROCESSED', 'PAID')),
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );

   -- Line items table
   CREATE TABLE line_items (
     id INTEGER PRIMARY KEY,
     invoice_id INTEGER,
     description TEXT,
     quantity INTEGER,
     unit_price DECIMAL,
     total DECIMAL,
     FOREIGN KEY (invoice_id) REFERENCES invoices(id)
   );

   -- Token usage tracking table
   CREATE TABLE token_usage (
     id INTEGER PRIMARY KEY,
     invoice_id INTEGER,
     input_tokens INTEGER,
     output_tokens INTEGER,
     cost DECIMAL,
     FOREIGN KEY (invoice_id) REFERENCES invoices(id)
   );
   ```

3. **Implement database migrations**
   - Set up Drizzle ORM
   - Create migration scripts
   - Add seed data for testing

4. **Environment Configuration**
   - Set up `.env` file structure
   - Configure API keys for AI services
   - Add environment validation
     - Implement Zod schema for type-safe environment variables
     - Validate required API keys and credentials
     - Check database connection strings
     - Verify file storage configuration
     - Add runtime checks for critical environment variables
     - Create helper functions for accessing validated env vars

5. **Clean Up**
   - Remove the AI writing suggestion functionality (likely involving components in `lib/editor`, `lib/ai/tools/request-suggestions.ts`, and related UI elements) as it's not relevant for invoice processing.

### Phase 2: Core Infrastructure (2-3 hours)
1. **File Upload & Preview System**
   - Implement application-wide drag-and-drop functionality.
   - Update file validation rules (Client-side: PDF/PNG/JPG, <= 10MB, single file).
   - Enhance visual feedback for drag-over state.
   - Ensure proper error handling and user notification (via toast) for validation failures.
   - Enhance attachment preview:
     - Add a button to remove the selected attachment before sending.
     - Implement modal dialog for previewing attachments.
     - Display image previews directly in the modal.
     - Render PDF previews inline within the modal using `react-pdf`.
     - Provide PDF thumbnail rendering in the initial preview area.
   - Address backend API validation to accept PDF, PNG, JPG files up to 10MB.

2. **AI Integration**
   - Configure AI Model:
     - Use Claude 3.5 Sonnet model for invoice processing
     - Set up proper system prompts and context
     - Configure response streaming

   - Implement Tool-Based Invoice Processing:
     - Utilize Vercel AI SDK's tool calling feature to define a sequence of operations.
     - Define distinct tools: `validateInvoice`, `extractInvoiceData`, `saveInvoiceToDatabase`, `summarizeSavedInvoiceData`.
     - Implement streaming text updates to the chat UI, informing the user which tool is currently running (e.g., "Validating invoice...", "Extracting data...").
     - Document validation within `validateInvoice` tool to ensure file is an invoice and handle non-invoice documents.
     - Handle information extraction (with confidence scores if available) within `extractInvoiceData`.
     - Manage database saving within `saveInvoiceToDatabase`.
     - Provide a summary via `summarizeSavedInvoiceData`.
     - Ensure robust error handling within each tool and provide clear feedback to the user.

   - Response Processing:
     - Parse structured JSON responses from `extractInvoiceData`.
     - Validate extracted data
     - Database duplicate checking after extraction
     - Store processed invoice data
     - Handle validation errors and low confidence scores

   - Context Management:
     - Maintain conversation context for multi-step processing
     - Track processing state (validating, extracting, storing) via tool execution status
     - Handle error recovery and retries within the tool sequence
     - Support follow-up questions about processed invoices

   - Error Handling:
     - Invalid document type detection
     - Missing required field identification
     - Data format validation
     - Clear error messages for users
     - Suggestions for error resolution

   - Performance Optimization:
     - Efficient prompt design
     - Response streaming configuration
     - Token usage optimization
     - Processing speed improvements

### Phase 3: Invoice Processing Logic (2-3 hours)
1. **Validation System (Implemented via `validateInvoice` tool)**
   - Implement rules within the `validateInvoice` tool to check if the document is likely an invoice.
   - Prevent processing of non-invoice documents (e.g., receipts, statements) as specified in requirements.
   - Provide clear feedback to the user if validation fails.
   - Incorporate initial duplicate checking logic (e.g., based on filename or hash before full processing).

2. **AI Extraction Pipeline (Implemented via `extractInvoiceData` tool)**
   - Design prompts for Claude 3.5 Sonnet specifically for extracting required fields (Customer, Vendor, Number, Dates, Amount, Line Items).
   - Implement robust parsing of the AI's structured response.
   - Add validation checks for extracted data formats and consistency.
   - Handle potential errors during AI interaction or data parsing.

3. **Database Operations (Implemented via `saveInvoiceToDatabase` tool)**
   - Implement logic to save the extracted and validated invoice data (header and line items) to the respective tables.
   - Perform final duplicate check (Vendor, Invoice Number, Amount) before saving.
   - Use database transactions to ensure atomicity.
   - Update invoice status to 'processed' upon successful save.

### Phase 4: Invoice Management Interface (2-3 hours)
1. **Table Component**
   - Sortable columns
   - Filtering system
   - Inline editing
   - Pagination

2. **Details View**
   - Comprehensive invoice display
   - Line items table
   - Edit functionality
   - History tracking

3. **Token Usage Tracking**
   - Token counting system
   - Cost calculation
   - Usage statistics
   - Optimization suggestions

4. **Duplicate Detection**
   - Implement agentic behavior for duplicate detection as a bonus feature.
   - During the `saveInvoiceToDatabase` tool execution (or potentially earlier in `validateInvoice`), check for existing invoices with the same Vendor Name, Invoice Number, and Amount.
   - If a duplicate is detected, prevent saving the new record and send a helpful message back to the user via the chat interface explaining the duplication.
   - (Optional: Consider fuzzy matching or confidence scoring for more advanced detection if time permits).

### Phase 5: AI Agent Enhancement (2-3 hours)
1. **Prompt Caching**
   - Cache implementation
   - Token optimization
   - Statistics tracking
   - Cache invalidation

2. **Advanced Validation**
   - Business rules
   - Data consistency
   - Feedback system
   - Error recovery

### Phase 6: Testing and Polish (1-2 hours)
1. **Testing Suite**
   - File upload testing
   - AI extraction validation
   - Duplicate detection testing
   - Edge case handling

2. **Performance Optimization**
   - Query optimization
   - Response time improvement
   - UI performance
   - Resource usage

3. **Final Polish**
   - Loading states
   - Error handling
   - Success notifications
   - User feedback

## Technical Stack

### Frontend
- **Framework**: Next.js 14+
- **UI Library**: Shadcn
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **File Processing**: PDF.js

### Backend
- **Framework**: Next.js API routes
- **Database**: SQLite with Drizzle ORM
- **AI Integration**: Vercel AI SDK
- **AI Model for Invoice Processing**: Claude 3.5 Sonnet
- **AI Agent Framework**: Vercel AI SDK

## Timeline
- **Core Development**: 10-13 hours
- **Buffer Time**: 2-3 hours
- **Total Timeline**: 2-3 days

## Success Metrics
1. **Functionality**
   - Successful invoice processing
   - Accurate data extraction
   - Effective duplicate detection
   - Smooth user experience

2. **Performance**
   - Response time < 2s
   - 99% uptime
   - Efficient resource usage

3. **User Experience**
   - Intuitive interface
   - Clear error messages
   - Responsive design
   - Helpful AI interactions

## Development Guidelines
- Prioritize core functionality
- Implement bonus features if time permits
- Focus on user experience
- Document API usage and costs
- Test with sample invoices
- Follow TypeScript best practices
- Maintain clean code structure

## Risk Mitigation
1. **Technical Risks**
   - AI API availability
   - File processing issues
   - Database performance

2. **Mitigation Strategies**
   - Fallback AI providers
   - Robust error handling
   - Performance monitoring
   - Regular backups

## Future Enhancements
1.  **Optimize File Handling:** Modify the `/api/files/upload` endpoint to save uploaded files directly to the local filesystem (e.g., in a dedicated `/uploads` directory) or cloud storage (e.g., S3, GCS, Azure Blob Storage) instead of returning a base64 data URL. This avoids significant size increases and memory issues associated with data URLs. Create a corresponding tool (e.g., `readFileFromPath`) that the AI agent can use to retrieve the file content from its stored path when needed for processing.

## Next Steps
1. Review and approve execution plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule regular progress reviews 